/** Driver dispatch tests over stubbed driver packages. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createClient, parseMysqlDsn, parseOracleDsn, rewritePostgresDsn, wrapMysqlLike } from '../drivers.js'
import { makeDriverDirectory } from './helpers.mjs'

const driverDirectory = makeDriverDirectory()
const limits = { driverDirectory, connectTimeoutMs: 5000 }

test('rewrites JDBC and Kingbase DSN spellings', () => {
  assert.equal(rewritePostgresDsn('jdbc:kingbase8://h:54321/d'), 'postgresql://h:54321/d')
  assert.equal(rewritePostgresDsn('kingbase://h/d'), 'postgresql://h/d')
  assert.equal(rewritePostgresDsn('postgresql://h/d'), 'postgresql://h/d')
})

test('a PostgreSQL entry builds one pg client with the configured connect timeout', async () => {
  const api = createClient({ driver: 'kingbase', dsn: 'jdbc:kingbase8://h:54321/d' }, limits)
  assert.equal(api.driver, 'kingbase')
  const client = await api.connect()
  assert.equal(client.constructor.name, 'Client')
  assert.equal(client.config.connectionTimeoutMillis, 5000)
  await client.end()
})

test('MySQL connection strings parse and reject bad shapes', () => {
  assert.deepEqual(parseMysqlDsn({ dsn: 'mysql://u:p@h:3307/db' }), { host: 'h', port: 3307, user: 'u', password: 'p', database: 'db' })
  assert.equal(parseMysqlDsn({ dsn: 'mysql://h/db' }).port, 3306)
  assert.throws(() => parseMysqlDsn({ dsn: 'postgresql://h/db' }), /非法的 MySQL 连接串/u)
  assert.throws(() => parseMysqlDsn({ dsn: 'mysql://h' }), /非法的 MySQL 连接串/u)
})

test('Oracle connection strings parse into a connect string', () => {
  assert.deepEqual(parseOracleDsn({ dsn: 'oracle://u:p@h/svc' }), { user: 'u', password: 'p', connectString: 'h:1521/svc' })
  assert.throws(() => parseOracleDsn({ dsn: 'mysql://h/db' }), /非法的 Oracle 连接串/u)
})

test('MySQL results are adapted to the pg row shape', async () => {
  const adapter = wrapMysqlLike({ query: async () => [[{ id: 7 }, { id: 8 }], []], end: async () => {} })
  assert.deepEqual(await adapter.query('select 1'), { rows: [{ id: 7 }, { id: 8 }], rowCount: 2 })
  const writeAdapter = wrapMysqlLike({ query: async () => [{ affectedRows: 3 }, []], end: async () => {} })
  assert.deepEqual(await writeAdapter.query('select 1'), { rows: [], rowCount: 3 })
})

test('OceanBase uses the oceanbase package and marks Oracle-mode tenants', async () => {
  const api = createClient({ driver: 'oceanbase', host: 'h', port: 2883, user: 'u', password: 'p', mode: 'oracle', tenant: 't', cluster: 'c', database: 'd' }, limits)
  assert.equal(api.isOracleLike, true)
  const client = await api.connect()
  await client.end()
})

test('OceanBase defaults to the MySQL tenant mode and port 2883', async () => {
  const api = createClient({ driver: 'oceanbase', host: 'h', user: 'u', password: 'p' }, limits)
  assert.equal(api.isOracleLike, false)
  await (await api.connect()).end()
})

test('Oracle adapts execute into query and close into end', async () => {
  const api = createClient({ driver: 'oracle', dsn: 'oracle://u:p@h/svc' }, limits)
  assert.equal(api.isOracleLike, true)
  const client = await api.connect()
  assert.deepEqual(await client.query('select 1 from dual'), { rows: [{ N: 1 }] })
  await client.end()
})

test('an unsupported driver names the supported set', () => {
  assert.throws(
    () => createClient({ driver: 'db2' }, limits),
    /DRIVER_UNKNOWN: 不支持的驱动类型 "db2"（支持：kingbase, postgres, pg, mysql, oracle, oceanbase）/u,
  )
})

test('a missing package reports the install command', () => {
  const bare = makeDriverDirectory({ omit: ['oracledb'] })
  assert.throws(
    () => createClient({ driver: 'oracle', dsn: 'oracle://u:p@h/svc' }, { ...limits, driverDirectory: bare }),
    /DRIVER_MISSING: 未能在 .* 加载 oracledb/u,
  )
})
