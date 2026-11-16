/**
 * Driver-directory resolution, package detection, and on-demand installation.
 *
 * The plugin never bundles a database driver: `oracledb` is native, and the
 * versions that must match a running server are an operator choice. This module
 * answers three questions — where the driver packages live, which of them are
 * present, and how to install a missing one — and never loads a package into
 * the Host process; only `drivers.js` does that, per connection.
 *
 * A directory chosen in the panel is persisted in `db-workspace.settings.json`
 * beside the connection file and takes precedence over the deployment row and
 * the environment, so a device-local choice survives a restart without editing
 * the shipped patch.
 */

import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

/** Local settings file written next to the connection file. */
export const SETTINGS_FILE = 'db-workspace.settings.json'

/** Longest accepted install run, matching the panel's three-minute budget. */
export const INSTALL_TIMEOUT_MS = 180_000

/**
 * One row per connection type the plugin can drive.
 *
 * `kingbase` also covers the `postgres` and `pg` spellings, because all three
 * resolve to the same `pg` client; the panel therefore lists one row per
 * installable package set instead of one row per accepted `driver` value.
 */
export const DRIVER_PACKAGES = Object.freeze([
  { driver: 'kingbase', packages: Object.freeze(['pg', 'pg-connection-string']) },
  { driver: 'mysql', packages: Object.freeze(['mysql2']) },
  { driver: 'oracle', packages: Object.freeze(['oracledb']) },
  { driver: 'oceanbase', packages: Object.freeze(['oceanbase']) },
])

/**
 * Path of the settings file that belongs to one connection file.
 * @param {string} configPath Absolute path to the connection file.
 * @returns {string} Absolute path to the sibling settings file.
 */
function settingsPath(configPath) {
  return join(dirname(configPath), SETTINGS_FILE)
}

/**
 * Read the settings object, tolerating a missing or damaged file.
 *
 * A damaged settings file must never block activation: the deployment row is a
 * usable fallback, and the panel rewrites the file on the next save.
 * @param {string} configPath Absolute path to the connection file.
 * @returns {Record<string, unknown>} Parsed settings, or an empty object.
 */
