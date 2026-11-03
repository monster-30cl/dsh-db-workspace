/** Connection manager: list, add, edit, delete, set default, and test one connection. */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { DatabaseLocaleKey } from './locales.ts'

/** One stored connection as the Host describes it; credentials never reach the client. */
export interface ConnectionView {
  name: string
  isDefault: boolean
  driver: string
  host: string
  port: string | number
  user: string
  database: string
  tenant: string
  cluster: string
  mode: string
  hasDsn: boolean
  hasPassword: boolean
}

/** The connection file listing. */
export interface ConnectionListing {
  challenge?: string
  wrappedKey?: string
  iv?: string
  data?: string
  message?: string
  configPath?: string
  default?: string
  connections?: ConnectionView[]
}

/** Editable form state; `oldName` is empty for a new connection. */
interface Draft {
  name: string
  oldName: string
  driver: string
  dsn: string
  user: string
  password: string
  host: string
  port: string
  database: string
  tenant: string
  cluster: string
  mode: string
}

/** Props supplied by the slot, the locale, and this plugin's registration. */
export interface DatabasePageProps {
  sessionId?: string
  t: (key: DatabaseLocaleKey) => string
  runCommand: (sessionId: string, command: string) => Promise<string>
}

/** Drivers this plugin can talk to, in menu order. */
const DRIVERS = ['kingbase', 'postgres', 'mysql', 'oracle', 'oceanbase']

/** A blank draft, or one seeded from a stored connection. */
function draftOf(connection?: ConnectionView): Draft {
  return {
    name: connection?.name ?? '',
    oldName: connection?.name ?? '',
    driver: connection?.driver ?? 'kingbase',
    dsn: '',
    user: connection?.user ?? '',
    password: '',
    host: connection?.host ?? '',
    port: connection?.port === undefined || connection?.port === '' ? '' : String(connection.port),
    database: connection?.database ?? '',
    tenant: connection?.tenant ?? '',
    cluster: connection?.cluster ?? '',
    mode: connection?.mode === 'oracle' ? 'oracle' : 'mysql',
  }
}

/**
 * Project the form onto the entry the Host normalizes.
 * @param draft Current form state.
 * @returns Submitted entry fields; blank credentials mean "keep the stored value".
 */
function entryPayload(draft: Draft): Record<string, unknown> {
  const base: Record<string, unknown> = { driver: draft.driver }
  if (draft.driver === 'oceanbase') {
    return {
      ...base,
      host: draft.host.trim(),
      port: draft.port.trim(),
      user: draft.user.trim(),
      password: draft.password,
      tenant: draft.tenant.trim(),
      cluster: draft.cluster.trim(),
      database: draft.database.trim(),
      mode: draft.mode,
    }
  }
  return { ...base, dsn: draft.dsn.trim(), user: draft.user.trim(), password: draft.password }
}

/**
 * Turn one Host listing into page state.
 * @param value Parsed command result.
 * @param setConnections Connection setter.
 * @param setDefaultAlias Default-alias setter.
 */
function applyListing(
  value: ConnectionListing | undefined,
  setConnections: (rows: ConnectionView[]) => void,
  setDefaultAlias: (alias: string) => void,
): void {
  setConnections(Array.isArray(value?.connections) ? value.connections : [])
  setDefaultAlias(value?.default ?? '')
}

