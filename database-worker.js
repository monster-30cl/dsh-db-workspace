/** Private IPC worker; no connection credentials are placed on the command line. */
import { readDatabase } from './query.js'
import { probeConnection } from './probe.js'
process.once('message', async ({ entry, options, request }) => {
  try {
    const value = request.kind === 'probe'
      ? await probeConnection(entry, options, undefined, options.testTimeoutMs)
      : await readDatabase(entry, options, request)
    process.send?.({ ok: true, value })
  } catch (cause) { process.send?.({ ok: false, error: cause instanceof Error ? cause.message : '数据库操作失败' }) }
})
