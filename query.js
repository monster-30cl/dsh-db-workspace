/** Database operations invoked by the private worker after read checks or host approval. */
import { createClient } from './drivers.js'
import { redactSecrets } from './probe.js'

import { inspectSql, guardRead } from './sql-policy.js'

export const guardQuery = guardRead

export function schemaStatement(driver, oracleLike, table, schema) {
  for (const value of [table, schema]) if (value !== undefined && (typeof value !== 'string' || !value.trim() || value.length > 128)) throw new Error('表名和 schema 必须为非空字符串，最长 128 字符')
  if (oracleLike || driver === 'oracle') {
    const owner = schema?.toUpperCase() ?? null
    const first = driver === 'oceanbase' ? '?' : ':1'
    const second = driver === 'oceanbase' ? '?' : ':2'
    return table
      ? { sql: `SELECT column_name, data_type, nullable, data_default, column_id FROM all_tab_columns WHERE owner = COALESCE(${first}, USER) AND table_name = ${second} ORDER BY column_id`, params: [owner, table.toUpperCase()] }
      : { sql: `SELECT table_name FROM all_tables WHERE owner = COALESCE(${first}, USER) ORDER BY table_name`, params: [owner] }
  }
  if (driver === 'mysql' || driver === 'oceanbase') {
    return table
      ? { sql: 'SELECT column_name, data_type, is_nullable, column_default, column_key, column_comment, ordinal_position FROM information_schema.columns WHERE table_schema = COALESCE(?, DATABASE()) AND table_name = ? ORDER BY ordinal_position', params: [schema ?? null, table] }
      : { sql: 'SELECT table_name, table_comment FROM information_schema.tables WHERE table_schema = COALESCE(?, DATABASE()) ORDER BY table_name', params: [schema ?? null] }
  }
  return table
    ? { sql: 'SELECT column_name, data_type, is_nullable, column_default, ordinal_position FROM information_schema.columns WHERE table_schema = COALESCE($1, current_schema()) AND table_name = $2 ORDER BY ordinal_position', params: [schema ?? null, table] }
    : { sql: 'SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = COALESCE($1, current_schema()) ORDER BY table_name', params: [schema ?? null] }
}

/** Deadline covers connect, query, rollback and close. Late connections still close. */
export async function readDatabase(entry, options, request, signal) {
  const plan = request.kind === 'execute' ? inspectSql(request.sql) : undefined
  const sql = plan?.sql ?? (request.kind === 'query' ? guardQuery(request.sql) : undefined)
  const limit = request.limit ?? 100
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) throw new Error('limit 必须为 1 到 1000 的整数')
  if (request.kind === 'schema') schemaStatement(entry.driver, false, request.table, request.schema)
  if (signal?.aborted) throw new Error('数据库操作已取消')
  let timer, cancel, stopped = false
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => { stopped = true; reject(new Error('数据库只读操作超时')) }, options.queryTimeoutMs)
    cancel = () => { stopped = true; reject(new Error('数据库操作已取消')) }
    signal?.addEventListener('abort', cancel, { once: true })
  })
  const operation = Promise.resolve().then(async () => {
    if (stopped) throw new Error('数据库操作已取消')
    const api = createClient(entry, options)
    const client = await api.connect()
    let transaction = false
    try {
      if (stopped) throw new Error('数据库操作已取消')
      const readOnly = request.kind !== 'execute' || plan.category === 'read'
      const dml = !readOnly && ['INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'REPLACE', 'WITH'].includes(plan.head)
      const oracle = api.isOracleLike
      const begin = api.driver === 'mysql' || (api.driver === 'oceanbase' && !api.isOracleLike)
        ? 'START TRANSACTION READ ONLY' : api.isOracleLike ? 'SET TRANSACTION READ ONLY' : 'BEGIN READ ONLY'
      if (readOnly) { await client.query(begin); transaction = true }
      else if (dml) { if (!oracle) await client.query(api.driver === 'mysql' || api.driver === 'oceanbase' ? 'START TRANSACTION' : 'BEGIN'); transaction = true }
      if (stopped) throw new Error('数据库操作已取消')
      const statement = request.kind === 'schema' ? schemaStatement(api.driver, api.isOracleLike, request.table, request.schema) : { sql }
      const result = statement.params ? await client.query(statement.sql, statement.params) : await client.query(statement.sql)
      const rows = Array.isArray(result.rows) ? result.rows : []
      if (stopped) throw new Error('数据库操作已取消；写操作结果可能不确定，禁止自动重试')
      if (dml) { await client.query('COMMIT'); transaction = false }
      const output = JSON.parse(JSON.stringify(rows.slice(0, limit), (_key, value) => typeof value === 'bigint' ? value.toString() : value))
      return { driver: api.driver, ...(request.kind === 'execute' && Number.isSafeInteger(result.rowCount ?? result.rowsAffected) ? { affectedRows: result.rowCount ?? result.rowsAffected } : {}), rows: output, returnedRows: Math.min(rows.length, limit), truncated: rows.length > limit }
    } finally {
      try { if (transaction) await client.query('ROLLBACK') } finally { await client.end() }
    }
  })
  try { return await Promise.race([operation, deadline]) }
  catch (cause) { throw new Error(redactSecrets(cause instanceof Error ? cause.message.split('\n')[0] : String(cause), entry)) }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel) }
}
