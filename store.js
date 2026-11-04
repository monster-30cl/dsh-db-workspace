/**
 * Connection-file writes: normalize one submitted connection, apply it to the
 * file model, and persist the model with a backup of the previous content.
 *
 * A submitted connection never carries the stored password or connection
 * string back from the client — the client only ever sees `hasDsn` and
 * `hasPassword`. Blank credential fields therefore mean "keep the stored
 * value", which is what the standalone GUI does.
 */

import { copyFileSync, existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/** Driver names accepted in the connection file. */
export const SUPPORTED_DRIVERS = Object.freeze(['kingbase', 'postgres', 'pg', 'mysql', 'oracle', 'oceanbase'])

/** Alias rules shared with the standalone GUI. */
export const ALIAS_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u

/** Entry fields OceanBase uses instead of a connection string. */
const OCEANBASE_FIELDS = ['host', 'user', 'tenant', 'cluster', 'database']

/**
 * Trim a submitted value to a non-empty string.
 * @param {unknown} value Submitted value.
 * @returns {string} Trimmed text, or an empty string.
 */
function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Normalize one submitted connection into a storable entry.
 * @param {Record<string, unknown>} input Submitted connection fields.
 * @param {Record<string, unknown> | null} previous Entry currently stored under the alias, if any.
 * @returns {Record<string, unknown>} Entry to write.
 * @throws {Error} When the driver, port, or required fields are invalid.
 */
export function normalizeEntry(input, previous) {
  const driver = text(input.driver).toLowerCase()
  if (!SUPPORTED_DRIVERS.includes(driver)) throw new Error('请选择受支持的驱动')
  if (driver === 'oceanbase') {
    const entry = { driver }
    for (const field of OCEANBASE_FIELDS) {
      const value = text(input[field])
      if (value !== '') entry[field] = value
    }
    const port = Number(input.port === undefined || input.port === '' ? 2883 : input.port)
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('端口必须是 1-65535 的整数')
    entry.port = port
    entry.mode = input.mode === 'oracle' ? 'oracle' : 'mysql'
    const submitted = text(input.password)
    if (submitted !== '') entry.password = String(input.password)
    else if (previous !== null && previous.driver === driver && typeof previous.password === 'string') {
      entry.password = previous.password
    }
    if (!entry.host || !entry.user || !entry.password) throw new Error('OceanBase 需要主机、用户名和密码')
    return entry
  }
  const dsn = text(input.dsn) !== ''
    ? text(input.dsn)
    : (previous !== null && previous.driver === driver ? text(previous.dsn) : '')
  if (dsn === '') throw new Error('请输入连接串')
  const entry = { driver, dsn }
  // The DSN editor does not expose structured overrides used by PostgreSQL
  // drivers; preserve them while editing the same driver.
  if (previous !== null && previous.driver === driver) {
    for (const key of ['host', 'port', 'database']) {
      if (Object.hasOwn(previous, key)) entry[key] = previous[key]
    }
  }
  const user = text(input.user) !== ''
    ? text(input.user)
    : (previous !== null && previous.driver === driver ? text(previous.user) : '')
  if (user !== '') entry.user = user
  const submittedPassword = text(input.password)
  if (submittedPassword !== '') entry.password = String(input.password)
  else if (previous !== null && previous.driver === driver && typeof previous.password === 'string') {
    entry.password = previous.password
  }
  return entry
}

/**
 * Validate an alias.
 * @param {unknown} value Submitted alias.
 * @returns {string} The alias.
 * @throws {Error} When the alias is empty or uses unsupported characters.
 */
export function normalizeAlias(value) {
  const alias = text(value)
  if (!ALIAS_PATTERN.test(alias)) throw new Error('别名需以字母或数字开头，仅可包含字母、数字、-、_，最长 64 个字符')
  return alias
}

/**
 * Apply one save request to a copy of the configuration.
 * @param {{ default: string | null, databases: Record<string, Record<string, unknown>> }} config Current configuration.
 * @param {{ name: unknown, oldName?: unknown, entry: Record<string, unknown> }} request Save request.
 * @returns {{ default: string | null, databases: Record<string, Record<string, unknown>> }} Updated configuration.
 * @throws {Error} When the alias collides, the rename target is gone, or the entry is invalid.
 */
export function saveConnection(config, request) {
  const name = normalizeAlias(request.name)
  const oldName = text(request.oldName)
  const databases = { ...config.databases }
  if (oldName !== '' && oldName !== name && !Object.hasOwn(databases, oldName)) {
    throw new Error('原连接不存在，请重新加载')
  }
  if (name !== oldName && Object.hasOwn(databases, name)) throw new Error('该别名已存在')
  const previous = oldName !== '' && Object.hasOwn(databases, oldName) ? databases[oldName] : null
  const entry = normalizeEntry(request.entry ?? {}, previous)
  if (oldName !== '' && oldName !== name) delete databases[oldName]
  databases[name] = entry
  const fallback = oldName !== '' ? oldName : name
  const def = !config.default || config.default === fallback ? name : config.default
  return { default: def, databases }
}

/**
 * Remove one alias.
 * @param {{ default: string | null, databases: Record<string, Record<string, unknown>> }} config Current configuration.
 * @param {unknown} alias Alias to remove.
 * @returns {{ default: string | null, databases: Record<string, Record<string, unknown>> }} Updated configuration.
 * @throws {Error} When the alias is unknown.
 */
export function deleteConnection(config, alias) {
  const name = text(alias)
  if (!Object.hasOwn(config.databases, name)) throw new Error('连接不存在')
  const databases = { ...config.databases }
  delete databases[name]
  return {
    default: config.default === name ? (Object.keys(databases)[0] ?? null) : config.default,
    databases,
  }
}

/**
 * Mark one alias as the default.
 * @param {{ default: string | null, databases: Record<string, Record<string, unknown>> }} config Current configuration.
 * @param {unknown} alias Alias to mark.
 * @returns {{ default: string | null, databases: Record<string, Record<string, unknown>> }} Updated configuration.
 * @throws {Error} When the alias is unknown.
 */
export function markDefault(config, alias) {
  const name = text(alias)
  if (!Object.hasOwn(config.databases, name)) throw new Error('连接不存在')
  return { default: name, databases: { ...config.databases } }
}

/**
 * Persist the configuration: keep the previous content as `<file>.bak`, write a
 * temporary file, then rename it over the target so a reader never sees a
 * partial file.
 * @param {string} configPath Target file.
 * @param {{ default: string | null, databases: Record<string, Record<string, unknown>> }} config Configuration to write.
 */
export function writeConfigFile(configPath, config) {
  mkdirSync(dirname(configPath), { recursive: true })
  if (existsSync(configPath)) copyFileSync(configPath, `${configPath}.bak`)
  const temporary = `${configPath}.tmp`
  try {
    writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
    renameSync(temporary, configPath)
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary)
  }
}
