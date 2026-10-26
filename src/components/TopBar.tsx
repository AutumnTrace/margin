import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { copyShareLink, exportHtml, exportMarkdown, exportPdf, openFiles, saveToDisk } from '../actions'
import { keyLabel } from '../lib/keys'
import { timeAgo } from '../lib/stats'
import type { Doc } from '../lib/storage'
import { useActiveDoc, useStore, type View } from '../store'
import { Icon, Logo, type IconName } from './Icon'
import { Menu } from './Menu'

const VIEWS: { id: View; label: string; icon: IconName; key: string }[] = [
  { id: 'write', label: 'Write', icon: 'pen', key: 'Alt+1' },
  { id: 'split', label: 'Split', icon: 'split', key: 'Alt+2' },
  { id: 'read', label: 'Read', icon: 'eye', key: 'Alt+3' },
]

function DocName() {
  const doc = useActiveDoc()
  // Keyed by name so an outside rename resets the draft.
  return doc ? <DocNameInput key={doc.id + doc.name} doc={doc} /> : null
}

function DocNameInput({ doc }: { doc: Doc }) {
  const rename = useStore((s) => s.rename)
  const linked = useStore((s) => s.linked[doc.id])
  const [draft, setDraft] = useState(doc.name)

  const commit = () => {
    if (draft.trim() && draft !== doc.name) rename(doc.id, draft)
    else setDraft(doc.name)
  }
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon name="file" size={15} className="text-ink-3" />
      <input
        aria-label="Document name"
        value={draft}
        size={Math.max(8, draft.length)}
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setDraft(doc.name)
            requestAnimationFrame(() => (e.target as HTMLInputElement).blur())
          }
        }}
        className="min-w-0 max-w-[32ch] truncate rounded-[3px] border border-transparent bg-transparent px-1.5 py-[3px] font-mono text-[13px] text-ink outline-none hover:border-line focus:border-line-2 focus:bg-raised"
      />
      {linked && (
        <span title={`Ctrl S writes to ${linked} on disk`} className="hidden items-center gap-1 rounded-full border border-line px-2 py-px font-mono text-[10.5px] text-ink-3 lg:flex">
          <Icon name="link" size={11} /> on disk
        </span>
      )}
    </div>
  )
}

function SaveStatus() {
  const state = useStore((s) => s.saveState)
  const at = useStore((s) => s.lastSavedAt)
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])
  const text = state === 'saving' ? 'Saving' : state === 'error' ? 'Not saved' : at ? `Saved ${timeAgo(at)}` : 'Saved'
  return (
    <span role="status" className="hidden items-center gap-2 font-mono text-[11px] text-ink-3 md:flex" title="Saved in this browser (IndexedDB)">
      <span
        className={clsx(
          'size-[7px] rounded-full transition-colors',
          state === 'saving' ? 'animate-pulse bg-ink-3' : state === 'error' ? 'bg-danger' : 'bg-accent shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_25%,transparent)]',
        )}
      />
      {text}
    </span>
  )
}

export function ViewSwitch({ compact }: { compact?: boolean }) {
  const view = useStore((s) => s.view)
  const setPrefs = useStore((s) => s.setPrefs)
  const views = compact ? VIEWS.filter((v) => v.id !== 'split') : VIEWS
  return (
    <div role="radiogroup" aria-label="View" className="flex rounded-[4px] border border-line bg-bg p-[2px]">
      {views.map((v) => {
        const on = view === v.id || (compact && view === 'split' && v.id === 'write')
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={on}
            title={`${v.label} (${keyLabel(v.key)})`}
            onClick={() => setPrefs({ view: v.id })}
            className={clsx(
              'flex cursor-pointer items-center gap-1.5 rounded-[3px] px-2.5 py-[3px] text-[12px] font-medium transition-colors',
              on ? 'bg-raised text-ink shadow-[0_1px_0_var(--line-2)]' : 'text-ink-3 hover:text-ink',
            )}
          >
            <Icon name={v.icon} size={13} />
            {compact ? <span className="sr-only">{v.label}</span> : v.label}
          </button>
        )
      })}
    </div>
  )
}

export function TopBar({ onPalette }: { onPalette: () => void }) {
  const sidebar = useStore((s) => s.sidebar)
  const toggleLibrary = useStore((s) => s.toggleLibrary)
  const theme = useStore((s) => s.theme)
  const setPrefs = useStore((s) => s.setPrefs)
  const themeIcon: IconName = theme === 'light' ? 'sun' : theme === 'dark' ? 'moon' : 'monitor'

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-panel px-2 md:gap-3 md:px-3">
      <button type="button" className="tool" aria-label="Toggle library" title={`Library (${keyLabel('Mod+\\')})`} aria-pressed={sidebar} onClick={toggleLibrary}>
        <Icon name="sidebar" />
      </button>
      <a href="./" className="hidden items-center gap-2 pr-1 text-ink no-underline sm:flex" aria-label="Margin home">
        <Logo />
        <span className="text-[15px] font-semibold tracking-[-0.02em]">Margin</span>
      </a>
      <span aria-hidden className="hidden h-5 w-px bg-line sm:block" />
      <DocName />

      <div className="mx-auto hidden md:block">
        <ViewSwitch />
      </div>
      <div className="ml-auto md:hidden">
        <ViewSwitch compact />
      </div>

      <div className="flex items-center gap-1 md:ml-0">
        <SaveStatus />
        <span aria-hidden className="mx-1 hidden h-5 w-px bg-line md:block" />
        <button type="button" className="tool hidden gap-2 px-2 md:inline-flex" onClick={onPalette} aria-label="Command palette" title="Command palette">
          <Icon name="command" size={15} />
          <span className="kbd">{keyLabel('Mod+K')}</span>
        </button>
        <button type="button" className="tool md:hidden" onClick={onPalette} aria-label="Command palette">
          <Icon name="command" />
        </button>
        <Menu
          label="Open, save and export"
          trigger={<Icon name="download" />}
          items={[
            { label: 'Open files…', icon: 'upload', hint: keyLabel('Mod+O'), run: () => void openFiles() },
            { label: 'Save to disk', icon: 'save', hint: keyLabel('Mod+S'), run: () => void saveToDisk() },
            { label: 'Download .md', icon: 'file', run: exportMarkdown },
            { label: 'Export HTML page', icon: 'code', run: () => void exportHtml() },
            { label: 'Export PDF', icon: 'download', hint: 'print', run: () => void exportPdf() },
          ]}
        />
        <button
          type="button"
          className="tool"
          aria-label={`Theme: ${theme}`}
          title={`Theme: ${theme}`}
          onClick={() => setPrefs({ theme: theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system' })}
        >
          <Icon name={themeIcon} />
        </button>
        <button
          type="button"
          onClick={() => void copyShareLink()}
          className="ml-1 flex h-[30px] cursor-pointer items-center gap-1.5 rounded-[4px] bg-accent px-3 text-[12.5px] font-semibold text-on-accent transition-[filter] hover:brightness-95"
        >
          <Icon name="share" size={14} />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>
    </header>
  )
}
