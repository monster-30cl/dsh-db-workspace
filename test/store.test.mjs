/** Connection-file write tests. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  deleteConnection,
  markDefault,
  normalizeAlias,
  normalizeEntry,
  saveConnection,
  writeConfigFile,
} from '../store.js'

const directory = mkdtempSync(join(tmpdir(), 'dsh-db-store-'))

test('an OceanBase entry keeps the stored password when the field is blank', () => {
  const previous = { driver: 'oceanbase', host: 'h', port: 2883, user: 'u', password: 'old', mode: 'oracle' }
  const entry = normalizeEntry({ driver: 'oceanbase', host: 'h2', port: '2883', user: 'u', password: '', mode: 'oracle' }, previous)
  assert.equal(entry.host, 'h2')
  assert.equal(entry.password, 'old')
})

test('an OceanBase entry requires host, user and password', () => {
  assert.throws(() => normalizeEntry({ driver: 'oceanbase', host: 'h' }, null), /需要主机、用户名和密码/u)
})

test('an OceanBase entry rejects an out-of-range port', () => {
  assert.throws(() => normalizeEntry({ driver: 'oceanbase', host: 'h', user: 'u', password: 'p', port: '70000' }, null), /端口必须是 1-65535/u)
})

test('a DSN driver keeps the stored connection string when the field is blank', () => {
  const previous = { driver: 'kingbase', dsn: 'postgresql://h/d', user: 'u', password: 'old' }
  const entry = normalizeEntry({ driver: 'kingbase', dsn: '', user: 'u', password: '' }, previous)
  assert.equal(entry.dsn, 'postgresql://h/d')
  assert.equal(entry.password, 'old')
})

test('a DSN driver requires a connection string for a new alias', () => {
  assert.throws(() => normalizeEntry({ driver: 'mysql' }, null), /请输入连接串/u)
})

test('a stored secret does not carry over when the driver changed', () => {
  const previous = { driver: 'mysql', dsn: 'mysql://h/d', password: 'old' }
  assert.throws(() => normalizeEntry({ driver: 'kingbase', dsn: '' }, previous), /请输入连接串/u)
})

test('an unsupported driver is rejected', () => {
  assert.throws(() => normalizeEntry({ driver: 'db2', dsn: 'x' }, null), /请选择受支持的驱动/u)
})

test('alias validation mirrors the standalone GUI', () => {
  assert.equal(normalizeAlias('demo-postgres'), 'demo-postgres')
  assert.throws(() => normalizeAlias('-bad'), /别名需以字母或数字开头/u)
  assert.throws(() => normalizeAlias('has space'), /别名/u)
})

test('saving a new alias sets it as the default when none exists', () => {
  const next = saveConnection({ default: null, databases: {} }, {
    name: 'demo-postgres',
    entry: { driver: 'kingbase', dsn: 'postgresql://h/d' },
  })
  assert.equal(next.default, 'demo-postgres')
  assert.equal(next.databases['demo-postgres'].driver, 'kingbase')
})

test('renaming keeps the stored secret and moves the default', () => {
  const config = {
    default: 'old',
    databases: { old: { driver: 'kingbase', dsn: 'postgresql://h/d', password: 'p' } },
  }
  const next = saveConnection(config, { name: 'new', oldName: 'old', entry: { driver: 'kingbase', dsn: '', password: '' } })
  assert.equal('old' in next.databases, false)
  assert.equal(next.databases.new.password, 'p')
  assert.equal(next.default, 'new')
})

test('a colliding alias is rejected', () => {
  const config = { default: 'a', databases: { a: { driver: 'kingbase', dsn: 'postgresql://h/d' }, b: { driver: 'kingbase', dsn: 'postgresql://h/e' } } }
  assert.throws(() => saveConnection(config, { name: 'b', entry: { driver: 'kingbase', dsn: 'postgresql://h/f' } }), /该别名已存在/u)
})

test('a stale rename target is rejected', () => {
  const config = { default: 'a', databases: { a: { driver: 'kingbase', dsn: 'postgresql://h/d' } } }
  assert.throws(() => saveConnection(config, { name: 'c', oldName: 'gone', entry: { driver: 'kingbase', dsn: 'postgresql://h/f' } }), /原连接不存在/u)
})

test('deleting the default promotes the first remaining alias', () => {
  const config = {
    default: 'a',
    databases: { a: { driver: 'kingbase', dsn: 'postgresql://h/d' }, b: { driver: 'mysql', dsn: 'mysql://h/d' } },
  }
  const next = deleteConnection(config, 'a')
  assert.deepEqual(Object.keys(next.databases), ['b'])
  assert.equal(next.default, 'b')
  const empty = deleteConnection({ default: 'b', databases: { b: { driver: 'mysql', dsn: 'mysql://h/d' } } }, 'b')
  assert.equal(empty.default, null)
})

test('deleting an unknown alias is rejected', () => {
  assert.throws(() => deleteConnection({ default: null, databases: {} }, 'nope'), /连接不存在/u)
})

test('marking the default validates the alias', () => {
  const config = { default: 'a', databases: { a: { driver: 'kingbase', dsn: 'postgresql://h/d' }, b: { driver: 'kingbase', dsn: 'postgresql://h/e' } } }
  assert.equal(markDefault(config, 'b').default, 'b')
  assert.throws(() => markDefault(config, 'c'), /连接不存在/u)
})

test('writing the file backs up the previous content', () => {
  const path = join(directory, 'db-config.json')
  writeFileSync(path, '{"default":null,"databases":{}}\n', 'utf8')
  writeConfigFile(path, { default: 'a', databases: { a: { driver: 'kingbase', dsn: 'postgresql://h/d' } } })
  assert.equal(existsSync(`${path}.bak`), true)
  assert.equal(JSON.parse(readFileSync(`${path}.bak`, 'utf8')).databases.a, undefined)
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).default, 'a')
  assert.equal(existsSync(`${path}.tmp`), false)
})

test('writing a new file creates its directory', () => {
  const path = join(directory, 'nested', 'config.json')
  writeConfigFile(path, { default: null, databases: {} })
  assert.equal(existsSync(path), true)
})
