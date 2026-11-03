/** Offline fixtures: a driver directory whose packages record every call. */

import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

/** Shared call log the fake drivers append to. */
export const calls = []

/**
 * Build the fake `pg` package source.
 * @param {string | undefined} connectError Message thrown by `connect()`, to exercise probe failures.
 * @returns {string} CommonJS source.
 */
function pgStub(connectError) {
  const connect = connectError === undefined
    ? "async connect() { state.calls.push({ kind: 'connect' }) }"
    : `async connect() { throw new Error(${JSON.stringify(connectError)}) }`
  return `
const state = globalThis.__dshDbFake
module.exports = {
  Client: class {
    constructor(config) { this.config = config; state.calls.push({ kind: 'config', config }) }
    ${connect}
    async query(sql, params) { state.calls.push({ kind: 'query', sql, params }); return { rows: [{ id: 1, name: 'a' }], rowCount: 1 } }
    async end() { state.calls.push({ kind: 'end' }) }
  },
}
`
}

const PG_CONNECTION_STUB = `
module.exports = { parse: dsn => ({ user: 'u', password: 'p', host: 'h', port: 5432, database: 'd', dsn }) }
`

const MYSQL_STUB = `
const state = globalThis.__dshDbFake
module.exports = {
  createConnection: async (config) => {
    state.calls.push({ kind: 'mysql-connect', config })
    return {
      query: async (sql) => { state.calls.push({ kind: 'mysql-query', sql }); return [[{ id: 7 }], []] },
      end: async () => { state.calls.push({ kind: 'mysql-end' }) },
    }
  },
}
`

const ORACLE_STUB = `
const state = globalThis.__dshDbFake
module.exports = {
  OUT_FORMAT_OBJECT: 4002,
  getConnection: async (config) => {
    state.calls.push({ kind: 'oracle-connect', config })
    return {
      execute: async (sql, binds) => { state.calls.push({ kind: 'oracle-execute', sql, binds }); return { rows: [{ N: 1 }] } },
      close: async () => { state.calls.push({ kind: 'oracle-close' }) },
    }
  },
}
`

const OCEANBASE_STUB = `
const state = globalThis.__dshDbFake
module.exports = {
  createConnection: async (config) => {
    state.calls.push({ kind: 'oceanbase-connect', config })
    return {
      query: async (sql) => { state.calls.push({ kind: 'oceanbase-query', sql }); return [[{ id: 9 }], []] },
      end: async () => { state.calls.push({ kind: 'oceanbase-end' }) },
    }
  },
}
`

/**
 * Write one package into a directory's `node_modules`.
 * @param {string} root Directory receiving `node_modules`.
 * @param {string} name Package name; nested names create nested folders.
 * @param {string} source CommonJS source.
 */
function writePackage(root, name, source) {
  const directory = join(root, 'node_modules', name)
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, 'index.js'), source, 'utf8')
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ name, version: '0.0.0', main: 'index.js' }), 'utf8')
}

/**
 * Create a temporary driver directory with fake pg, mysql2, oracledb and oceanbase.
 * @param {{ omit?: string[], pgConnectError?: string }} [options] Packages to leave out, or a
 * message that makes the fake `pg` client fail its connection.
 * @returns {string} Directory usable as `driverDirectory`.
 */
export function makeDriverDirectory(options = {}) {
  const root = mkdtempSync(join(tmpdir(), 'dsh-db-drivers-'))
  const omitted = new Set(options.omit ?? [])
  const packages = new Map([
    ['pg', pgStub(options.pgConnectError)],
    ['pg-connection-string', PG_CONNECTION_STUB],
    ['mysql2/promise', MYSQL_STUB],
    ['oracledb', ORACLE_STUB],
    ['oceanbase/promise', OCEANBASE_STUB],
  ])
  for (const [name, source] of packages) {
    if (omitted.has(name)) continue
    if (name.includes('/')) {
      // A nested file cannot be a package directory: the real packages expose
      // subpaths, so the stub mirrors that with an index file plus a subpath file.
      const [scope, rest] = [name.slice(0, name.indexOf('/')), name.slice(name.indexOf('/') + 1)]
      const directory = join(root, 'node_modules', scope)
      mkdirSync(directory, { recursive: true })
      writeFileSync(join(directory, `${rest}.js`), source, 'utf8')
      writeFileSync(join(directory, 'package.json'), JSON.stringify({ name: scope, version: '0.0.0', main: 'index.js' }), 'utf8')
      writeFileSync(join(directory, 'index.js'), 'module.exports = {}', 'utf8')
      continue
    }
    writePackage(root, name, source)
  }
  globalThis.__dshDbFake = { calls }
  return root
}

/**
 * Write a connection file next to a driver directory.
 * @param {string} root Directory receiving `db-config.json`.
 * @param {Record<string, unknown>} entries Alias to entry map.
 * @param {string} [defaultAlias] Alias marked as default.
 * @returns {string} Absolute connection-file path.
 */
export function writeConfig(root, entries, defaultAlias) {
  const path = join(root, 'db-config.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify({ default: defaultAlias ?? null, databases: entries }, null, 2), 'utf8')
  return path
}