const paneCss = `
.db-workspace { --db-accent: #4678e8; --db-border: var(--dsw-alias-border-default, #8884); --db-muted: var(--dsw-alias-bg-secondary, #8881); box-sizing: border-box; container-type: inline-size; }
.db-workspace * { box-sizing: border-box; }
.db-workspace :is(button,input,select) { transition: border-color .15s, background .15s; }
.db-workspace button:hover:not(:disabled) { background: var(--db-muted) !important; border-color: var(--db-accent) !important; }
.db-workspace :is(button,input,select):focus-visible { outline: 2px solid var(--db-accent); outline-offset: 3px; }
.db-workspace :disabled { opacity: .45; cursor: not-allowed; }
.db-workspace input::placeholder { color: inherit; opacity: .45; }
.db-workspace .db-primary { background: var(--db-accent) !important; color: white !important; border-color: var(--db-accent) !important; font-weight: 600; }
.db-workspace .db-primary:hover:not(:disabled) { background: #3565d0 !important; }
.db-workspace .db-danger { color: #d75159 !important; }
.db-workspace .db-card:hover { border-color: var(--db-accent) !important; }
.db-workspace .db-expanded { border-color: var(--db-accent) !important; }
.db-workspace button[aria-expanded="true"] { color: var(--db-accent) !important; background: #4678e812 !important; border-color: var(--db-accent) !important; }
.db-workspace .db-default { border-left: 3px solid var(--db-accent) !important; }
.db-workspace .db-fields { display: grid; grid-template-columns: 1fr; gap: 14px; }
.db-workspace .db-wide { grid-column: 1 / -1; }
.db-workspace .db-status[data-tone="error"] { border-color: #d75159 !important; }
.db-workspace .db-status[data-tone="success"] { border-color: #30976b !important; }
@container (min-width: 460px) { .db-workspace .db-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: reduce) { .db-workspace * { transition: none !important; } }
`

const styles: Record<string, CSSProperties> = {
  root: {
    display: 'flex', flexDirection: 'column', gap: 20, height: '100%', minHeight: 0,
    padding: '24px 20px', overflowY: 'auto', color: 'var(--dsw-alias-label-primary)',
    font: '13px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  header: { display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 18, borderBottom: '1px solid var(--db-border)' },
  title: { margin: 0, fontSize: 20, fontWeight: 650, letterSpacing: '-.4px' },
  hint: { margin: 0, fontSize: 12, opacity: 0.7 },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  sectionTitle: { margin: 0, fontSize: 13, fontWeight: 600 },
  list: { display: 'flex', flexDirection: 'column', gap: 12, margin: 0, padding: 0, listStyle: 'none' },
  row: {
    display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 12,
    border: '1px solid var(--db-border)', background: 'var(--dsw-alias-bg-elevated)',
  },
  rowHead: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontWeight: 650, fontSize: 14, overflowWrap: 'anywhere', marginRight: 'auto' },
  badge: {
    padding: '2px 8px', borderRadius: 6, fontSize: 10,
    background: 'var(--dsw-alias-bg-secondary, rgba(0,0,0,0.08))', opacity: 0.9,
  },
  meta: { fontSize: 12, opacity: 0.75, overflowWrap: 'anywhere', fontFamily: 'ui-monospace, monospace' },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  form: {
    display: 'flex', flexDirection: 'column', gap: 18, padding: 18, borderRadius: 12,
    border: '1px solid var(--dsw-alias-border-default)', background: 'var(--dsw-alias-bg-elevated)',
  },
  inlineForm: { display: 'flex', flexDirection: 'column', gap: 18, marginTop: 4, paddingTop: 20, borderTop: '1px solid var(--db-border)' },
  formActions: { display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 14, borderTop: '1px solid var(--db-border)' },
  field: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  label: { fontSize: 12, opacity: 0.75 },
  input: {
    width: '100%', minWidth: 0, padding: '9px 11px', borderRadius: 8, border: '1px solid var(--db-border)',
    background: 'var(--dsw-alias-bg-primary, transparent)', color: 'inherit', font: 'inherit',
  },
  button: {
    padding: '7px 11px', borderRadius: 8, border: '1px solid var(--db-border)',
    background: 'var(--dsw-alias-bg-primary, transparent)', color: 'inherit', font: 'inherit', cursor: 'pointer',
  },
  status: { margin: 0, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--db-border)', fontSize: 12, overflowWrap: 'anywhere' },
  empty: { padding: '32px 16px', textAlign: 'center', border: '1px dashed var(--db-border)', borderRadius: 12 },
}


interface ConnectionEditorProps {
  connection?: ConnectionView
  embedded?: boolean
  visible: boolean
  sessionId?: string
  busy: boolean
  t: DatabasePageProps['t']
  invoke: (command: string) => Promise<ConnectionListing | undefined>
  mutate: (command: string, done: string, after?: () => void) => void
  probe: (command: string) => void
  setTone: (tone: 'info' | 'error' | 'success') => void
  setStatus: (message: string) => void
  fail: (cause: unknown) => void
  onClose: () => void
}

