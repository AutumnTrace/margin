import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  copyShareLink,
  cycleTheme,
  exportHtml,
  exportMarkdown,
  exportPdf,
  newDocument,
  openFiles,
  previewElement,
  removeDocument,
  restoreWelcome,
  saveToDisk,
} from '../actions'
import { editor } from '../editor/bridge'
import type { CommandName } from '../editor/commands'
import { fuzzyScore } from '../lib/fuzzy'
import { keyLabel } from '../lib/keys'
import type { Heading } from '../lib/markdown'
import { timeAgo } from '../lib/stats'
import { useStore } from '../store'
import { Icon, type IconName } from './Icon'

interface Entry {
  id: string
  group: 'Actions' | 'Insert' | 'Documents' | 'Headings'
  label: string
  hint?: string
  icon: IconName
  run: () => void
}

function actions(): Entry[] {
  const s = useStore.getState()
  const set = s.setPrefs
  const insert = (cmd: CommandName, label: string, icon: IconName): Entry => ({ id: `insert:${cmd}`, group: 'Insert', label, icon, run: () => editor.run(cmd) })
  return [
    { id: 'new', group: 'Actions', label: 'New document', hint: 'Alt+N', icon: 'plus', run: newDocument },
    { id: 'open', group: 'Actions', label: 'Open files…', hint: 'Mod+O', icon: 'upload', run: () => void openFiles() },
    { id: 'save', group: 'Actions', label: 'Save to disk', hint: 'Mod+S', icon: 'save', run: () => void saveToDisk() },
    { id: 'share', group: 'Actions', label: 'Copy share link', icon: 'share', run: () => void copyShareLink() },
    { id: 'export-md', group: 'Actions', label: 'Download as Markdown', icon: 'file', run: exportMarkdown },
    { id: 'export-html', group: 'Actions', label: 'Export as HTML page', icon: 'code', run: () => void exportHtml() },
    { id: 'export-pdf', group: 'Actions', label: 'Export as PDF', icon: 'download', run: () => void exportPdf() },
    { id: 'view-write', group: 'Actions', label: 'View: Write only', hint: 'Alt+1', icon: 'pen', run: () => set({ view: 'write' }) },
    { id: 'view-split', group: 'Actions', label: 'View: Split', hint: 'Alt+2', icon: 'split', run: () => set({ view: 'split' }) },
    { id: 'view-read', group: 'Actions', label: 'View: Read only', hint: 'Alt+3', icon: 'eye', run: () => set({ view: 'read' }) },
    { id: 'focus', group: 'Actions', label: s.focus ? 'Leave focus mode' : 'Focus mode', hint: 'Mod+.', icon: 'focus', run: () => set({ focus: !s.focus }) },
    { id: 'sidebar', group: 'Actions', label: s.sidebar ? 'Hide library' : 'Show library', hint: 'Mod+\\', icon: 'sidebar', run: () => set({ sidebar: !s.sidebar }) },
    { id: 'outline', group: 'Actions', label: 'Show outline', icon: 'outline', run: () => set({ sidebar: true, sidebarTab: 'outline' }) },
    { id: 'theme', group: 'Actions', label: `Theme: switch from ${s.theme}`, icon: 'moon', run: cycleTheme },
    { id: 'sync', group: 'Actions', label: s.syncScroll ? 'Turn scroll sync off' : 'Turn scroll sync on', icon: 'sync', run: () => set({ syncScroll: !s.syncScroll }) },
    ...(['sans', 'serif', 'mono'] as const).map(
      (f): Entry => ({ id: `font-${f}`, group: 'Actions', label: `Reading font: ${f[0]!.toUpperCase()}${f.slice(1)}`, icon: 'type', run: () => set({ readingFont: f }) }),
    ),
    { id: 'find', group: 'Actions', label: 'Find and replace', hint: 'Mod+F', icon: 'search', run: () => editor.view && import('@codemirror/search').then((m) => m.openSearchPanel(editor.view!)) },
    { id: 'delete', group: 'Actions', label: 'Delete this document', icon: 'trash', run: () => s.activeId && removeDocument(s.activeId) },
    { id: 'shortcuts', group: 'Actions', label: 'Keyboard shortcuts', hint: '?', icon: 'command', run: () => useStore.setState({ shortcuts: true }) },
    { id: 'welcome', group: 'Actions', label: 'Restore welcome guide', icon: 'restore', run: restoreWelcome },
    { id: 'source', group: 'Actions', label: 'View source on GitHub', icon: 'github', run: () => window.open('https://github.com/AutumnTrace/margin', '_blank', 'noopener') },
    insert('table', 'Insert table', 'table'),
    insert('codeBlock', 'Insert code block', 'code'),
    insert('math', 'Insert math block', 'sigma'),
    insert('diagram', 'Insert Mermaid diagram', 'diagram'),
    insert('task', 'Insert task list', 'task'),
    insert('rule', 'Insert divider', 'rule'),
  ]
}

