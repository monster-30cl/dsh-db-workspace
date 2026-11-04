/**
 * Database workspace: connection configuration and connectivity for the
 * `db-config.json` file used by the standalone `db.js` helper.
 *
 * Owns connection metadata, probes, read-only queries and schema inspection.
 * The legacy db.js read-only keyword boundary is preserved.
 *
 * Namespace plugin (named exports, no default export).
 * @module @local/dsh-db-workspace
 */

import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { describeEnvs, loadConfig, resolveEntry } from './config.js'
import { revealPassword } from './reveal.js'
import { runDatabase } from './database-process.js'
import { approveSql } from './approval.js'
import { DATABASE_POLICY } from './policy.js'
import { deleteConnection, markDefault, normalizeEntry, saveConnection, writeConfigFile } from './store.js'

/** Loader row id. */
export const name = 'db-workspace'

/** Services this plugin contributes to. */
export const inject = ['tools', 'commands', 'systemPrompt']

/** Deployment defaults for the connection file and the probe deadlines. */
export const DEFAULTS = Object.freeze({
  connectTimeoutMs: 10_000,
  testTimeoutMs: 15_000,
})

/** Usage text shared by the command error and the README. */
export const USAGE = '/db-config {list | test <别名> | test-draft <json> | save <json> | delete <别名> | default <别名>}'

/**
 * Read one required-or-defaulted string field.
 * @param {Record<string, unknown>} raw Loader row configuration.
 * @param {string} key Field name.
 * @param {string} fallback Value when the field is absent.
 * @returns {string} The resolved non-empty string.
 * @throws {TypeError} When the field is present but not a non-empty string.
 */
function stringField(raw, key, fallback) {
  const value = raw[key] ?? fallback
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`db-workspace: config.${key} 必须是非空字符串`)
  }
  return value
}

/**
 * Read one bounded integer field.
 * @param {Record<string, unknown>} raw Loader row configuration.
 * @param {string} key Field name.
 * @param {number} fallback Value when the field is absent.
 * @param {number} min Smallest accepted value.
 * @param {number} max Largest accepted value.
 * @returns {number} The resolved integer.
 * @throws {TypeError} When the field is present but not an integer in range.
 */
function integerField(raw, key, fallback, min, max) {
  const value = raw[key] ?? fallback
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new TypeError(`db-workspace: config.${key} 必须是 ${min} 到 ${max} 之间的整数`)
  }
  return value
}

/**
 * Validate the row configuration once at activation.
 * @param {unknown} raw Loader row configuration.
 * @returns {{ configPath: string, driverDirectory: string, connectTimeoutMs: number, testTimeoutMs: number, queryTimeoutMs: number }} Resolved configuration.
 * @throws {TypeError} When a field is invalid.
 */
export function resolveConfig(raw) {
  if (raw !== undefined && (typeof raw !== 'object' || raw === null || Array.isArray(raw))) {
    throw new TypeError('db-workspace: config 必须是对象')
  }
  const config = raw ?? {}
  const localHome = process.env.DSH_PROFILE_DIR || process.env.DSH_HOME || join(homedir(), '.dsh')
  const configPath = resolve(stringField(config, 'configPath', process.env.DSH_DB_CONFIG_PATH || join(localHome, 'db-config.json')))
  return {
    configPath,
    driverDirectory: resolve(stringField(config, 'driverDirectory', process.env.DSH_DB_DRIVER_DIRECTORY || dirname(configPath))),
    queryTimeoutMs: integerField(config, 'queryTimeoutMs', 30_000, 1_000, 480_000),
    connectionMaxLifetimeMs: integerField(config, 'connectionMaxLifetimeMs', 480_000, 1_000, 480_000),
    connectTimeoutMs: integerField(config, 'connectTimeoutMs', DEFAULTS.connectTimeoutMs, 1_000, 600_000),
    testTimeoutMs: integerField(config, 'testTimeoutMs', DEFAULTS.testTimeoutMs, 1_000, 600_000),
  }
}

