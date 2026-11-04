/**
 * Verify the shipped artifacts without a running Harness: the Host plugin
 * registers its contributions, the packaged client bundle evaluates to an
 * injectable plugin, and the row configuration points at a readable file.
 *
 * Run: `node verify.mjs`.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'))

assert.equal(manifest.name, '@local/dsh-db-workspace', 'package name')
assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml', 'bundle patch entry')
assert.equal(manifest.dsh.client.platform, 'web', 'client platform')
for (const path of ['index.js', 'client.js', 'cordis.patch.yml', 'icon.svg']) {
  assert.equal(existsSync(join(directory, path)), true, `${path} exists`)
}

const patch = readFileSync(join(directory, 'cordis.patch.yml'), 'utf8')
assert.ok(patch.includes(`name: '${manifest.name}'`), 'patch row names this package')
const configPath = join(directory, '.verification-empty-config.json')
const driverDirectory = directory

const host = await import('./index.js')
assert.equal(host.name, 'db-workspace')
assert.deepEqual([...host.inject].sort(), ['commands', 'systemPrompt', 'tools'])

const tools = []
const commands = []
host.apply({
  systemPrompt: { section(definition) { assert.ok(definition.text.includes('db_query')); return () => {} } },
  tools: { register(definition) { tools.push(definition); return () => {} } },
  commands: { register(definition) { commands.push(definition); return () => {} } },
  effect(body) { return body() },
}, { configPath, driverDirectory })

assert.deepEqual(tools.map(tool => tool.name), ['db_connections', 'db_test_connection', 'db_query', 'db_schema', 'db_execute'])
assert.deepEqual(commands.map(command => command.name), ['db-config'])
assert.equal(commands[0].recordInput, false, 'the save payload must not enter the session log')

const listing = await tools[0].execute({}, { signal: new AbortController().signal })
assert.deepEqual(listing.connections, [], 'verification never reads a real connection file')
const serialized = JSON.stringify(listing)
assert.equal(/password\s*:/u.test(serialized), false, 'no password field is exposed')
assert.equal(/postgresql:\/\/|mysql:\/\/|oracle:\/\//u.test(serialized), false, 'no connection string is exposed')
console.log(`HOST OK: ${listing.connections.map(item => `${item.name}(${item.driver})`).join(', ')}`)

const captured = []
globalThis.window = { __ModuleLoader__: { load: spec => captured.push(spec) } }
const noop = () => null
const reactStub = { useState: value => [value, () => {}], useEffect: () => {}, useCallback: fn => fn }
const require = specifier => {
  if (specifier === 'react') return reactStub
  if (specifier === 'react/jsx-runtime') return { jsx: noop, jsxs: noop, Fragment: 'Fragment' }
  throw new Error(`the client bundle must not require ${specifier}`)
}
await import('./client.js')
assert.equal(captured.length, 1, 'the bundle registers exactly one module')
assert.equal(captured[0].id, manifest.name, 'bundle id matches the package name')
const client = captured[0].factory(require)
assert.equal(typeof client.apply, 'function', 'client exports apply')
assert.deepEqual([...client.inject].sort(), ['locale', 'remote', 'remote.commands', 'sidebarRightTabs', 'slots'])
console.log('CLIENT OK: bundle evaluates and exposes inject/apply')