/** Each expanded card owns its draft and temporary credential display. */
function ConnectionEditor({ connection, embedded = false, visible, sessionId, busy, t, invoke, mutate, probe, setTone, setStatus, fail, onClose }: ConnectionEditorProps) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(connection))
  const [revealing, setRevealing] = useState(false)
  const [revealed, setRevealed] = useState('')
  const revealRequest = useRef(0)
  const passwordId = connection ? 'db-password-existing-' + encodeURIComponent(connection.name) : 'db-password-new'
  useEffect(() => {
    revealRequest.current++
    setRevealed(''); setRevealing(false)
    return () => { revealRequest.current++ }
  }, [draft, sessionId, visible])

  useEffect(() => {
    if (!revealed) return
    const hide = () => { setRevealed('') }
    const timer = window.setTimeout(hide, 20_000)
    window.addEventListener('blur', hide)
    document.addEventListener('visibilitychange', hide)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('blur', hide)
      document.removeEventListener('visibilitychange', hide)
    }
  }, [revealed])

  const reveal = async (): Promise<void> => {
    if (revealed) { setRevealed(''); return }
    if (!draft || revealing) return
    const request = ++revealRequest.current
    setRevealing(true); setTone('info'); setStatus(t('revealWaiting'))
    let deadline: number | undefined
    try {
      const result = await Promise.race([
        (async () => {
          const pair = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, false, ['encrypt', 'decrypt'])
          const publicKey = await crypto.subtle.exportKey('jwk', pair.publicKey)
          const challenge = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
          const value = await invoke(`/db-config reveal ${JSON.stringify({ alias: draft.oldName, publicKey, challenge })}`)
          if (!value || value.challenge !== challenge || !value.wrappedKey || !value.iv || !value.data) throw new Error(t('commandFailed'))
          const bytes = (text: string) => Uint8Array.from(atob(text), char => char.charCodeAt(0))
          const raw = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, pair.privateKey, bytes(value.wrappedKey))
          try {
            const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt'])
            return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(value.iv), additionalData: new TextEncoder().encode(challenge) }, key, bytes(value.data)))
          } finally { new Uint8Array(raw).fill(0) }
        })(),
        new Promise<never>((_, reject) => { deadline = window.setTimeout(() => { reject(new Error(t('revealTimeout'))) }, 70_000) }),
      ])
      if (request !== revealRequest.current) return
      setRevealed(result); setTone('success'); setStatus(t('revealShown'))
    } catch (cause) { if (request === revealRequest.current) fail(cause) }
    finally {
      if (deadline !== undefined) window.clearTimeout(deadline)
      if (request === revealRequest.current) setRevealing(false)
    }
  }


  const save = (): void => {
    if (draft === null) return
    const name = draft.name.trim()
    if (name === '') {
      setTone('error')
      setStatus(t('aliaseRequired'))
      return
    }
    const payload = { name, oldName: draft.oldName, entry: entryPayload(draft) }
    mutate(`/db-config save ${JSON.stringify(payload)}`, t('saved'), onClose)
  }

  const passwordField = () => {
    if (draft === null) return null
    const stored = connection
    return <div style={styles.field}>
      <label style={styles.label} htmlFor={passwordId}>{t('passwordLabel')}</label>
      <div style={{ display: 'flex', gap: 6 }}>
        <input id={passwordId} style={styles.input} type={revealed ? 'text' : 'password'} autoComplete="new-password" readOnly={!!revealed}
          value={revealed || draft.password} placeholder={stored?.hasPassword ? '••••••••' : ''} disabled={busy}
          onChange={event => { setDraft({ ...draft, password: event.target.value }) }} />
        <button type="button" style={{ ...styles.button, flexShrink: 0 }} disabled={busy || revealing || !stored?.hasPassword || draft.driver !== stored.driver || draft.password !== ''}
          title={t(revealed ? 'hidePassword' : 'revealAction')} aria-label={t(revealed ? 'hidePassword' : 'revealAction')} aria-pressed={!!revealed}
          onClick={() => { void reveal() }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
            {revealed && <path d="m3 3 18 18" />}
          </svg>
        </button>
      </div>
      <p style={styles.hint}>{t('revealHint')}</p>
    </div>
  }

  const input = (key: DatabaseLocaleKey, value: string, onChange: (next: string) => void, options?: {
    type?: string, placeholder?: string, disabled?: boolean,
  }) => <label style={styles.field}>
    <span style={styles.label}>{t(key)}</span>
    <input
      style={styles.input}
      type={options?.type ?? 'text'}
      value={value}
      disabled={busy || (options?.disabled ?? false)}
      placeholder={options?.placeholder}
      spellCheck={false}
      onChange={(event) => { onChange(event.target.value) }}
    />
  </label>


  return <form style={embedded ? styles.inlineForm : styles.form} onSubmit={event => { event.preventDefault(); if (!busy) save() }}>
      <h3 style={styles.sectionTitle}>{draft.oldName === '' ? t('newTitle') : t('editTitle')}</h3>
      <div className="db-fields">
      {input('aliasLabel', draft.name, value => { setDraft({ ...draft, name: value }) }, {
        disabled: draft.oldName !== '',
      })}
      <label style={styles.field}>
        <span style={styles.label}>{t('driverLabel')}</span>
        <select
          style={styles.input}
          disabled={busy}
          value={draft.driver}
          onChange={(event) => { setDraft({ ...draft, driver: event.target.value }) }}
        >
          {DRIVERS.map(driver => <option key={driver} value={driver}>{driver}</option>)}
        </select>
      </label>
      {draft.driver === 'oceanbase'
        ? <>
          {input('hostLabel', draft.host, value => { setDraft({ ...draft, host: value }) })}
          {input('portLabel', draft.port, value => { setDraft({ ...draft, port: value }) }, { placeholder: '2883' })}
          {input('userLabel', draft.user, value => { setDraft({ ...draft, user: value }) })}
          {passwordField()}
          {input('tenantLabel', draft.tenant, value => { setDraft({ ...draft, tenant: value }) })}
          {input('clusterLabel', draft.cluster, value => { setDraft({ ...draft, cluster: value }) })}
          {input('databaseLabel', draft.database, value => { setDraft({ ...draft, database: value }) })}
          <label style={styles.field}>
            <span style={styles.label}>{t('modeLabel')}</span>
            <select
              style={styles.input}
              disabled={busy}
              value={draft.mode}
              onChange={(event) => { setDraft({ ...draft, mode: event.target.value }) }}
            >
              <option value="mysql">{t('modeMysql')}</option>
              <option value="oracle">{t('modeOracle')}</option>
            </select>
          </label>
        </>
        : <>
          <div className="db-wide">{input('dsnLabel', draft.dsn, value => { setDraft({ ...draft, dsn: value }) }, {
            placeholder: draft.driver === 'oracle'
              ? 'oracle://user:pass@host:1521/service'
              : draft.driver === 'mysql'
                ? 'mysql://user:pass@host:3306/db'
                : 'postgresql://user:pass@host:54321/db',
          })}
          <p style={{ ...styles.hint, marginTop: 6 }}>{t('dsnHint')}</p></div>
          {input('userLabel', draft.user, value => { setDraft({ ...draft, user: value }) })}
          {passwordField()}
        </>}
      </div>
      {draft.oldName === '' ? null : <p style={styles.hint}>{t('passwordKeepHint')}</p>}
      <div style={styles.formActions}>
        <button
          type="button"
          style={styles.button}
          disabled={busy}
          onClick={() => {
            const payload = { ...entryPayload(draft), name: draft.name.trim() }
            probe(`/db-config test-draft ${JSON.stringify(payload)}`)
          }}
        >{t('testAction')}</button>
        <button type="submit" className="db-primary" style={styles.button} disabled={busy}>{t('saveAction')}</button>
        <button type="button" style={styles.button} disabled={busy} onClick={onClose}>
          {t('cancelAction')}
        </button>
      </div>
    </form>
}

