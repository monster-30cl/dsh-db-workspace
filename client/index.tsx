/** Right-sidebar database console owned by the same plugin as the Host tools. */

import { DatabasePage } from './DatabasePage.tsx'
import { en, zh } from './locales.ts'

export const inject = ['slots', 'locale', 'sidebarRightTabs', 'remote', 'remote.commands']

/** Locale namespace owned by this pane. */
const NS = 'db.workspace'

/** Stable tab id: the body slot is keyed by it. */
export const DB_PANE_ID = '@local/dsh-db-workspace/page'

/** Tab kind opened by the sidebar. */
export const DB_PANE_KIND = 'dbWorkspace'

/**
 * The bundle's tile artwork, drawn from the same shapes as `icon.svg` so the
 * Start page card and the installed-plugin row show one mark.
 * @returns The 20px tile.
 */
function DatabaseIcon() {
  return (
    <svg viewBox="0 0 64 64" width={20} height={20} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14" fill="#1D4ED8" />
      <ellipse cx="32" cy="19" rx="15" ry="6" fill="#FFFFFF" />
      <path d="M17 19v10c0 3.3 6.7 6 15 6s15-2.7 15-6V19c0 3.3-6.7 6-15 6s-15-2.7-15-6z" fill="#FFFFFF" opacity="0.86" />
      <path d="M17 33v10c0 3.3 6.7 6 15 6s15-2.7 15-6V33c0 3.3-6.7 6-15 6s-15-2.7-15-6z" fill="#FFFFFF" opacity="0.68" />
    </svg>
  )
}

/**
 * Register the tab type, its body, and the command bridge.
 * @param ctx Client context injecting the sidebar, slot, locale, and remote services.
 */
export function apply(ctx) {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'db: dictionaries')
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: DB_PANE_ID,
    kind: DB_PANE_KIND,
    priority: 'builtin',
    title: () => t('title'),
    guide: [{
      order: 32,
      title: () => t('title'),
      description: () => t('description'),
      icon: DatabaseIcon,
    }],
  }), 'db: right sidebar')
  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: DB_PANE_ID,
    locale: NS,
    inject: () => ({
      runCommand: async (sessionId, command) => {
        const result = await ctx.remote.commands.execute(sessionId, command, [])
        if (!result.ok) throw new Error(result.error.message)
        const outcome = result.value?.result
        if (outcome === undefined) throw new Error('command result missing')
        if (outcome.kind === 'error') throw new Error(outcome.text ?? t('commandFailed'))
        return outcome.text ?? ''
      },
    }),
  }, DatabasePage))
}
