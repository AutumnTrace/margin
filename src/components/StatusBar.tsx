import { useMemo } from 'react'
import { useCursor } from '../editor/bridge'
import { countStats } from '../lib/stats'
import { useActiveDoc } from '../store'

export function StatusBar() {
  const doc = useActiveDoc()
  const { line, col } = useCursor()
  const content = doc?.content ?? ''
  const stats = useMemo(() => countStats(content), [content])
  const cells = [
    `${stats.words.toLocaleString()} words`,
    `${stats.characters.toLocaleString()} chars`,
    `${stats.lines.toLocaleString()} lines`,
    stats.readingMinutes ? `${stats.readingMinutes} min read` : null,
  ].filter(Boolean)

  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-line bg-panel px-3 font-mono text-[10.5px] tracking-wide text-ink-3 uppercase">
      <span className="flex min-w-0 items-center gap-4 truncate" aria-live="polite">
        {cells.map((c, i) => (
          <span key={i} className={i > 1 ? 'hidden sm:inline' : undefined}>
            {c}
          </span>
        ))}
      </span>
      <span className="ml-auto flex items-center gap-4 whitespace-nowrap">
        <span>
          Ln {line}, Col {col}
        </span>
        <span className="hidden sm:inline">UTF-8</span>
        <span className="hidden items-center gap-1.5 sm:flex">
          <span aria-hidden className="size-1.5 bg-accent" />
          Markdown
        </span>
      </span>
    </footer>
  )
}
