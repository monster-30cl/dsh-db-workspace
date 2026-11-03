/** Extract effective credentials without connecting to a database. Never log this value. */
export function credentialsOf(entry) {
  let user = '', password = ''
  try {
    const url = new URL(String(entry.dsn ?? '').replace(/^jdbc:/iu, '').replace(/^kingbase8?:/iu, 'postgresql:'))
    user = decodeURIComponent(url.username)
    password = decodeURIComponent(url.password)
  } catch { /* Explicit fields remain usable for structured connections. */ }
  return {
    user: typeof entry.user === 'string' && entry.user !== '' ? entry.user : user,
    password: typeof entry.password === 'string' && entry.password !== '' ? entry.password : password,
  }
}
