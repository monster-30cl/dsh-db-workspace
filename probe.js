/** Connectivity probe: open one connection, close it, and never leak a credential in the message. */

import { createClient } from './drivers.js'

/** Replacement for any credential fragment that appears in a driver error. */
const REDACTED = '[已隐藏]'

/**
 * Replace stored secrets in a message so a driver that echoes the connection
 * string cannot write it into a command result or a session log.
 * @param {string} message Driver message.
 * @param {Record<string, unknown>} entry Connection entry.
 * @returns {string} Redacted message.
 */
export function redactSecrets(message, entry) {
  const secrets = [entry.password, entry.dsn]
    .filter(value => typeof value === 'string' && value.length > 0)
    .map(String)
    // Longest first: the connection string contains the password, and replacing
    // the password inside it first would leave the rest of the string visible.
    .sort((left, right) => right.length - left.length)
  let output = message
  for (const secret of secrets) output = output.split(secret).join(REDACTED)
  return output
}

/**
 * Open and immediately close one connection.
 * @param {Record<string, unknown>} entry Connection entry.
 * @param {{ driverDirectory: string, connectTimeoutMs: number }} options Resolved driver options.
 * @param {AbortSignal | undefined} signal Caller cancellation.
 * @param {number} timeoutMs Probe deadline in milliseconds.
 * @returns {Promise<{ driver: string, message: string }>} Driver name and success text.
 * @throws {Error} When the connection fails or the deadline elapses.
 */
export async function probeConnection(entry, options, signal, timeoutMs) {
  if (signal?.aborted === true) throw new Error('连接已取消')
  const api = createClient(entry, options)
  let timedOut = false
  let timer
  const deadline = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      timedOut = true
      reject(new Error(`连接超时（${Math.round(timeoutMs / 1000)} 秒）`))
    }, timeoutMs)
  })
  const connecting = api.connect()
  connecting.then((client) => {
    if (timedOut) void client.end().catch(() => {})
  }, () => {})
  try {
    const client = await Promise.race([connecting, deadline])
    await client.end()
    return { driver: api.driver, message: '连接成功' }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message.split('\n')[0] : String(cause)
    throw new Error(redactSecrets(message, entry))
  } finally {
    clearTimeout(timer)
  }
}
