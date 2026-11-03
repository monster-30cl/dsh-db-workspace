/** Plugin registration and `/db-config` behaviour tests. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { apply, parseConfigCommand, resolveConfig, USAGE } from '../index.js'
import { redactSecrets } from '../probe.js'
import { makeDriverDirectory, writeConfig } from './helpers.mjs'

/**
 * Minimal Cordis-shaped context recording contributions.
 * @returns {{ ctx: object, tools: object[], commands: object[] }} Stub context and its registries.
 */
function stubContext() {
  const tools = []
  const commands = []
  const ctx = {
    tools: { register(definition) { tools.push(definition); return () => {} } },
    commands: { register(definition) { commands.push(definition); return () => {} } },
    effect(body) {
      const dispose = body()
      if (typeof dispose !== 'function') throw new Error('effect body must return a disposer')
      return dispose
    },
  }
  return { ctx, tools, commands }
}

/**
 * Build the plugin against a temporary connection file and driver directory.
 * @param {{ pgConnectError?: string, entries?: Record<string, unknown> }} [options] Fixture overrides.
 * @returns {{ tools: object[], commands: object[], configPath: string, directory: string }} Fixture.
 */
function fixture(options = {}) {
  const directory = makeDriverDirectory({ pgConnectError: options.pgConnectError })
  const configPath = writeConfig(directory, options.entries ?? {
    'demo-postgres': { driver: 'kingbase', dsn: 'postgresql://u:hunter2@h:54321/d' },
    'demo-oceanbase': { driver: 'oceanbase', host: 'h', port: 2883, user: 'u', password: 'secret', mode: 'oracle', database: 'd' },
  }, 'demo-postgres')
  const { ctx, tools, commands } = stubContext()
  apply(ctx, { configPath, driverDirectory: directory, testTimeoutMs: 4000 })
  return { tools, commands, configPath, directory }
}

const signal = new AbortController().signal

test('registers two connection tools and one command', () => {
  const { tools, commands } = fixture()
  assert.deepEqual(tools.map(tool => tool.name), ['db_connections', 'db_test_connection'])
  assert.deepEqual(commands.map(command => command.name), ['db-config'])
  assert.equal(commands[0].recordInput, false, 'the save payload must not enter the session log')
})

test('no query tool is registered', () => {
  const { tools } = fixture()
  const names = tools.map(tool => tool.name).join(',')
  assert.equal(/query|table|schema|sql/u.test(names), false)
})

test('defaults resolve to the DSH home and the connection file directory', () => {
  const resolved = resolveConfig({ configPath: 'F:/x/db-config.json' })
  assert.equal(resolved.driverDirectory, 'F:\\x')
  assert.equal(resolved.testTimeoutMs, 15_000)
  assert.throws(() => resolveConfig({ configPath: '' }), /configPath 必须是非空字符串/u)
  assert.throws(() => resolveConfig({ testTimeoutMs: 0 }), /testTimeoutMs 必须是/u)
  assert.throws(() => resolveConfig([]), /config 必须是对象/u)
})

test('db_connections lists aliases without credentials', async () => {
  const { tools, configPath } = fixture()
  const value = await tools[0].execute({}, { signal })
  assert.equal(value.configPath, configPath)
  assert.equal(value.default, 'demo-postgres')
  assert.deepEqual(value.connections.map(item => item.name), ['demo-postgres', 'demo-oceanbase'])
  const serialized = JSON.stringify(value)
  assert.equal(serialized.includes('hunter2'), false)
  assert.equal(serialized.includes('secret'), false)
  assert.equal(serialized.includes('postgresql://'), false)
})

test('db_test_connection opens and closes one connection', async () => {
  const { tools } = fixture()
  const value = await tools[1].execute({ env: 'demo-postgres' }, { signal })
  assert.deepEqual(value, { alias: 'demo-postgres', driver: 'kingbase', ok: true, message: '连接成功' })
})

test('a failing probe surfaces the driver message with secrets redacted', async () => {
  const { tools } = fixture({ pgConnectError: 'connrefused postgresql://u:hunter2@h:54321/d' })
  await assert.rejects(
    () => tools[1].execute({ env: 'demo-postgres' }, { signal }),
    (error) => {
      assert.match(error.message, /connrefused/u)
      assert.equal(error.message.includes('hunter2'), false)
      assert.match(error.message, /\[已隐藏\]/u)
      return true
    },
  )
})

