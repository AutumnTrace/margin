import { create } from 'zustand'
import { ensureExtension } from './lib/files'
import { nameFromHeading } from './lib/slug'
import { loadPrefs, savePrefs, storage, type Doc } from './lib/storage'
import { WELCOME } from './lib/welcome'

export type View = 'write' | 'split' | 'read'
export type ThemePref = 'system' | 'light' | 'dark'
export type ReadingFont = 'sans' | 'serif' | 'mono'
export type SaveState = 'saved' | 'saving' | 'error'

export interface Prefs {
  theme: ThemePref
  view: View
  readingFont: ReadingFont
  sidebar: boolean
  sidebarTab: 'files' | 'outline'
  /** Editor share of the split view, 0.2–0.8. */
  split: number
  syncScroll: boolean
  focus: boolean
  activeId: string | null
}

const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  view: 'split',
  readingFont: 'sans',
  sidebar: true,
  sidebarTab: 'files',
  split: 0.5,
  syncScroll: true,
  focus: false,
  activeId: null,
}

interface State extends Prefs {
  ready: boolean
  /** The library as an overlay on small screens; not remembered. */
  drawer: boolean
  /** The keyboard shortcuts sheet is open. */
  shortcuts: boolean
  docs: Doc[]
  saveState: SaveState
  lastSavedAt: number | null
  /** Doc id → name of the file on disk it is linked to. */
  linked: Record<string, string>