function readSettings(configPath) {
  let text
  try {
    text = readFileSync(settingsPath(configPath), 'utf8')
  } catch {
    return {}
  }
  try {
    const parsed = JSON.parse(text)
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * Validate one directory argument.
 * @param {unknown} value Submitted directory.
 * @returns {string} Absolute directory path.
 * @throws {Error} When the value is not a non-empty string or resolves to a drive root.
 */
function directoryOf(value) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error('请选择驱动目录')
  const target = resolve(value.trim())
  if (dirname(target) === target) throw new Error('驱动目录不能是磁盘根目录')
  return target
}

/**
 * Resolve the driver directory: the panel's saved choice, else the caller's
 * default (deployment row, environment, or profile/home).
 * @param {string} configPath Absolute path to the connection file.
 * @param {string} fallback Directory resolved by the caller.
 * @returns {string} Absolute driver directory.
 */
export function loadDriverDirectory(configPath, fallback) {
  const saved = readSettings(configPath).driverDirectory
  if (typeof saved === 'string' && saved.trim() !== '') {
    try {
      return directoryOf(saved)
    } catch {
      // A saved value that is no longer usable falls back instead of failing
      // activation; the panel reports and rewrites it on the next save.
      return resolve(fallback)
    }
  }
  return resolve(fallback)
}

/**
 * Persist a panel-chosen driver directory and return the value to use.
 *
 * The directory is created when absent so the next install has a target, and
 * unrelated settings keys are preserved.
 * @param {string} configPath Absolute path to the connection file.
 * @param {unknown} directory Submitted directory.
 * @returns {string} Absolute driver directory now in effect.
 * @throws {Error} When the directory is invalid or cannot be created.
 */
export function saveDriverDirectory(configPath, directory) {
  const target = directoryOf(directory)
  mkdirSync(target, { recursive: true })
  const settings = readSettings(configPath)
  settings.driverDirectory = target
  writeFileSync(settingsPath(configPath), `${JSON.stringify(settings, null, 2)}\n`, 'utf8')
  return target
}

/**
 * Report, per driver row, which packages are missing from one directory.
 * @param {string} directory Directory whose `node_modules` supplies the drivers.
 * @returns {{ driver: string, packages: string[], missing: string[] }[]} One row per connection type.
 */
export function checkDrivers(directory) {
  const require = createRequire(join(resolve(directory), 'noop.cjs'))
  return DRIVER_PACKAGES.map((row) => ({
    driver: row.driver,
    packages: [...row.packages],
    missing: row.packages.filter(name => !isInstalled(require, name)),
  }))
}

/**
 * Test one package specifier without loading it.
 * @param {NodeRequire} require Directory-bound require function.
 * @param {string} name Package name.
 * @returns {boolean} Whether the package resolves from that directory.
 */
function isInstalled(require, name) {
  try {
    require.resolve(name)
    return true
  } catch {
    return false
  }
}

/**
 * Locate the npm executable required by an install.
 * @returns {string} Command name to spawn.
 * @throws {Error} When npm is absent or unusable.
 */
export function findNpm() {
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const probe = spawnSync(command, ['--version'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
    windowsHide: true,
    timeout: 15_000,
  })
  if (probe.error !== undefined || probe.status !== 0) {
    throw new Error('npm 不可用：请安装带 npm 的 Node.js，或手动在驱动目录执行 npm install')
  }
  return command
}

/**
 * Quote one argument for a shell-joined command line on Windows.
 * @param {string} value Raw argument.
 * @returns {string} Argument safe to join into a command string.
 */
function quote(value) {
  return /[\s"]/u.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value
}

/**
 * Run npm and capture its failure output.
 * @param {string} command npm command name.
 * @param {string[]} args Argument list.
 * @param {string} cwd Directory the install targets.
 * @param {AbortSignal} [signal] Cancellation signal.
 * @returns {Promise<void>} Resolves when npm exits successfully.
 * @throws {Error} On a non-zero exit, a timeout, or cancellation.
 */
function runNpm(command, args, cwd, signal) {
  return new Promise((resolveRun, rejectRun) => {
    if (signal?.aborted) {
      rejectRun(new Error('驱动安装已取消'))
      return
    }
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === 'win32',
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let settled = false
    let stderr = ''
    const finish = (failure) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      if (failure === undefined) resolveRun()
      else rejectRun(failure)
    }
    const onAbort = () => {
      child.kill()
      finish(new Error('驱动安装已取消'))
    }
    const timer = setTimeout(() => {
      child.kill()
      finish(new Error('DRIVER_INSTALL_TIMEOUT: 驱动安装超过 3 分钟已终止，可重新检测后重试'))
    }, INSTALL_TIMEOUT_MS)
    signal?.addEventListener('abort', onAbort, { once: true })
    child.stderr?.on('data', (chunk) => {
      if (stderr.length < 4_000) stderr += String(chunk)
    })
    child.on('error', (cause) => {
      finish(new Error(`DRIVER_INSTALL_FAIL: 无法启动 npm：${cause.message}`))
    })
    child.on('close', (code) => {
      if (code === 0) {
        finish()
        return
      }
      const detail = stderr.trim().split('\n').slice(-4).join(' ').trim()
      finish(new Error(`DRIVER_INSTALL_FAIL: npm 退出码 ${String(code)}${detail === '' ? '' : `：${detail}`}`))
    })
  })
}

/**
 * Install the packages of one driver row into the driver directory.
 *
 * Lifecycle scripts are disabled because driver packages are data-plane
 * dependencies, and a database credential is never part of this call.
 * @param {string} directory Target driver directory.
 * @param {unknown} driver Row name from {@link DRIVER_PACKAGES}.
 * @param {AbortSignal} [signal] Cancellation signal.
 * @returns {Promise<{ driver: string, packages: string[], missing: string[] }[]>} Fresh detection rows.
 * @throws {Error} When the row is unknown, npm is unavailable, or the install fails.
 */
export async function installDriver(directory, driver, signal) {
  const wanted = String(driver ?? '').toLowerCase()
  const row = DRIVER_PACKAGES.find(item => item.driver === wanted)
  if (row === undefined) throw new Error(`DRIVER_UNKNOWN: 不支持安装驱动 "${String(driver)}"`)
  const target = directoryOf(directory)
  mkdirSync(target, { recursive: true })
  const command = findNpm()
  const args = ['install', '--prefix', quote(target), '--ignore-scripts', '--no-audit', '--no-fund', ...row.packages]
  await runNpm(command, args, target, signal)
  return checkDrivers(target)
}
