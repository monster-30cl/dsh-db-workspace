/** Connection-file model: load `db-config.json`, pick one entry, and describe entries without secrets. */

import { readFileSync } from 'node:fs'
import { credentialsOf } from './credentials.js'

/** A connection file holds `{ default, databases: { <alias>: entry } }`. */
export const EMPTY_CONFIG = Object.freeze({ default: null, databases: {} })

/**
 * Read and parse the connection file. A missing file is an empty configuration;
 * unparseable or structurally wrong content fails loud because every later
 * lookup would otherwise report a misleading "alias not found".
 * @param {string} configPath Absolute path to the connection file.
 * @returns {{ default: string | null, databases: Record<string, Record<string, unknown>> }} Parsed file.
 * @throws {Error} When the file exists but is not a JSON object with a `databases` object.
 */
export function loadConfig(configPath) {
  let text
  try {
    text = readFileSync(configPath, 'utf8')
  } catch (cause) {
    if (cause instanceof Error && 'code' in cause && cause.code === 'ENOENT') {
      return { default: null, databases: {} }
    }
    throw new Error(`DB_CONFIG_FAIL: 无法读取配置 ${configPath}：${cause instanceof Error ? cause.message : String(cause)}`)
  }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (cause) {
    throw new Error(`DB_CONFIG_FAIL: ${configPath} 不是合法 JSON：${cause instanceof Error ? cause.message : String(cause)}`)
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)
    || parsed.databases === null || typeof parsed.databases !== 'object' || Array.isArray(parsed.databases)) {
    throw new Error(`DB_CONFIG_FAIL: ${configPath} 缺少 databases 对象`)
  }
  const fallback = typeof parsed.default === 'string' && parsed.default !== '' ? parsed.default : null
  return { default: fallback, databases: { ...parsed.databases } }
}

/**
 * Resolve the connection entry a call targets: the explicit alias, else the file default.
 * @param {{ default: string | null, databases: Record<string, Record<string, unknown>> }} config Parsed file.
 * @param {string | undefined} alias Requested alias.
 * @returns {{ name: string, entry: Record<string, unknown> }} The resolved alias and entry.
 * @throws {Error} When the alias (or the file default) does not exist.
 */
export function resolveEntry(config, alias) {
  const names = Object.keys(config.databases)
  const requested = alias ?? config.default
  if (requested === undefined || requested === null || requested === '') {
    throw new Error(`DB_ENV_FAIL: 配置中没有默认库，请显式指定 env。已配置：${names.length === 0 ? '(空)' : names.join(', ')}`)
  }
  const entry = config.databases[requested]
  if (entry === undefined) {
    throw new Error(`DB_ENV_FAIL: 未找到库别名 "${requested}"。已配置：${names.length === 0 ? '(空)' : names.join(', ')}`)
  }
  return { name: requested, entry }
}

/**
 * Project one entry onto the fields a client or a model may see. Connection
 * strings and passwords never leave the Host: the projection keeps only a
 * boolean saying whether each is present.
 * @param {Record<string, unknown>} entry Connection entry.
 * @returns {Record<string, unknown>} Secret-free description.
 */
export function describeEntry(entry) {
  const text = value => (typeof value === 'string' && value !== '' ? value : '')
  return {
    driver: text(entry.driver) || 'kingbase',
    host: text(entry.host),
    port: entry.port === undefined || entry.port === null || entry.port === '' ? '' : entry.port,
    user: credentialsOf(entry).user,
    tenant: text(entry.tenant),
    cluster: text(entry.cluster),
    database: text(entry.database),
    mode: text(entry.mode),
    hasDsn: typeof entry.dsn === 'string' && entry.dsn !== '',
    hasPassword: credentialsOf(entry).password !== '',
  }
}

/**
 * Describe every configured alias, marking the file default.
 * @param {{ default: string | null, databases: Record<string, Record<string, unknown>> }} config Parsed file.
 * @returns {{ default: string | null, envs: { name: string, isDefault: boolean }[] }} Alias list; the
 * entries themselves come from {@link describeEntry}.
 */
export function describeEnvs(config) {
  return {
    default: config.default,
    envs: Object.entries(config.databases).map(([name, entry]) => ({
      name,
      isDefault: name === config.default,
      ...describeEntry(entry),
    })),
  }
}