  init(): Promise<void>
  select(id: string): void
  create(init?: Partial<Pick<Doc, 'name' | 'content'>>): Doc
  update(id: string, content: string): void
  rename(id: string, name: string): void
  remove(id: string): Doc | undefined
  restore(doc: Doc): void
  duplicate(id: string): Doc | undefined
  link(id: string, handle: FileSystemFileHandle): void
  setPrefs(prefs: Partial<Prefs>): void
  toggleLibrary(): void
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()
let initializing: Promise<void> | null = null
const SAVE_DELAY = 350

function uniqueName(docs: Doc[], wanted: string): string {
  const name = ensureExtension(wanted)
  const taken = new Set(docs.map((d) => d.name.toLowerCase()))
  if (!taken.has(name.toLowerCase())) return name
  const dot = name.lastIndexOf('.')
  const [stem, ext] = [name.slice(0, dot), name.slice(dot)]
  for (let i = 2; ; i++) if (!taken.has(`${stem}-${i}${ext}`.toLowerCase())) return `${stem}-${i}${ext}`
}

const PREF_KEYS = Object.keys(DEFAULT_PREFS) as (keyof Prefs)[]

export const useStore = create<State>()((set, get) => {
  function persist(doc: Doc) {
    clearTimeout(timers.get(doc.id))
    set({ saveState: 'saving' })
    timers.set(
      doc.id,
      setTimeout(() => {
        timers.delete(doc.id)
        storage
          .put(doc)
          .then(() => {
            if (!timers.size) set({ saveState: 'saved', lastSavedAt: Date.now() })
          })
          .catch(() => set({ saveState: 'error' }))
      }, SAVE_DELAY),
    )
  }

  function patch(id: string, change: Partial<Doc>) {
    let changed: Doc | undefined
    set((s) => ({
      docs: s.docs.map((d) => (d.id === id ? (changed = { ...d, ...change, updatedAt: Date.now() }) : d)),
    }))
    if (changed) persist(changed)
  }

  async function load() {
    let docs = await storage.all()
    if (!docs.length) {
      const now = Date.now()
      const welcome: Doc = { id: crypto.randomUUID(), name: 'welcome.md', content: WELCOME, createdAt: now, updatedAt: now }
      await storage.put(welcome)
      docs = [welcome]
    }
    const linked: Record<string, string> = {}
    await Promise.all(
      docs.map(async (d) => {
        const handle = await storage.getHandle(d.id).catch(() => undefined)
        if (handle) linked[d.id] = handle.name
      }),
    )
    const { activeId } = get()
    const active = docs.some((d) => d.id === activeId) ? activeId : [...docs].sort((a, b) => b.updatedAt - a.updatedAt)[0]!.id
    set({ docs, linked, activeId: active, ready: true })
  }

  return {
    ...loadPrefs(DEFAULT_PREFS),
    ready: false,
    drawer: false,
    shortcuts: false,
    docs: [],
    saveState: 'saved',
    lastSavedAt: null,
    linked: {},

    init() {
      // Once per page, even if React mounts twice.
      initializing ??= load()
      return initializing
    },

    select(id) {
      set({ activeId: id })
    },

    create(init = {}) {
      const now = Date.now()
      const doc: Doc = {
        id: crypto.randomUUID(),
        name: uniqueName(get().docs, init.name ?? 'untitled.md'),
        content: init.content ?? '',
        createdAt: now,
        updatedAt: now,
        autoName: init.name === undefined,
      }
      set((s) => ({ docs: [...s.docs, doc], activeId: doc.id }))
      persist(doc)
      return doc
    },

    update(id, content) {
      const doc = get().docs.find((d) => d.id === id)
      if (!doc || doc.content === content) return
      // An automatic name follows the first heading until the user picks one.
      const wanted = doc.autoName ? nameFromHeading(content) : null
      const others = get().docs.filter((d) => d.id !== id)
      patch(id, wanted && wanted !== doc.name ? { content, name: uniqueName(others, wanted) } : { content })
    },

    rename(id, name) {
      const others = get().docs.filter((d) => d.id !== id)
      patch(id, { name: uniqueName(others, name), autoName: false })
    },

    remove(id) {
      const { docs, activeId } = get()
      const doc = docs.find((d) => d.id === id)
      if (!doc) return
      clearTimeout(timers.get(id))
      timers.delete(id)
      const rest = docs.filter((d) => d.id !== id)
      const linked = { ...get().linked }
      delete linked[id]
      void storage.remove(id)
      if (!rest.length) {
        set({ docs: rest, linked })
        get().create()
        return doc
      }
      const next = activeId === id ? [...rest].sort((a, b) => b.updatedAt - a.updatedAt)[0]!.id : activeId
      set({ docs: rest, linked, activeId: next })
      return doc
    },

    restore(doc) {
      set((s) => ({ docs: [...s.docs.filter((d) => d.id !== doc.id), doc], activeId: doc.id }))
      persist(doc)
    },

    duplicate(id) {
      const doc = get().docs.find((d) => d.id === id)
      if (!doc) return
      return get().create({ name: doc.name.replace(/(\.[^.]+)?$/, '-copy$1'), content: doc.content })
    },

    link(id, handle) {
      void storage.setHandle(id, handle)
      set((s) => ({ linked: { ...s.linked, [id]: handle.name } }))
    },

    setPrefs(prefs) {
      set(prefs)
    },

    toggleLibrary() {
      if (matchMedia('(max-width: 767px)').matches) set((s) => ({ drawer: !s.drawer }))
      else set((s) => ({ sidebar: !s.sidebar }))
    },
  }
})

// Preferences follow the store; documents save themselves (above).
useStore.subscribe((s, prev) => {
  if (PREF_KEYS.some((k) => s[k] !== prev[k])) savePrefs(Object.fromEntries(PREF_KEYS.map((k) => [k, s[k]])))
})

/** Write any pending saves right away (tab hidden, page closing). */
export function flushSaves() {
  const { docs } = useStore.getState()
  for (const [id, timer] of timers) {
    clearTimeout(timer)
    const doc = docs.find((d) => d.id === id)
    if (doc) void storage.put(doc)
  }
  timers.clear()
  if (useStore.getState().saveState === 'saving') useStore.setState({ saveState: 'saved', lastSavedAt: Date.now() })
}

export function useActiveDoc(): Doc | undefined {
  return useStore((s) => s.docs.find((d) => d.id === s.activeId))
}

interface Toast {
  id: number
  message: string
  action?: { label: string; run: () => void }
}

interface ToastState {
  toasts: Toast[]
  show(message: string, action?: Toast['action']): void
  dismiss(id: number): void
}

let toastId = 0
export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  show(message, action) {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, action }] }))
    setTimeout(() => get().dismiss(id), action ? 6000 : 3200)
  },
  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

export const toast = (message: string, action?: Toast['action']) => useToasts.getState().show(message, action)
