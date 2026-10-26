import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'

const PREFIX = '#share='

export interface SharedDoc {
  name: string
  content: string
}

/** The whole document travels in the URL fragment, so sharing needs no server and the text never leaves the link. */
export function shareUrl(doc: SharedDoc, base = location.href): string {
  const url = new URL(base)
  url.hash = PREFIX.slice(1) + compressToEncodedURIComponent(JSON.stringify({ n: doc.name, c: doc.content }))
  return url.toString()
}

export function readShare(hash: string): SharedDoc | null {
  if (!hash.startsWith(PREFIX)) return null
  try {
    const json = decompressFromEncodedURIComponent(hash.slice(PREFIX.length))
    if (!json) return null
    const data: unknown = JSON.parse(json)
    if (!data || typeof data !== 'object') return null
    const { n, c } = data as { n?: unknown; c?: unknown }
    if (typeof c !== 'string') return null
    return { name: typeof n === 'string' && n.trim() ? n : 'shared.md', content: c }
  } catch {
    return null
  }
}