/**
 * Render one canonical tool value as model-facing text.
 * @param {unknown} value Canonical value declared by the tool's output schema.
 * @returns {{ type: 'text', text: string }[]} One text block.
 */
function renderJson(value) {
  return [{ type: 'text', text: JSON.stringify(value, null, 1) }]
}

/** Shared `env` parameter description. */
const ENV_DESCRIPTION = '配置里的库别名；省略时使用配置文件的 default。'

/**
 * Register the connection tools and the `/db-config` command.
 * @param {import('@deepseek-ai/cordis').Context} ctx Host context injecting `tools` and `commands`.
 * @param {unknown} rawConfig Loader row configuration.
 */
export function apply(ctx, rawConfig) {
  const config = resolveConfig(rawConfig)
  const driverOptions = { driverDirectory: config.driverDirectory, connectTimeoutMs: config.connectTimeoutMs, queryTimeoutMs: config.queryTimeoutMs, testTimeoutMs: config.testTimeoutMs, connectionMaxLifetimeMs: config.connectionMaxLifetimeMs }

  /**
   * Describe the connection file without credentials.
   * @returns {{ configPath: string, default: string, connections: Record<string, unknown>[] }} Connection list.
   */
  const listing = () => {
    const described = describeEnvs(loadConfig(config.configPath))
    return { configPath: config.configPath, default: described.default ?? '', connections: described.envs }
  }

  /**
   * Probe one stored alias.
   * @param {string | undefined} alias Alias to probe.
   * @param {AbortSignal | undefined} signal Caller cancellation.
   * @returns {Promise<{ alias: string, driver: string, ok: true, message: string }>} Probe outcome.
   */
  const probeAlias = async (alias, signal) => {
    const resolved = resolveEntry(loadConfig(config.configPath), alias)
    const outcome = await runDatabase(resolved.entry, driverOptions, { kind: 'probe' }, signal)
    return { alias: resolved.name, driver: outcome.driver, ok: true, message: outcome.message }
  }

  /**
   * Probe one submitted connection that is not stored yet.
   * @param {Record<string, unknown>} entry Submitted entry fields.
   * @param {AbortSignal | undefined} signal Caller cancellation.
   * @returns {Promise<{ alias: string, driver: string, ok: true, message: string }>} Probe outcome.
   */
  const probeDraft = async (entry, signal) => {
    const previous = typeof entry.name === 'string' && entry.name !== ''
      ? loadConfig(config.configPath).databases[entry.name] ?? null
      : null
    const normalized = normalizeEntry(entry, previous)
    const outcome = await runDatabase(normalized, driverOptions, { kind: 'probe' }, signal)
    return { alias: typeof entry.name === 'string' ? entry.name : '', driver: outcome.driver, ok: true, message: outcome.message }
  }

  const disposers = [
    ctx.systemPrompt.section({ name: 'db-workspace:database-policy', order: 500, text: DATABASE_POLICY }),
    ctx.tools.register({
      name: 'db_connections',
      description:
        'List the configured database connections with driver, host, user, and default marker. '
        + 'Passwords and connection strings are never returned. Use db_query and db_schema for database reads.',
      parameters: {},
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            configPath: { type: 'string' },
            default: { type: 'string' },
            connections: { type: 'array' },
          },
          required: ['configPath', 'default', 'connections'],
        },
        render: (_args, value) => renderJson(value),
      },
      async execute() {
        return listing()
      },
    }),
    ctx.tools.register({
      name: 'db_test_connection',
      description:
        'Open and immediately close one configured connection to verify the stored credentials and network reachability. '
        + 'The failure message has the password and connection string redacted.',
      parameters: {
        env: { type: 'string', description: ENV_DESCRIPTION },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            alias: { type: 'string' },
            driver: { type: 'string' },
            ok: { type: 'boolean' },
            message: { type: 'string' },
          },
          required: ['alias', 'driver', 'ok', 'message'],
        },
        render: (_args, value) => renderJson(value),
      },
      timeoutMs: config.testTimeoutMs + 30_000,
      async execute(args, exec) {
        return probeAlias(args.env, exec.signal)
      },
    }),
    ...['query', 'schema'].map(kind => ctx.tools.register({
      name: `db_${kind}`,
      description: kind === 'query'
        ? 'Execute one read-only SQL statement using a configured connection alias and a read-only transaction. SQL words are inspected without rejecting keyword fragments in field names. Writes and analysis require db_execute and user approval. Returns at most 1000 rows.'
        : 'Inspect database structure using a configured connection alias. Omit table to list tables; provide table to list columns. Optional schema selects the namespace. No arbitrary SQL is accepted.',
      parameters: {
        env: { type: 'string', description: ENV_DESCRIPTION },
        limit: { type: 'integer', minimum: 1, maximum: 1000, description: '最多返回行数，默认 100；仅限制输出，建议 SQL 本身也限制结果量。' },
        ...(kind === 'query' ? { sql: { type: 'string', required: true, description: '单条只读 SQL。字段名可包含 update/create 等片段；写入或分析语句须改用 db_execute 逐次申请用户批准。' } }
          : { table: { type: 'string', description: '表名；省略时列出表。' }, schema: { type: 'string', description: 'schema 或 Oracle owner；默认使用连接当前命名空间。' } }),
      },
      output: { schema: { type: 'object', properties: { alias: { type: 'string' }, driver: { type: 'string' }, rows: { type: 'array' }, returnedRows: { type: 'integer' }, truncated: { type: 'boolean' } }, required: ['alias', 'driver', 'rows', 'returnedRows', 'truncated'], additionalProperties: false }, render: (_args, value) => renderJson(value) },
      timeoutMs: config.queryTimeoutMs + 5000,
      async execute(args, exec) {
        const resolved = resolveEntry(loadConfig(config.configPath), args.env)
        return { alias: resolved.name, ...await runDatabase(resolved.entry, driverOptions, { ...args, kind }, exec.signal) }
      },
    })),
    ctx.tools.register({
      name: 'db_execute',
      description: 'Execute exactly one DML/DDL or analysis/maintenance statement ONLY after the host asks the user and receives an allowed-once approval for this exact SQL and connection. Denial terminates before connecting. Analysis may consume CPU/IO and locks. Never pass an approved flag or bypass a rejection.',
      parameters: { env: { type: 'string', description: ENV_DESCRIPTION }, sql: { type: 'string', required: true, description: '待批准执行的单条 SQL 原文。' }, limit: { type: 'integer', minimum: 1, maximum: 1000, description: '最多返回行数，默认 100。' } },
      output: { schema: { type: 'object', properties: { alias: { type: 'string' }, driver: { type: 'string' }, rows: { type: 'array' }, returnedRows: { type: 'integer' }, truncated: { type: 'boolean' }, affectedRows: { type: 'integer' } }, required: ['alias', 'driver', 'rows', 'returnedRows', 'truncated'], additionalProperties: false }, render: (_args, value) => renderJson(value) },
      async execute(args, exec) {
        if (args.limit !== undefined && (!Number.isSafeInteger(args.limit) || args.limit < 1 || args.limit > 1000)) throw new Error('limit 必须为 1 到 1000 的整数')
        const resolved = resolveEntry(loadConfig(config.configPath), args.env)
        const entry = structuredClone(resolved.entry)
        const plan = await approveSql(ctx, exec, resolved.name, args.sql)
        return { alias: resolved.name, ...await runDatabase(entry, driverOptions, { kind: 'execute', sql: plan.sql, limit: args.limit }, exec.signal) }
      },
    }),
    ctx.commands.register({
      name: 'db-config',
      description: '管理数据库连接：list / test / test-draft / save / delete / default',
      input: { hint: '{list | test <别名> | test-draft <json> | save <json> | delete <别名> | default <别名>}' },
      // The save and test-draft payloads carry a submitted password; the
      // command/run event must not persist them. Results stay secret-free.
      recordInput: false,
      handler: async (invocation) => {
        let request
        try {
          request = parseConfigCommand(invocation.rawInput)
        } catch (cause) {
          return { kind: 'error', text: messageOf(cause) }
        }
        try {
          switch (request.action) {
            case 'reveal': {
              const resolved = resolveEntry(loadConfig(config.configPath), request.alias)
              const result = await revealPassword(resolved.entry, resolved.name, invocation.signal, request)
              return { kind: 'success', text: JSON.stringify(result) }
            }
            case 'list':
              return { kind: 'success', text: JSON.stringify(listing(), null, 2) }
            case 'test':
              return { kind: 'success', text: JSON.stringify(await probeAlias(request.alias, invocation.signal), null, 2) }
            case 'test-draft':
              return { kind: 'success', text: JSON.stringify(await probeDraft(request.entry, invocation.signal), null, 2) }
            case 'save': {
              const next = saveConnection(loadConfig(config.configPath), request)
              writeConfigFile(config.configPath, next)
              return { kind: 'success', text: JSON.stringify(listing(), null, 2) }
            }
            case 'delete': {
              const next = deleteConnection(loadConfig(config.configPath), request.alias)
              writeConfigFile(config.configPath, next)
              return { kind: 'success', text: JSON.stringify(listing(), null, 2) }
            }
            case 'default': {
              const next = markDefault(loadConfig(config.configPath), request.alias)
              writeConfigFile(config.configPath, next)
              return { kind: 'success', text: JSON.stringify(listing(), null, 2) }
            }
            default:
              return { kind: 'error', text: USAGE }
          }
        } catch (cause) {
          return { kind: 'error', text: messageOf(cause) }
        }
      },
    }),
  ]

  ctx.effect(() => () => {
    for (const dispose of disposers.reverse()) dispose()
  }, 'db-workspace: tools and commands')
}

