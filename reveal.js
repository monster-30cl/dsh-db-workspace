import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { credentialsOf } from './credentials.js'
import { revealKey, encryptPassword } from './reveal-crypto.js'

let active = false
/** Native authentication receives no database secret; only encrypted results cross the command bridge. */
export async function revealPassword(entry, alias, signal, request) {
  const key = revealKey(request)
  if (process.platform !== 'win32') throw new Error('仅支持在 Windows 本机验证后查看密码。')
  if (active) throw new Error('已有密码验证窗口，请先关闭。')
  const credential = credentialsOf(entry)
  if (!credential.password) throw new Error('此连接未保存密码。')
  active = true
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
        ['-NoProfile', '-NonInteractive', '-STA', '-ExecutionPolicy', 'RemoteSigned', '-File', fileURLToPath(new URL('./reveal-password.ps1', import.meta.url))],
        { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], signal })
      let timedOut = false
      const deadline = setTimeout(() => { timedOut = true; child.kill() }, 60_000)
      let output = ''
      let policyBlocked = false
      // Inspect only known error identifiers; never return raw native stderr.
      child.stderr.setEncoding('utf8')
      child.stderr.on('data', chunk => { if (/PSSecurityException|UnauthorizedAccess|ScriptNotAllowed/u.test(chunk)) policyBlocked = true })
      child.stdout.setEncoding('utf8')
      child.stdout.on('data', chunk => { if (output.length < 100) output += chunk })
      child.on('error', () => { clearTimeout(deadline); reject(new Error('本机安全验证无法启动或已取消，已拒绝查看。')) })
      child.stdin.on('error', () => {})
      child.on('close', code => { clearTimeout(deadline); resolve(timedOut ? 'timeout' : policyBlocked ? 'policyBlocked' : code === 0 ? output.trim() : 'unavailable') })
      child.stdin.end(JSON.stringify({ alias }) + '\n')
    })
    const errors = {
      noPassword: '当前 Windows 账户未设置密码。请先在 Windows 设置 → 账户 → 登录选项中设置账户密码，然后重试；已拒绝查看。',
      unsupported: '无法确认当前账户的本机密码状态（仅支持本地 Windows 账户）。已拒绝查看。',
      cancelled: '已取消查看密码。',
      emptyCredential: 'Windows 未返回账户密码。请使用“密码”登录方式，不能使用 PIN 或指纹。',
      identityMismatch: '验证窗口选择的账户与当前运行 JoyinCode 的 Windows 账户不一致，已拒绝查看。',
      unavailable: '无法完成本机安全验证，已拒绝查看。',
      policyBlocked: '系统脚本策略阻止了本机验证组件，请联系管理员允许此组件运行；已拒绝查看。',
      compileFailed: 'Windows 本机验证组件加载失败，已拒绝查看。',
      accountCheckFailed: 'Windows 无法确认账户是否设置密码，已拒绝查看。请检查账户状态和登录权限。',
      promptFailed: 'Windows 凭据验证窗口启动失败，已拒绝查看。',
      nativeFailed: 'Windows 本机验证接口调用失败，已拒绝查看。',
      timeout: 'Windows 验证已超时（60 秒），窗口已关闭，请重试。',
    }
    if (result !== 'verified') throw new Error(authenticationError(result, errors))
    return encryptPassword(credential.password, key, request.challenge)
  } finally { active = false }
}

/** Only stage names and numeric Win32 codes may be surfaced; never native credential text. */
export function authenticationError(result, errors = {}) {
  const match = /^(unpack|logon):(\d{1,10})$/u.exec(result)
  if (!match) return errors[result] ?? errors.unavailable ?? '无法完成本机安全验证，已拒绝查看。'
  const code = Number(match[2])
  if (match[1] === 'unpack') return `Windows 凭据解析失败（错误码 ${code}），并非已确认密码错误。请使用账户“密码”方式验证。`
  const reasons = {
    1326: 'Windows 拒绝了此账户的登录凭据，请确认使用的是账户密码而非 PIN',
    1327: 'Windows 账户登录受到策略限制',
    1328: '当前时间不允许此账户登录',
    1329: '此账户不允许在本机登录',
    1330: 'Windows 账户密码已过期',
    1331: 'Windows 账户已禁用',
    1385: 'Windows 策略未授予此账户交互式登录权限',
    1793: 'Windows 账户已过期',
    1907: 'Windows 要求先修改账户密码',
    1909: 'Windows 账户已锁定，请稍后重试或联系管理员',
  }
  return `${reasons[code] ?? 'Windows 账户登录验证未通过'}（错误码 ${code}），已拒绝查看。`
}
