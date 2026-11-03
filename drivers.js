/**
 * Driver dispatch over the packages installed in one directory.
 *
 * The plugin never bundles a database driver: `oracledb` is native, and the
 * versions that must match a running server are an operator choice. Every
 * driver is therefore resolved through `createRequire()` against the configured
 * `driverDirectory`, and a missing package fails with the exact install command.
 */

import { createRequire } from 'node:module'
import { join } from 'node:path'

/** Drivers that talk to PostgreSQL-compatible servers through the `pg` package. */
export const POSTGRES_DRIVERS = Object.freeze(['kingbase', 'postgres', 'pg'])

/** Every accepted `driver` value. */
export const SUPPORTED_DRIVERS = Object.freeze([...POSTGRES_DRIVERS, 'mysql', 'oracle', 'oceanbase'])

/**
 * Resolve a bare package specifier from a directory instead of this module.
 * @param {string} directory Directory whose `node_modules` supplies the drivers.
 * @returns {NodeRequire} Require function bound to that directory.
 */
function requireFrom(directory) {
  return createRequire(join(directory, 'noop.cjs'))
}

/**
 * Load one driver package, reporting the install command when it is absent.
 * @param {NodeRequire} require Directory-bound require function.
 * @param {string} specifier Package specifier such as `mysql2/promise`.
 * @param {string} packageName Package name used in the install hint.
 * @param {string} directory Directory the packages must be installed in.
 * @returns {any} Loaded module namespace.
 */
function loadDriver(require, specifier, packageName, directory) {
  try {
    return require(specifier)
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message.split('\n')[0] : String(cause)
    throw new Error(`DRIVER_MISSING: 未能在 ${directory} 加载 ${packageName}（${detail}）。请执行 npm install ${packageName} --prefix ${directory}`)
  }
}

/**
 * Accept `postgresql://`, `postgres://`, `jdbc:kingbase8://` and `kingbase8://` spellings.
 * @param {string} dsn Configured connection string.
 * @returns {string} A URL the `pg` parser understands.
 */
