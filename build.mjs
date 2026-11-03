/**
 * Bundle the client half into the desktop module-loader wrapper.
 *
 * Run from this directory: `node build.mjs`. The desktop shell provides React
 * and its runtime through the module table, so they stay external; everything
 * else — including JSX helpers — is bundled.
 */
import { readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Locate the esbuild install used by the Harness checkout next to this package.
 * @returns {Promise<{ build: Function }>} The esbuild module namespace.
 */
async function loadEsbuild() {
  const candidates = [
    fileURLToPath(new URL('../zjlHarness/node_modules/.pnpm/', import.meta.url)),
    fileURLToPath(new URL('./node_modules/.pnpm/', import.meta.url)),
  ]
  for (const root of candidates) {
    if (!existsSync(root)) continue
    const versions = (await readdir(root)).filter(name => name.startsWith('esbuild@')).sort()
    const version = versions.at(-1)
    if (version === undefined) continue
    return import(new URL(`${version}/node_modules/esbuild/lib/main.js`, `file://${root}`))
  }
  throw new Error('esbuild is unavailable: install it here, or keep the Harness checkout beside this package')
}

const { build } = await loadEsbuild()
const directory = fileURLToPath(new URL('.', import.meta.url))
const result = await build({
  entryPoints: [directory + 'client/index.tsx'],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'],
  outfile: directory + 'client.js',
})
const script = result.outputFiles.find(file => file.path.endsWith('.js')).text
await writeFile(
  directory + 'client.js',
  `window.__ModuleLoader__.load({id:"@local/dsh-db-workspace",factory:(require)=>{var module={exports:{}};var exports=module.exports;${script}\nreturn module.exports;}});\n`,
)
