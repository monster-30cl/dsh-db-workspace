import { fork } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { redactSecrets } from './probe.js'

/** Terminating the dedicated process closes its database sockets, even if end() hangs. */
export function runDatabase(entry, options, request, signal) {
  if (signal?.aborted) return Promise.reject(new Error('数据库操作已取消'))
  const lease = Math.min(options.connectionMaxLifetimeMs ?? 480_000, 480_000)
  const timeout = Math.min(request.kind === 'probe' ? options.testTimeoutMs : options.queryTimeoutMs, lease)
  return new Promise((resolve, reject) => {
    const child = fork(fileURLToPath(new URL('./database-worker.js', import.meta.url)), [], {
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true, serialization: 'advanced', execArgv: [],
    })
    let outcome
    const stop = result => {
      if (outcome) return
      outcome = result
      // Keep an OS-enforced upper bound; do not wait on driver rollback/end.
      child.kill('SIGKILL')
    }
    const timer = setTimeout(() => stop({ ok: false, error: '数据库操作超时，连接执行进程已终止；执行类操作结果可能不确定，禁止自动重试' }), timeout)
    const cancel = () => stop({ ok: false, error: '数据库操作已取消，连接执行进程已终止' })
    signal?.addEventListener('abort', cancel, { once: true })
    child.once('message', result => stop(result))
    child.once('error', () => stop({ ok: false, error: '数据库执行进程启动失败' }))
    child.once('close', () => {
      clearTimeout(timer); signal?.removeEventListener('abort', cancel)
      if (outcome?.ok) resolve(outcome.value)
      else reject(new Error(redactSecrets(outcome?.error ?? '数据库执行进程异常退出', entry)))
    })
    try { child.send({ entry, options: { ...options, queryTimeoutMs: timeout }, request }, error => { if (error) stop({ ok: false, error: '数据库执行请求发送失败' }) }) } catch { stop({ ok: false, error: '数据库执行请求发送失败' }) }
    if (signal?.aborted) cancel()
  })
}