export function rewritePostgresDsn(dsn) {
  return dsn.replace(/^jdbc:/iu, '').replace(/^kingbase8?:\/\//iu, 'postgresql://')
}

/**
 * Project a PostgreSQL-compatible entry onto one `pg` client configuration.
 * @param {Record<string, unknown>} entry Connection entry.
 * @param {NodeRequire} require Directory-bound require function.
 * @param {{ connectTimeoutMs: number }} limits Connection timeout.
 * @returns {Record<string, unknown>} `pg` client options.
 */
function postgresOptions(entry, require, limits) {
  const base = {}
  if (typeof entry.dsn === 'string' && entry.dsn !== '') {
    Object.assign(base, require('pg-connection-string').parse(rewritePostgresDsn(entry.dsn)))
  }
  for (const key of ['host', 'port', 'database']) {
    if (entry[key] !== undefined && entry[key] !== '') base[key] = entry[key]
  }
  return {
    ...base,
    ...(typeof entry.user === 'string' && entry.user !== '' ? { user: entry.user } : {}),
    ...(typeof entry.password === 'string' && entry.password !== '' ? { password: entry.password } : {}),
    connectionTimeoutMillis: limits.connectTimeoutMs,
  }
}

/**
 * Parse a `mysql://user:pass@host:port/database` connection string.
 * @param {Record<string, unknown>} entry Connection entry.
 * @returns {{ host: string, port: number, user: string, password: string, database: string }} Field set.
 * @throws {Error} When the string is not a usable MySQL URL.
 */
export function parseMysqlDsn(entry) {
  let url
  try {
    url = new URL(String(entry.dsn))
  } catch {
    throw new Error('DSN_FAIL: 非法的 MySQL 连接串')
  }
  if (url.protocol !== 'mysql:' || url.hostname === '' || url.pathname.slice(1) === '') {
    throw new Error('DSN_FAIL: 非法的 MySQL 连接串（示例 mysql://user:pass@host:3306/db）')
  }
  return {
    host: url.hostname,
    port: Number(url.port === '' ? 3306 : url.port),
    user: typeof entry.user === 'string' && entry.user !== '' ? entry.user : decodeURIComponent(url.username),
    password: typeof entry.password === 'string' && entry.password !== '' ? entry.password : decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
  }
}

/**
 * Parse an `oracle://user:pass@host:port/service` connection string.
 * @param {Record<string, unknown>} entry Connection entry.
 * @returns {{ user: string, password: string, connectString: string }} `oracledb` field set.
 * @throws {Error} When the string is not a usable Oracle URL.
 */
export function parseOracleDsn(entry) {
  let url
  try {
    url = new URL(String(entry.dsn))
  } catch {
    throw new Error('DSN_FAIL: 非法的 Oracle 连接串')
  }
  if (url.protocol !== 'oracle:' || url.hostname === '' || url.pathname.slice(1) === '') {
    throw new Error('DSN_FAIL: 非法的 Oracle 连接串（示例 oracle://user:pass@host:1521/service）')
  }
  return {
    user: typeof entry.user === 'string' && entry.user !== '' ? entry.user : decodeURIComponent(url.username),
    password: typeof entry.password === 'string' && entry.password !== '' ? entry.password : decodeURIComponent(url.password),
    connectString: `${url.hostname}:${url.port === '' ? 1521 : url.port}/${decodeURIComponent(url.pathname.slice(1))}`,
  }
}

/**
 * Adapt a `mysql2`/`oceanbase` connection to the `{ query, end }` shape the query
 * layer uses.
 * @param {{ query: Function, end: Function }} raw Driver connection.
 * @returns {{ query: (sql: string, params?: unknown[]) => Promise<{ rows: object[], rowCount: number | undefined }>, end: () => Promise<void> }} Adapter.
 */
export function wrapMysqlLike(raw) {
  return {
    async query(...args) {
      const [result] = await raw.query(...args)
      const isResultSet = Array.isArray(result)
      return {
        rows: isResultSet ? result : [],
        rowCount: isResultSet
          ? result.length
          : (result && typeof result.affectedRows === 'number' ? result.affectedRows : undefined),
      }
    },
    end: () => raw.end(),
  }
}

/**
 * Build the connection descriptor for one entry.
 * @param {Record<string, unknown>} entry Connection entry from the connection file.
 * @param {{ driverDirectory: string, connectTimeoutMs: number }} options Resolved driver directory and timeout.
 * @returns {{ driver: string, isOracleLike: boolean, connect: () => Promise<{ query: Function, end: Function }> }} Descriptor.
 * @throws {Error} When the driver is unsupported or its package is unavailable.
 */
export function createClient(entry, options) {
  const driver = (typeof entry.driver === 'string' && entry.driver !== '' ? entry.driver : 'kingbase').toLowerCase()
  const require = requireFrom(options.driverDirectory)
  if (POSTGRES_DRIVERS.includes(driver)) {
    const { Client } = loadDriver(require, 'pg', 'pg pg-connection-string', options.driverDirectory)
    return {
      driver,
      isOracleLike: false,
      async connect() {
        const client = new Client(postgresOptions(entry, require, options))
        await client.connect()
        return client
      },
    }
  }
  if (driver === 'oceanbase') {
    const pkg = loadDriver(require, 'oceanbase/promise', 'oceanbase', options.driverDirectory)
    return {
      driver,
      isOracleLike: (typeof entry.mode === 'string' ? entry.mode : 'mysql').toLowerCase() === 'oracle',
      async connect() {
        const raw = await pkg.createConnection({
          host: entry.host,
          port: entry.port === undefined || entry.port === '' ? 2883 : Number(entry.port),
          user: entry.user,
          password: entry.password,
          tenant: entry.tenant,
          cluster: entry.cluster,
          database: entry.database,
          mode: typeof entry.mode === 'string' && entry.mode !== '' ? entry.mode : 'mysql',
          connectTimeout: options.connectTimeoutMs,
        })
        return wrapMysqlLike(raw)
      },
    }
  }
  if (driver === 'mysql') {
    const pkg = loadDriver(require, 'mysql2/promise', 'mysql2', options.driverDirectory)
    return {
      driver,
      isOracleLike: false,
      async connect() {
        const raw = await pkg.createConnection({ ...parseMysqlDsn(entry), connectTimeout: options.connectTimeoutMs })
        return wrapMysqlLike(raw)
      },
    }
  }
  if (driver === 'oracle') {
    const pkg = loadDriver(require, 'oracledb', 'oracledb', options.driverDirectory)
    return {
      driver,
      isOracleLike: true,
      async connect() {
        pkg.outFormat = pkg.OUT_FORMAT_OBJECT
        const connection = await pkg.getConnection({
          ...parseOracleDsn(entry),
          connectTimeout: options.connectTimeoutMs,
        })
        return {
          async query(sql, params) {
            if (params !== undefined) return connection.execute(sql, params)
            return connection.execute(sql)
          },
          end: () => connection.close(),
        }
      },
    }
  }
  throw new Error(`DRIVER_UNKNOWN: 不支持的驱动类型 "${String(entry.driver)}"（支持：${SUPPORTED_DRIVERS.join(', ')}）`)
}
