/** Connectivity probe: open one connection, close it, and never leak a credential in the message. */

import { createClient, rewritePostgresDsn } from './drivers.js'
import { credentialsOf } from './credentials.js'

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
  const dsnPassword = credentialsOf({ dsn: entry.dsn }).password
  let encodedDsnPassword = ''
  try { encodedDsnPassword = new URL(rewritePostgresDsn(String(entry.dsn ?? ''))).password } catch { /* Not a URL DSN. */ }
  const passwords = [entry.password, dsnPassword].filter(value => typeof value === 'string' && value.length > 0)
  const secrets = [...new Set([entry.dsn, encodedDsnPassword, ...passwords, ...passwords.map(value => encodeURIComponent(value))])]
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
  let timer
  let cancel
  const deadline = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`连接超时（${Math.round(timeoutMs / 1000)} 秒）`))
    }, timeoutMs)
    cancel = () => { reject(new Error('连接已取消')) }
    signal?.addEventListener('abort', cancel, { once: true })
  })
  try {
    const operation = Promise.resolve().then(async () => {
      const api = createClient(entry, options)
      const client = await api.connect()
      // Also close connections that arrive after timeout/cancellation. The
      // race bounds the entire operation, including an unresponsive end().
      await client.end()
      return { driver: api.driver, message: '连接成功' }
    })
    return await Promise.race([operation, deadline])
  } catch (cause) {
    const message = cause instanceof Error ? cause.message.split('\n')[0] : String(cause)
    throw new Error(redactSecrets(message, entry))
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', cancel)
  }
}