/** Mounted only while open, so every opening starts with an empty query. */
export function CommandPalette({ onClose, headings }: { onClose: () => void; headings: Heading[] }) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const list = useRef<HTMLDivElement>(null)
  const docs = useStore((s) => s.docs)
  const activeId = useStore((s) => s.activeId)
  const select = useStore((s) => s.select)

  const entries = useMemo(() => {
    const all: Entry[] = [
      ...actions(),
      ...[...docs]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .filter((d) => d.id !== activeId)
        .map((d): Entry => ({ id: `doc:${d.id}`, group: 'Documents', label: d.name, hint: timeAgo(d.updatedAt), icon: 'file', run: () => select(d.id) })),
      ...headings.map(
        (h): Entry => ({
          id: `h:${h.id}`,
          group: 'Headings',
          label: `${'#'.repeat(h.level)} ${h.text}`,
          icon: 'heading',
          run: () => {
            editor.reveal(h.line)
            previewElement.current?.querySelector(`#${CSS.escape(h.id)}`)?.scrollIntoView({ block: 'start' })
          },
        }),
      ),
    ]
    if (!query.trim()) return all.filter((e) => e.group !== 'Headings' && e.group !== 'Insert')
    return all
      .map((e) => ({ e, score: fuzzyScore(query, e.label) }))
      .filter((r): r is { e: Entry; score: number } => r.score !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
      .map((r) => r.e)
  }, [query, docs, activeId, headings, select])

  useEffect(() => {
    list.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [index])

  const run = (entry: Entry | undefined) => {
    if (!entry) return
    onClose()
    // Let the palette unmount (and give focus back) before the action runs.
    requestAnimationFrame(entry.run)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setIndex((i) => (i + step + entries.length) % Math.max(entries.length, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(entries[index])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <button type="button" tabIndex={-1} aria-label="Close command palette" onClick={onClose} className="animate-fade absolute inset-0 cursor-default bg-[rgb(0_0_0/0.35)] backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="animate-rise relative w-full max-w-[580px] overflow-hidden rounded-[6px] border border-line-2 bg-raised shadow-[0_32px_80px_-24px_rgb(0_0_0/0.55)]"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Icon name="command" className="text-accent-ink" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIndex(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Type a command, a document or a heading…"
            aria-label="Search commands"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={entries[index] ? `palette-${index}` : undefined}
            className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
          />
          <span className="kbd">Esc</span>
        </div>
        <div id="palette-list" ref={list} role="listbox" aria-label="Commands" className="max-h-[min(420px,60vh)] overflow-y-auto p-1.5">
          {entries.map((entry, i) => {
            const header = entry.group !== entries[i - 1]?.group ? entry.group : null
            return (
              <div key={entry.id} role="presentation">
                {header && !query.trim() && <p className="ui-label px-2.5 pt-2.5 pb-1">{header}</p>}
                {/* Keyboard selection lives on the search box (combobox pattern), so options only need the mouse. */}
                {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus */}
                <div
                  id={`palette-${i}`}
                  role="option"
                  aria-selected={i === index}
                  data-index={i}
                  onMouseMove={() => setIndex(i)}
                  onClick={() => run(entry)}
                  className={clsx(
                    'relative flex cursor-pointer items-center gap-3 rounded-[3px] px-2.5 py-2 text-[13.5px]',
                    i === index ? 'bg-line text-ink' : 'text-ink-2',
                  )}
                >
                  {i === index && <span aria-hidden className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-sm bg-accent" />}
                  <Icon name={entry.icon} size={15} className={i === index ? 'text-ink' : 'text-ink-3'} />
                  <span className={clsx('min-w-0 flex-1 truncate', entry.group === 'Documents' && 'font-mono text-[12.5px]')}>{entry.label}</span>
                  {query.trim() && <span className="ui-label !text-[9.5px]">{entry.group}</span>}
                  {entry.hint && <span className="font-mono text-[10.5px] text-ink-3">{/^(Mod|Alt)/.test(entry.hint) ? keyLabel(entry.hint) : entry.hint}</span>}
                </div>
              </div>
            )
          })}
          {!entries.length && <p className="px-3 py-8 text-center text-[13px] text-ink-3">No matches.</p>}
        </div>
      </div>
    </div>
  )
}
