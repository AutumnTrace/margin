import { createStore, del, entries, get, set } from 'idb-keyval'

export interface Doc {
  id: string
  name: string
  content: string
  createdAt: number
  updatedAt: number
}

// Documents live in IndexedDB: no size cap worth worrying about, and nothing leaves the browser.
const docs = createStore('margin', 'docs')
const handles = createStore('margin-files', 'handles')

export const storage = {
  async all(): Promise<Doc[]> {
    return (await entries<string, Doc>(docs)).map(([, d]) => d)
  },
  put: (doc: Doc) => set(doc.id, doc, docs),
  remove: (id: string) => Promise.all([del(id, docs), del(id, handles)]),

  /** Chromium can keep a file handle across reloads, so Ctrl+S keeps writing to the same file. */
  getHandle: (id: string) => get<FileSystemFileHandle>(id, handles),
  setHandle: (id: string, handle: FileSystemFileHandle) => set(id, handle, handles),
}

const PREFS_KEY = 'margin:prefs'

export function loadPrefs<T extends object>(defaults: T): T {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<T>) } : defaults
  } catch {
    return defaults
  }
}

export function savePrefs(prefs: object) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Private mode or full storage: preferences just won't stick.
  }
}
