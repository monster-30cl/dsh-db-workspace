/** Conservative lexer: inspect SQL words, never substrings inside names or literals. */
export function inspectSql(sql) {
  if (typeof sql !== 'string' || !sql.trim() || sql.length > 100_000) throw new Error('BLOCKED: SQL 必须为 1 到 100000 字符的字符串')
  const words = []
  let i = 0, ended = false, depth = 0
  while (i < sql.length) {
    const ch = sql[i], next = sql[i + 1]
    if (/\s/u.test(ch)) { i++; continue }
    if (ch === '-' && next === '-') {
      if (sql[i + 2] !== undefined && !/\s/u.test(sql[i + 2])) throw new Error('BLOCKED: 不支持跨数据库存在歧义的行注释，请在 -- 后添加空格')
      const end = sql.indexOf('\n', i); i = end < 0 ? sql.length : end + 1; continue
    }
    if (ch === '/' && next === '*') {
      if (sql[i + 2] === '!') throw new Error('BLOCKED: 不支持可执行注释')
      let nesting = 1; i += 2
      while (i < sql.length && nesting) {
        if (sql.slice(i, i + 2) === '/*') throw new Error('BLOCKED: 不支持跨数据库存在歧义的嵌套注释')
        else if (sql.slice(i, i + 2) === '*/') { nesting--; i += 2 }
        else i++
      }
      if (nesting) throw new Error('BLOCKED: 注释未闭合')
      continue
    }
    if (ended) throw new Error('BLOCKED: 每次仅允许一条 SQL，禁止多语句批处理')
    if (ch === ';') { if (depth) throw new Error('BLOCKED: 非法语句分隔'); ended = true; i++; continue }
    if (ch === '\\' || ch === '#') throw new Error('BLOCKED: 不支持客户端命令或歧义转义/注释语法')
    if (ch === "'" || ch === '"' || ch === '`' || ch === '[') {
      const close = ch === '[' ? ']' : ch; i++
      let closed = false
      while (i < sql.length) {
        if (sql[i] === '\\') throw new Error('BLOCKED: 请使用标准 SQL 双引号转义，禁止歧义反斜杠转义')
        if (sql[i] === close) { if (sql[i + 1] === close) { i += 2; continue } i++; closed = true; break }
        i++
      }
      if (!closed) throw new Error('BLOCKED: SQL 引号未闭合')
      continue
    }
    if (ch === '$') {
      const tag = /^(\$[A-Za-z_][A-Za-z_0-9]*\$|\$\$)/u.exec(sql.slice(i))?.[0]
      if (tag) { const end = sql.indexOf(tag, i + tag.length); if (end < 0) throw new Error('BLOCKED: SQL 字符串未闭合'); i = end + tag.length; continue }
    }
    if (ch === '(') depth++
    if (ch === ')' && --depth < 0) throw new Error('BLOCKED: SQL 括号不匹配')
    if (/[\p{L}_]/u.test(ch)) {
      const word = /^[\p{L}\p{N}_$]+/u.exec(sql.slice(i))[0]; words.push(word.toUpperCase()); i += word.length
    } else i++
  }
  if (depth) throw new Error('BLOCKED: SQL 括号不匹配')
  const head = words[0]
  const writes = new Set(['INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'REPLACE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'COMMENT', 'GRANT', 'REVOKE', 'INTO'])
  const maintenance = new Set(['EXPLAIN', 'ANALYZE', 'ANALYSE', 'VACUUM', 'OPTIMIZE', 'REINDEX', 'DBCC'])
  if (!new Set(['SELECT', 'SHOW', 'TABLE', 'VALUES', 'WITH', ...writes, ...maintenance]).has(head)) throw new Error('BLOCKED: 不支持该语句类型或过程调用')
  if (words.some(w => ['CALL', 'DO', 'EXEC', 'EXECUTE', 'COPY', 'LOAD', 'DBLINK_EXEC', 'LO_IMPORT', 'LO_EXPORT'].includes(w))) throw new Error('BLOCKED: 不支持过程调用、外部执行或文件导入导出')
  const impact = head !== 'SHOW' && words.some(w => maintenance.has(w) || ['PG_SLEEP', 'SLEEP', 'GET_LOCK', 'RELEASE_LOCK', 'PG_ADVISORY_LOCK', 'PG_ADVISORY_XACT_LOCK', 'DBMS_STATS', 'DBMS_LOCK'].includes(w))
  const write = head !== 'SHOW' && words.some(w => writes.has(w))
  return { sql: sql.trim(), category: write ? 'write' : impact ? 'maintenance' : 'read', impact, head }
}

export function guardRead(sql) {
  const plan = inspectSql(sql)
  if (plan.category !== 'read') throw new Error('APPROVAL_REQUIRED: 此语句需要用户逐次批准，请使用 db_execute；禁止绕过批准')
  return plan.sql
}