test('redactSecrets hides both the password and the connection string', () => {
  const message = redactSecrets('failed postgresql://u:hunter2@h/d using hunter2', {
    dsn: 'postgresql://u:hunter2@h/d',
    password: 'hunter2',
  })
  assert.equal(message, 'failed [已隐藏] using [已隐藏]')
})

test('the db-config command answers list, test and mutations', async () => {
  const { commands, configPath } = fixture()
  const command = commands[0]

  const listed = await command.handler({ rawInput: 'list', signal })
  assert.equal(listed.kind, 'success')
  assert.deepEqual(JSON.parse(listed.text).connections.map(item => item.name), ['demo-postgres', 'demo-oceanbase'])

  const tested = await command.handler({ rawInput: 'test demo-postgres', signal })
  assert.equal(tested.kind, 'success')
  assert.equal(JSON.parse(tested.text).ok, true)

  const saved = await command.handler({
    rawInput: `save ${JSON.stringify({ name: 'demo-mysql', entry: { driver: 'mysql', dsn: 'mysql://u:p@h:3306/d' } })}`,
    signal,
  })
  assert.equal(saved.kind, 'success')
  assert.deepEqual(JSON.parse(saved.text).connections.map(item => item.name), ['demo-postgres', 'demo-oceanbase', 'demo-mysql'])
  assert.equal(JSON.parse(readFileSync(configPath, 'utf8')).databases['demo-mysql'].driver, 'mysql')

  const marked = await command.handler({ rawInput: 'default demo-oceanbase', signal })
  assert.equal(marked.kind, 'success')
  assert.equal(JSON.parse(marked.text).default, 'demo-oceanbase')

  const removed = await command.handler({ rawInput: 'delete demo-mysql', signal })
  assert.equal(removed.kind, 'success')
  assert.deepEqual(JSON.parse(removed.text).connections.map(item => item.name), ['demo-postgres', 'demo-oceanbase'])
})

test('the db-config command tests a draft before it is stored', async () => {
  const { commands } = fixture()
  const result = await commands[0].handler({
    rawInput: `test-draft ${JSON.stringify({ driver: 'kingbase', dsn: 'postgresql://u:p@h:54321/d' })}`,
    signal,
  })
  assert.equal(result.kind, 'success')
  assert.equal(JSON.parse(result.text).ok, true)
})

test('a rejected save reports the validation message and leaves the file untouched', async () => {
  const { commands, configPath } = fixture()
  const before = readFileSync(configPath, 'utf8')
  const result = await commands[0].handler({
    rawInput: `save ${JSON.stringify({ name: 'bad alias', entry: { driver: 'mysql', dsn: 'mysql://h/d' } })}`,
    signal,
  })
  assert.equal(result.kind, 'error')
  assert.match(result.text, /别名需以字母或数字开头/u)
  assert.equal(readFileSync(configPath, 'utf8'), before)
})

test('the db-config command reports usage for unknown actions', async () => {
  const { commands } = fixture()
  const result = await commands[0].handler({ rawInput: 'explode', signal })
  assert.equal(result.kind, 'error')
  assert.equal(result.text, USAGE)
})

test('parseConfigCommand keeps a JSON payload with spaces intact', () => {
  const parsed = parseConfigCommand(`save ${JSON.stringify({ name: 'a', oldName: 'b', entry: { driver: 'mysql', dsn: 'x y z' } })}`)
  assert.equal(parsed.action, 'save')
  assert.equal(parsed.name, 'a')
  assert.equal(parsed.oldName, 'b')
  assert.equal(parsed.entry.dsn, 'x y z')
})

test('parseConfigCommand rejects missing aliases and bad JSON', () => {
  assert.throws(() => parseConfigCommand('test'), /缺少别名/u)
  assert.throws(() => parseConfigCommand('save'), /缺少 JSON 参数/u)
  assert.throws(() => parseConfigCommand('save {oops}'), /不是合法 JSON/u)
  assert.throws(() => parseConfigCommand('save []'), /必须是 JSON 对象/u)
  assert.deepEqual(parseConfigCommand('   '), { action: 'list' })
})
