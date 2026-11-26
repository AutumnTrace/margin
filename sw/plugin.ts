import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

// Files in public/ that the shell needs; they are copied as-is and are not part of the bundle.
const PUBLIC_SHELL = ['favicon.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png']
const PLACEHOLDER = "const BUILD = { version: 'dev', shell: [], files: [] }"

interface ChunkLike {
  type: 'chunk'
  fileName: string
  isEntry: boolean
  imports: string[]
  viteMetadata?: { importedCss: Set<string> }
}
type BundleLike = Record<string, ChunkLike | { type: 'asset'; fileName: string }>

/**
 * The app shell is the entry chunk and everything it imports statically, with their CSS.
 * Dynamic imports (Mermaid, language packs) and the fonts are left to be cached on first use.
 */
export function planCache(bundle: BundleLike, publicHash = '') {
  const chunks = Object.values(bundle).filter((f): f is ChunkLike => f.type === 'chunk')
  const byName = new Map(chunks.map((c) => [c.fileName, c]))
  const shell = new Set<string>(['./', ...PUBLIC_SHELL])
  const visit = (chunk: ChunkLike | undefined) => {
    if (!chunk || shell.has(chunk.fileName)) return
    shell.add(chunk.fileName)
    chunk.viteMetadata?.importedCss.forEach((css) => shell.add(css))
    chunk.imports.forEach((name) => visit(byName.get(name)))
  }
  chunks.filter((c) => c.isEntry).forEach(visit)

  const files = Object.values(bundle)
    .map((f) => f.fileName)
    .filter((name) => name !== 'index.html' && !name.endsWith('.map'))
    .sort()
  const version = createHash('sha256').update(files.join('\n')).update(publicHash).digest('hex').slice(0, 12)
  return { version, shell: [...shell], files }
}

/** Emits sw.js next to index.html, with this build's version and file lists baked in. */
export function serviceWorker(): Plugin {
  let publicDir = ''
  return {
    name: 'margin:service-worker',
    apply: 'build',
    configResolved(config) {
      publicDir = config.publicDir
    },
    generateBundle(_, bundle) {
      // Public files are not content-hashed, so their bytes go into the version too.
      const publicHash = createHash('sha256')
      for (const name of PUBLIC_SHELL) publicHash.update(readFileSync(join(publicDir, name)))
      const source = readFileSync(new URL('./worker.js', import.meta.url), 'utf8')
      if (!source.includes(PLACEHOLDER)) this.error('sw/worker.js: BUILD placeholder not found')
      const plan = planCache(bundle as unknown as BundleLike, publicHash.digest('hex'))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: source.replace(PLACEHOLDER, `const BUILD = ${JSON.stringify(plan)}`) })
    },
  }
}
