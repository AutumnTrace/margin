export interface Stats {
  words: number
  characters: number
  lines: number
  /** Whole minutes at 230 words a minute, at least 1 for any text. */
  readingMinutes: number
}

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu

export function countStats(text: string): Stats {
  const words = text.match(WORD)?.length ?? 0
  return {
    words,
    characters: text.length,
    lines: text === '' ? 1 : text.split('\n').length,
    readingMinutes: words ? Math.max(1, Math.round(words / 230)) : 0,
  }
}

/** "now", "5 min ago", "3 h ago", "2 d ago", then a date. */
export function timeAgo(then: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - then) / 1000))
  if (s < 45) return 'now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d} d ago`
  return new Date(then).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d > 300 ? 'numeric' : undefined })
}

/** First line of prose, for the library list. */
export function snippet(text: string, max = 90): string {
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
  for (const raw of body.split('\n')) {
    const line = raw
      .replace(/^\s{0,3}(#{1,6}\s|>\s?|[-*+]\s(\[[ xX]\]\s)?|\d+[.)]\s)/, '')
      .replace(/[*_`~]|!?\[([^\]]*)\]\([^)]*\)/g, (_, label?: string) => label ?? '')
      .trim()
    if (line && !/^(```|---|\|)/.test(line)) return line.length > max ? `${line.slice(0, max - 1)}…` : line
  }
  return 'Empty document'
}
