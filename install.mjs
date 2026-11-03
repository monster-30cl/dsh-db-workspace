/**
 * Wire this package into a DSH profile: one `link:` dependency, one bundle
 * entry, and the matching junction under the profile's `node_modules`.
 *
 * Run: `node install.mjs [--dry-run] [--profile <name>] [--home <path>] [--profile-dir <path>]`.
 * The profile directory is resolved in this order: `--profile-dir`, `DSH_PROFILE_DIR`
 * (set by the launcher for the running app), `<home>/profiles/<name>`; and `<home>`
 * in this order: `--home`, `DSH_HOME`, `~/.dsh`.
 *
 * The edit is idempotent; re-running only reports the current state.
 */
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE = '@local/dsh-db-workspace'
const directory = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)

/**
 * Read one `--flag value` argument.
 * @param {string} flag Flag name including the leading dashes.
 * @returns {string | undefined} The value, or undefined when the flag is absent.
 * @throws {Error} When the flag is present without a value.
 */
function option(flag) {
  const index = argv.indexOf(flag)
  if (index < 0) return undefined
  const value = argv[index + 1]
  if (value === undefined || value.startsWith('--')) throw new Error(`${flag} 缺少取值`)
  return value
}

const dryRun = argv.includes('--dry-run')
const home = resolve(option('--home') ?? process.env.DSH_HOME ?? join(homedir(), '.dsh'))
const profileName = option('--profile') ?? process.env.DSH_PROFILE ?? 'desktop'
const profileDir = resolve(option('--profile-dir') ?? process.env.DSH_PROFILE_DIR ?? join(home, 'profiles', profileName))
const manifestPath = join(profileDir, 'package.json')
if (!existsSync(manifestPath)) throw new Error(`找不到 profile 清单：${manifestPath}`)

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
manifest.dependencies = manifest.dependencies ?? {}
manifest.dsh = manifest.dsh ?? {}
manifest.dsh.profile = manifest.dsh.profile ?? {}
manifest.dsh.profile.bundles = manifest.dsh.profile.bundles ?? []

const target = resolve(directory).replaceAll('\\', '/')
const changed = []

if (manifest.dependencies[PACKAGE] === undefined) {
  manifest.dependencies[PACKAGE] = `link:${target}`
  changed.push(`dependencies["${PACKAGE}"]`)
} else if (!String(manifest.dependencies[PACKAGE]).startsWith('link:')) {
  throw new Error(`profile 已用其他方式依赖 ${PACKAGE}：${manifest.dependencies[PACKAGE]}`)
}
if (!manifest.dsh.profile.bundles.includes(PACKAGE)) {
  manifest.dsh.profile.bundles.push(PACKAGE)
  changed.push('dsh.profile.bundles')
}

const linkPath = join(profileDir, 'node_modules', '@local', 'dsh-db-workspace')
const linkMissing = !existsSync(linkPath)
const scope = `profile ${JSON.stringify(profileName)} (${profileDir})`

if (changed.length === 0 && !linkMissing) {
  console.log(`ALREADY INSTALLED: ${scope}`)
} else if (dryRun) {
  console.log(`WOULD UPDATE ${scope}: ${[...changed, ...(linkMissing ? ['node_modules link'] : [])].join(', ')}`)
} else {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  if (linkMissing) {
    mkdirSync(dirname(linkPath), { recursive: true })
    symlinkSync(resolve(directory), linkPath, 'junction')
  }
  console.log(`INSTALLED ${scope}: ${[...changed, ...(linkMissing ? ['node_modules link'] : [])].join(', ')}`)
}
console.log(`重启 JoyinCode 后生效；行配置在 ${join(directory, 'cordis.patch.yml')}`)
