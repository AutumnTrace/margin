import clsx from 'clsx'
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { newDocument, openFiles, saveToDisk } from './actions'
import { CommandPalette } from './components/CommandPalette'
import { EditorPane } from './components/EditorPane'
import { Icon, Logo } from './components/Icon'
import { PreviewPane } from './components/PreviewPane'
import { Sidebar } from './components/Sidebar'
import { StatusBar } from './components/StatusBar'
import { Toasts } from './components/Toasts'
import { TopBar } from './components/TopBar'
import { readFiles } from './lib/files'
import { keyLabel, matches } from './lib/keys'
import { render } from './lib/markdown'
import { readShare } from './lib/share'
import { flushSaves, toast, useActiveDoc, useStore } from './store'

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => matchMedia(query).matches,
  )
}

function useTheme(): 'light' | 'dark' {
  const pref = useStore((s) => s.theme)
  const systemDark = useMedia('(prefers-color-scheme: dark)')
  useEffect(() => {
    if (pref === 'system') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = pref
  }, [pref])
  return pref === 'system' ? (systemDark ? 'dark' : 'light') : pref
}

/** Opens a document shared by link (#share=…), once, and cleans the URL. */
async function importShared() {
  const shared = readShare(location.hash)
  if (!location.hash.startsWith('#share=')) return
  history.replaceState(null, '', location.pathname + location.search)
  if (!shared) return toast('That share link is damaged or incomplete')
  const { docs, select, create } = useStore.getState()
  const existing = docs.find((d) => d.content === shared.content)
  if (existing) {
    select(existing.id)
    toast(`Already in your library as ${existing.name}`)
  } else {
    create(shared)
    toast(`Opened shared document ${shared.name}. It's saved in your library.`)
  }
}

function Splitter({ container }: { container: React.RefObject<HTMLDivElement | null> }) {
  const split = useStore((s) => s.split)
  const setPrefs = useStore((s) => s.setPrefs)
  const clamp = (v: number) => Math.min(0.8, Math.max(0.2, v))

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault()
    const box = container.current!.getBoundingClientRect()
    const move = (ev: PointerEvent) => setPrefs({ split: clamp((ev.clientX - box.left) / box.width) })
    const up = () => {
      window.removeEventListener('pointermove', move)
      document.body.style.cursor = ''
    }
    document.body.style.cursor = 'col-resize'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panes"
      aria-valuenow={Math.round(split * 100)}
      aria-valuemin={20}
      aria-valuemax={80}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDoubleClick={() => setPrefs({ split: 0.5 })}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') setPrefs({ split: clamp(split + (e.key === 'ArrowLeft' ? -0.02 : 0.02)) })
      }}
      title="Drag to resize, double-click to reset"
      className="group relative z-10 w-px shrink-0 cursor-col-resize bg-line outline-none"
    >
      <span className="absolute inset-y-0 -left-[3px] w-[7px] transition-colors group-hover:bg-accent/60 group-focus-visible:bg-accent group-active:bg-accent" />
    </div>
  )
}

