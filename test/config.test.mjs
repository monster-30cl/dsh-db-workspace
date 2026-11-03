/** Connection-file model tests. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describeEntry, describeEnvs, loadConfig, resolveEntry } from '../config.js'

const directory = mkdtempSync(join(tmpdir(), 'dsh-db-config-'))

test('a missing connection file is an empty configuration', () => {
  const config = loadConfig(join(directory, 'absent.json'))
  assert.deepEqual(config, { default: null, databases: {} })
})

test('unparseable content fails loud', () => {
  const path = join(directory, 'broken.json')
  writeFileSync(path, '{ not json', 'utf8')
  assert.throws(() => loadConfig(path), /DB_CONFIG_FAIL/u)
})

test('a file without databases fails loud', () => {
  const path = join(directory, 'shape.json')
  writeFileSync(path, JSON.stringify({ default: 'a' }), 'utf8')
  assert.throws(() => loadConfig(path), /缺少 databases 对象/u)
})

test('the file default resolves when no alias is given', () => {
  const path = join(directory, 'default.json')
  writeFileSync(path, JSON.stringify({
    default: 'demo-postgres',
    databases: { 'demo-postgres': { driver: 'kingbase', dsn: 'postgresql://u:p@h:5432/d' } },
  }), 'utf8')
  const resolved = resolveEntry(loadConfig(path), undefined)
  assert.equal(resolved.name, 'demo-postgres')
  assert.equal(resolved.entry.driver, 'kingbase')
})

test('an unknown alias lists the configured names', () => {
  const path = join(directory, 'unknown.json')
  writeFileSync(path, JSON.stringify({ default: null, databases: { a: { driver: 'pg' }, b: { driver: 'pg' } } }), 'utf8')
  assert.throws(() => resolveEntry(loadConfig(path), 'zzz'), /未找到库别名 "zzz"。已配置：a, b/u)
})

test('an empty configuration reports that no default exists', () => {
  assert.throws(() => resolveEntry(loadConfig(join(directory, 'none.json')), undefined), /没有默认库/u)
})

test('descriptions never carry credentials', () => {
  const entry = {
    driver: 'oceanbase',
    host: 'db.example.invalid',
    port: 2883,
    user: 'demo_user',
    password: 'super-secret',
    tenant: 'sns_ob_oracle',
    cluster: 'sns_cluster',
    database: 'demo_user',
    mode: 'oracle',
  }
  const description = describeEntry(entry)
  assert.equal(description.hasPassword, true)
  assert.equal(description.host, 'db.example.invalid')
  const serialized = JSON.stringify(description)
  assert.equal(serialized.includes('super-secret'), false)
  assert.equal('password' in description, false)
  assert.equal('dsn' in description, false)
})

test('environment listing marks the default alias', () => {
  const listing = describeEnvs({
    default: 'demo-postgres',
    databases: {
      'demo-postgres': { driver: 'kingbase', dsn: 'postgresql://h/d' },
      'demo-oceanbase': { driver: 'oceanbase', host: 'h' },
    },
  })
  assert.equal(listing.default, 'demo-postgres')
  assert.deepEqual(listing.envs.map(item => [item.name, item.isDefault]), [['demo-postgres', true], ['demo-oceanbase', false]])
  assert.equal(JSON.stringify(listing).includes('postgresql://'), false)
})