/**
 * Parse one `/db-config` invocation.
 * @param {string} rawInput Command input after the command name.
 * @returns {{ action: 'list' }
 *   | { action: 'test' | 'delete' | 'default', alias: string }
 *   | { action: 'reveal', alias: string, publicKey: object, challenge: string }
 *   | { action: 'test-draft', entry: Record<string, unknown> }
 *   | { action: 'save', name: unknown, oldName: unknown, entry: Record<string, unknown> }} Parsed request.
 * @throws {Error} When the action is unknown, an alias is missing, or a payload is not valid JSON.
 */
export function parseConfigCommand(rawInput) {
  const text = String(rawInput).trim()
  if (text === '') return { action: 'list' }
  const separator = text.search(/\s/u)
  const action = (separator === -1 ? text : text.slice(0, separator)).toLowerCase()
  const rest = separator === -1 ? '' : text.slice(separator + 1).trim()
  switch (action) {
    case 'list':
      if (rest !== '') throw new Error(USAGE)
      return { action: 'list' }
    case 'test':
    case 'delete':
    case 'default':
      if (rest === '') throw new Error(`${USAGE}\n缺少别名`)
      return { action, alias: rest.split(/\s+/u).pop() }
    case 'reveal': {
      const payload = parsePayload(rest)
      if (typeof payload.alias !== 'string' || payload.alias === '') throw new Error('缺少连接别名')
      return { action, alias: payload.alias, publicKey: payload.publicKey, challenge: payload.challenge }
    }
    case 'test-draft':
      return { action: 'test-draft', entry: parsePayload(rest) }
    case 'save': {
      const payload = parsePayload(rest)
      return { action: 'save', name: payload.name, oldName: payload.oldName, entry: payload.entry ?? {} }
    }
    default:
      throw new Error(USAGE)
  }
}

/**
 * Parse one JSON payload argument.
 * @param {string} text Payload text.
 * @returns {Record<string, unknown>} Parsed object.
 * @throws {Error} When the text is not a JSON object.
 */
function parsePayload(text) {
  if (text === '') throw new Error(`${USAGE}\n缺少 JSON 参数`)
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('参数不是合法 JSON')
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('参数必须是 JSON 对象')
  }
  return parsed
}

/**
 * Flatten an error into one line for a command result.
 * @param {unknown} cause Thrown value.
 * @returns {string} Message.
 */
function messageOf(cause) {
  return cause instanceof Error ? cause.message.split('\n')[0] : String(cause)
}