export default function App() {
  const ready = useStore((s) => s.ready)
  const view = useStore((s) => s.view)
  const sidebarPref = useStore((s) => s.sidebar)
  const drawer = useStore((s) => s.drawer)
  const focus = useStore((s) => s.focus)
  const split = useStore((s) => s.split)
  const setPrefs = useStore((s) => s.setPrefs)
  const doc = useActiveDoc()
  const theme = useTheme()
  const mobile = useMedia('(max-width: 767px)')
  const [palette, setPalette] = useState(false)
  const [dragging, setDragging] = useState(false)
  const panes = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void useStore
      .getState()
      .init()
      .then(importShared)
      .catch(() => toast('Could not open the library. Is storage blocked for this site?'))
    window.addEventListener('hashchange', importShared)
    const hide = () => document.visibilityState === 'hidden' && flushSaves()
    document.addEventListener('visibilitychange', hide)
    window.addEventListener('pagehide', flushSaves)
    return () => {
      window.removeEventListener('hashchange', importShared)
      document.removeEventListener('visibilitychange', hide)
      window.removeEventListener('pagehide', flushSaves)
    }
  }, [])

  // Rendering trails typing slightly on big documents instead of blocking keystrokes.
  const content = useDeferredValue(doc?.content ?? '')
  const rendered = useMemo(() => render(content), [content])

  const name = doc?.name
  useEffect(() => {
    document.title = name ? `${name} · Margin` : 'Margin'
  }, [name])

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const shortcuts: [string, () => void][] = [
        ['Mod+K', () => setPalette((p) => !p)],
        ['Mod+S', () => void saveToDisk()],
        ['Mod+O', () => void openFiles()],
        ['Alt+N', newDocument],
        ['Alt+1', () => setPrefs({ view: 'write' })],
        ['Alt+2', () => setPrefs({ view: 'split' })],
        ['Alt+3', () => setPrefs({ view: 'read' })],
        ['Mod+\\', () => useStore.getState().toggleLibrary()],
        ['Mod+.', () => setPrefs({ focus: !useStore.getState().focus })],
      ]
      for (const [combo, run] of shortcuts) {
        if (matches(e, combo)) {
          e.preventDefault()
          run()
          return
        }
      }
      if (e.key === 'Escape' && useStore.getState().focus && !palette) setPrefs({ focus: false })
    },
    [palette, setPrefs],
  )
  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  // Drop .md files anywhere on the window to open them.
  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files')
    const enter = (e: DragEvent) => hasFiles(e) && ++depth && setDragging(true)
    const leave = (e: DragEvent) => hasFiles(e) && --depth <= 0 && setDragging(false)
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault()
    const drop = async (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      const files = await readFiles(e.dataTransfer!.files)
      if (files.length) void openFiles(files)
      else toast('Only markdown and text files can be opened')
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [])

  if (!ready) {
    return (
      <div className="grid h-full place-items-center text-ink-3">
        <div className="flex items-center gap-2.5 animate-pulse">
          <Logo size={22} />
          <span className="ui-label">Opening library</span>
        </div>
      </div>
    )
  }

  const sidebar = mobile ? drawer : sidebarPref
  const effective = mobile && view === 'split' ? 'write' : view
  const showEditor = effective !== 'read'
  const showPreview = effective !== 'write'
  const closeOnMobile = () => mobile && useStore.setState({ drawer: false })

  return (
    <div className={clsx('flex h-full flex-col', focus && 'focus-mode')}>
      {!focus && <TopBar onPalette={() => setPalette(true)} />}

      <div className="relative flex min-h-0 flex-1">
        {sidebar && !focus && (
          <>
            {mobile && <div className="animate-fade absolute inset-0 z-20 bg-[rgb(0_0_0/0.4)]" onClick={closeOnMobile} aria-hidden />}
            <div className={clsx('shrink-0 border-r border-line', mobile ? 'animate-rise absolute inset-y-0 left-0 z-30 w-[86vw] max-w-[320px] shadow-2xl' : 'w-[268px]')}>
              <Sidebar headings={rendered.headings} onPick={closeOnMobile} />
            </div>
          </>
        )}

        <div ref={panes} className="flex min-w-0 flex-1">
          <div className={clsx('min-w-0', !showEditor && 'hidden')} style={{ flex: showPreview ? `0 0 ${split * 100}%` : '1 1 0' }}>
            <EditorPane />
          </div>
          {showEditor && showPreview && <Splitter container={panes} />}
          <div className={clsx('min-w-0 flex-1', !showPreview && 'hidden')}>
            <PreviewPane html={rendered.html} theme={theme} syncable={showEditor && showPreview} />
          </div>
        </div>

        {focus && (
          <button
            type="button"
            onClick={() => setPrefs({ focus: false })}
            className="animate-fade absolute top-3 right-4 z-20 flex cursor-pointer items-center gap-2 rounded-[4px] border border-line bg-raised px-2.5 py-1 font-mono text-[11px] text-ink-3 opacity-40 transition-opacity hover:opacity-100"
          >
            <Icon name="focus" size={13} /> Leave focus <span className="kbd">Esc</span>
          </button>
        )}
      </div>

      {!focus && <StatusBar />}

      {palette && <CommandPalette onClose={() => setPalette(false)} headings={rendered.headings} />}
      <Toasts />

      {dragging && (
        <div className="animate-fade pointer-events-none fixed inset-3 z-50 grid place-items-center rounded-[8px] border-2 border-dashed border-accent-ink bg-[color-mix(in_srgb,var(--bg)_88%,transparent)]">
          <div className="text-center">
            <Icon name="upload" size={28} className="mx-auto text-accent-ink" />
            <p className="mt-3 text-[15px] font-semibold text-ink">Drop to open</p>
            <p className="mt-1 font-mono text-[11px] text-ink-3">.md · .markdown · .txt — or {keyLabel('Mod+O')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