/**
 * Render the connection manager.
 * @param props Slot props plus this plugin's command runner.
 * @returns The database pane.
 */
export function DatabasePage({ sessionId, t, runCommand }: DatabasePageProps) {
  const [connections, setConnections] = useState<ConnectionView[]>([])
  const [defaultAlias, setDefaultAlias] = useState('')
  const [editors, setEditors] = useState<Set<string>>(() => new Set())
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [newConnection, setNewConnection] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [tone, setTone] = useState<'info' | 'error' | 'success'>('info')
  const [search, setSearch] = useState('')
  const [deleteName, setDeleteName] = useState<string | null>(null)
  const visibleConnections = connections.filter(item =>
    [item.name, item.driver, item.host, item.database, item.user].join(' ').toLowerCase().includes(search.trim().toLowerCase()))

  const invoke = useCallback(async (command: string): Promise<ConnectionListing | undefined> => {
    if (sessionId === undefined) throw new Error(t('commandFailed'))
    const text = await runCommand(sessionId, command)
    try {
      return JSON.parse(text) as ConnectionListing
    } catch {
      return undefined
    }
  }, [runCommand, sessionId, t])

  const fail = (cause: unknown): void => {
    setTone('error')
    setStatus(cause instanceof Error ? cause.message : String(cause))
  }

  const refresh = useCallback(() => {
    setBusy(true)
    setTone('info')
    setStatus(t('loading'))
    void invoke('/db-config list').then((value) => {
      applyListing(value, setConnections, setDefaultAlias)
      setStatus('')
    }, fail).finally(() => { setBusy(false) })
  }, [invoke, t])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (status === '' || busy || tone === 'error') return
    const timer = window.setTimeout(() => { setStatus('') }, 6000)
    return () => { window.clearTimeout(timer) }
  }, [status, busy, tone])

  const mutate = (command: string, done: string, after?: () => void): void => {
    setBusy(true)
    setTone('info')
    setStatus(t('saving'))
    void invoke(command).then((value) => {
      applyListing(value, setConnections, setDefaultAlias)
      setTone('success')
      setStatus(done)
      after?.()
    }, fail).finally(() => { setBusy(false) })
  }

  const probe = (command: string): void => {
    setBusy(true)
    setTone('info')
    setStatus(t('testing'))
    void invoke(command).then((value) => {
      setTone('success')
      setStatus(value?.message ?? t('testOk'))
    }, fail).finally(() => { setBusy(false) })
  }

  const closeEditor = (name: string): void => {
    setEditors(current => { const next = new Set(current); next.delete(name); return next })
    setExpanded(current => { const next = new Set(current); next.delete(name); return next })
  }
  const editorProps = { sessionId, busy, t, invoke, mutate, probe, setTone, setStatus, fail }

  return <div className="db-workspace" style={styles.root} aria-busy={busy}>
    <style>{paneCss}</style>
    <div style={{ position: 'sticky', top: 0, height: 0, flexShrink: 0, zIndex: 100, pointerEvents: 'none' }}>
      {status === '' ? null : <div role={tone === 'error' ? 'alert' : 'status'} aria-atomic="true"
        className="db-status" data-tone={tone}
        style={{ ...styles.status, position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', gap: 12,
          alignItems: 'flex-start', pointerEvents: 'auto', borderLeftWidth: 4,
          background: 'var(--dsw-alias-bg-elevated, Canvas)', color: 'var(--dsw-alias-label-primary, CanvasText)',
          boxShadow: '0 6px 24px #0002' }}>
        <span style={{ flex: 1 }}>{status}</span>
        <button type="button" style={{ ...styles.button, padding: '0 5px', border: 0, background: 'transparent', flexShrink: 0 }}
          aria-label={t('dismissAction')} onClick={() => { setStatus('') }}>×</button>
      </div>}
    </div>
    <header style={styles.header}>
      <h2 style={styles.title}>{t('title')}</h2>
      <p style={styles.hint}>{t('description')}</p>
    </header>

    <div style={styles.sectionHead}>
      <h3 style={styles.sectionTitle}>{t('connectionsTitle')} <span style={styles.badge}>{connections.length}</span></h3>
      <div style={styles.actions}>
        <button type="button" style={styles.button} disabled={busy} onClick={refresh}>{t('refreshAction')}</button>
      <button
        type="button"
        style={styles.button}
        className="db-primary"
        disabled={busy || newConnection}
        onClick={() => { setNewConnection(true) }}
      >{t('addAction')}</button>
      </div>
    </div>
    {newConnection && <ConnectionEditor {...editorProps} visible onClose={() => { setNewConnection(false) }} />}
    {connections.length > 0 && <input style={styles.input} type="search" aria-label={t('searchPlaceholder')} placeholder={t('searchPlaceholder')} value={search} onChange={event => { setSearch(event.target.value) }} />}

    {connections.length > 0 && visibleConnections.length === 0 && <div style={styles.empty}><p style={styles.hint}>{t('noSearchResults')}</p></div>}
    {connections.length === 0
      ? <div style={styles.empty}>
          <h3 style={styles.sectionTitle}>{busy ? t('loading') : t('emptyList')}</h3>
          <p style={styles.hint}>{t('emptyHint')}</p>
        </div>
      : <ul style={styles.list}>
        {connections.map((item) => <li key={item.name} className={`db-card ${item.isDefault || item.name === defaultAlias ? 'db-default' : ''} ${expanded.has(item.name) ? 'db-expanded' : ''}`} style={{ ...styles.row, display: visibleConnections.some(row => row.name === item.name) ? 'flex' : 'none' }}>
          <div style={styles.rowHead}>
            <span style={styles.name}>{item.name}</span>
            <span style={styles.badge}>{item.driver}</span>
            {item.isDefault || item.name === defaultAlias ? <span style={styles.badge}>{t('defaultBadge')}</span> : null}
            <span style={styles.badge}>{item.hasPassword ? t('passwordStored') : t('noPassword')}</span>
          </div>
          <div style={styles.meta}>
            {[item.host, item.port, item.database, item.user].filter(part => part !== '' && part !== undefined).join(' · ')
              || (item.hasDsn ? t('dsnLabel') : '')}
          </div>
          <div style={styles.actions}>
            <button type="button" style={styles.button} disabled={busy} onClick={() => { probe(`/db-config test ${item.name}`) }}>
              {t('testAction')}
            </button>
            <button type="button" style={styles.button} disabled={busy}
              aria-expanded={expanded.has(item.name)} aria-controls={'db-editor-' + encodeURIComponent(item.name)}
              onClick={() => {
                setEditors(current => new Set(current).add(item.name))
                setExpanded(current => { const next = new Set(current); if (next.has(item.name)) next.delete(item.name); else next.add(item.name); return next })
              }}>
              {t(expanded.has(item.name) ? 'collapseAction' : 'editAction')}
            </button>
            <button
              type="button"
              style={styles.button}
              disabled={busy || item.isDefault || item.name === defaultAlias}
              onClick={() => { mutate(`/db-config default ${item.name}`, t('saved')) }}
            >{t('defaultAction')}</button>
            <button type="button" className="db-danger" style={{ ...styles.button, marginLeft: 'auto' }} disabled={busy} onClick={() => { setDeleteName(item.name) }}>
              {t('deleteAction')}
            </button>
          </div>
          {deleteName === item.name && <div style={styles.status} role="group" aria-label={t('deleteConfirm')}>
            <p style={{ margin: '0 0 10px' }}>{t('deleteConfirm')} <strong style={{ overflowWrap: 'anywhere' }}>{item.name}</strong></p>
            <div style={styles.actions}>
              <button type="button" className="db-danger" style={styles.button} disabled={busy} onClick={() => { mutate(`/db-config delete ${item.name}`, t('removed'), () => { setDeleteName(null); closeEditor(item.name) }) }}>{t('deleteAction')}</button>
              <button type="button" style={styles.button} disabled={busy} onClick={() => { setDeleteName(null) }}>{t('cancelAction')}</button>
            </div>
          </div>}
          {editors.has(item.name) && <div id={'db-editor-' + encodeURIComponent(item.name)} hidden={!expanded.has(item.name)}>
            <ConnectionEditor {...editorProps} connection={item} embedded visible={expanded.has(item.name) && visibleConnections.some(row => row.name === item.name)} onClose={() => { closeEditor(item.name) }} />
          </div>}
        </li>)} 
      </ul>}



  </div>
}
