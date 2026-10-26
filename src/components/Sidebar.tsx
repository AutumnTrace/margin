import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { newDocument, previewElement, removeDocument } from '../actions'
import { editor, useCursor } from '../editor/bridge'
import type { Heading } from '../lib/markdown'
import { snippet, timeAgo } from '../lib/stats'
import { useStore } from '../store'
import { Icon } from './Icon'

function Files({ onPick }: { onPick: () => void }) {
  const docs = useStore((s) => s.docs)
  const activeId = useStore((s) => s.activeId)
  const select = useStore((s) => s.select)
  const duplicate = useStore((s) => s.duplicate)
  const linked = useStore((s) => s.linked)
  const [query, setQuery] = useState('')

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...docs].sort((a, b) => b.updatedAt - a.updatedAt).filter((d) => !q || d.name.toLowerCase().includes(q) || d.content.toLowerCase().includes(q))
  }, [docs, query])

  return (
    <>
      <div className="flex gap-1.5 px-3 pt-3 pb-2">
        <label className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[4px] border border-line bg-raised px-2.5 focus-within:border-line-2">
          <Icon name="search" size={14} className="text-ink-3" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents"
            aria-label="Search documents"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            newDocument()
            onPick()
          }}
          aria-label="New document"
          title="New document (Alt N)"
          className="grid size-8 cursor-pointer place-items-center rounded-[4px] bg-ink text-bg transition-opacity hover:opacity-85"
        >
          <Icon name="plus" size={15} />
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto px-1.5 pb-3" aria-label="Documents">
        {shown.map((doc) => {
          const on = doc.id === activeId
          return (
            <li key={doc.id} className="group relative">
              <button
                type="button"
                onClick={() => {
                  select(doc.id)
                  onPick()
                }}
                aria-current={on ? 'true' : undefined}
                className={clsx(
                  'relative flex w-full cursor-pointer flex-col gap-0.5 rounded-[4px] py-2 pr-14 pl-3 text-left transition-colors',
                  on ? 'bg-raised shadow-[0_0_0_1px_var(--line)]' : 'hover:bg-line/60',
                )}
              >
                {on && <span aria-hidden className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-sm bg-accent" />}
                <span className="flex items-center gap-1.5 truncate font-mono text-[12.5px] text-ink">
                  {doc.name}
                  {linked[doc.id] && <Icon name="link" size={11} className="text-ink-3" />}
                </span>
                <span className="truncate text-[12px] text-ink-3">{snippet(doc.content)}</span>
                <span className="font-mono text-[10px] tracking-wide text-ink-3 uppercase">{timeAgo(doc.updatedAt)}</span>
              </button>
              <div className="absolute top-1.5 right-1.5 flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                <button type="button" className="tool !h-6 !min-w-6" aria-label={`Duplicate ${doc.name}`} title="Duplicate" onClick={() => duplicate(doc.id)}>
                  <Icon name="copy" size={13} />
                </button>
                <button type="button" className="tool !h-6 !min-w-6 hover:!text-danger" aria-label={`Delete ${doc.name}`} title="Delete" onClick={() => removeDocument(doc.id)}>
                  <Icon name="trash" size={13} />
                </button>
              </div>
            </li>
          )
        })}
        {!shown.length && <li className="px-3 py-6 text-center text-[12.5px] text-ink-3">Nothing matches “{query}”.</li>}
      </ul>
    </>
  )
}

function Outline({ headings, onPick }: { headings: Heading[]; onPick: () => void }) {
  const cursorLine = useCursor((s) => s.line) - 1
  const current = headings.findLast((h) => h.line <= cursorLine)
  if (!headings.length) {
    return <p className="px-4 py-6 text-[12.5px] leading-relaxed text-ink-3">No headings yet. Lines that start with # show up here.</p>
  }
  const min = Math.min(...headings.map((h) => h.level))
  return (
    <nav aria-label="Outline" className="flex-1 overflow-y-auto px-1.5 py-2">
      <ol>
        {headings.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              onClick={() => {
                editor.reveal(h.line)
                previewElement.current?.querySelector(`#${CSS.escape(h.id)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                onPick()
              }}
              style={{ paddingLeft: 12 + (h.level - min) * 14 }}
              className={clsx(
                'flex w-full cursor-pointer items-baseline gap-2 rounded-[3px] py-[5px] pr-2 text-left text-[13px] transition-colors hover:bg-line/60',
                h === current ? 'text-ink' : 'text-ink-2',
              )}
            >
              <span className={clsx('font-mono text-[10px]', h === current ? 'text-accent-ink' : 'text-ink-3')}>{'#'.repeat(h.level)}</span>
              <span className="truncate">{h.text || 'Untitled'}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function Sidebar({ headings, onPick }: { headings: Heading[]; onPick: () => void }) {
  const tab = useStore((s) => s.sidebarTab)
  const count = useStore((s) => s.docs.length)
  const setPrefs = useStore((s) => s.setPrefs)
  return (
    <aside aria-label="Library" className="flex h-full w-full flex-col bg-panel">
      <div role="tablist" aria-label="Sidebar" className="flex h-9 shrink-0 items-stretch gap-4 border-b border-line px-4">
        {(
          [
            ['files', 'Library', count],
            ['outline', 'Outline', headings.length],
          ] as const
        ).map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setPrefs({ sidebarTab: id })}
            className={clsx('ui-label -mb-px flex cursor-pointer items-center gap-1.5 border-b-2 transition-colors', tab === id ? 'border-accent !text-ink' : 'border-transparent hover:!text-ink-2')}
          >
            {label}
            <span className="text-ink-3">{String(n).padStart(2, '0')}</span>
          </button>
        ))}
      </div>
      {tab === 'files' ? <Files onPick={onPick} /> : <Outline headings={headings} onPick={onPick} />}
    </aside>
  )
}
