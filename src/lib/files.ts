const MD_TYPES: FilePickerType[] = [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown', '.mdx', '.txt'] } }]

export const canUseFileSystem = typeof window !== 'undefined' && 'showSaveFilePicker' in window

export function download(name: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export interface OpenedFile {
  name: string
  content: string
  handle?: FileSystemFileHandle
}

/** Opens markdown files with the native picker where available, otherwise a plain file input. */
export async function pickFiles(): Promise<OpenedFile[]> {
  if (window.showOpenFilePicker) {
    try {
      const picked = await window.showOpenFilePicker({ types: MD_TYPES, multiple: true })
      return Promise.all(picked.map(async (handle) => ({ name: handle.name, content: await (await handle.getFile()).text(), handle })))
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return []
      throw e
    }
  }
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', multiple: true, accept: '.md,.markdown,.mdx,.txt,text/markdown,text/plain' })
    input.onchange = async () => resolve(await readFiles(input.files))
    input.oncancel = () => resolve([])
    input.click()
  })
}

export async function readFiles(list: FileList | null): Promise<OpenedFile[]> {
  const files = [...(list ?? [])].filter((f) => /\.(md|markdown|mdx|txt)$/i.test(f.name) || f.type.startsWith('text/'))
  return Promise.all(files.map(async (f) => ({ name: f.name, content: await f.text() })))
}

/** Writes through an existing handle, asking for permission again if the browser dropped it. */
export async function writeHandle(handle: FileSystemFileHandle, content: string): Promise<boolean> {
  if (handle.queryPermission && (await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
    if (!handle.requestPermission || (await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') return false
  }
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
  return true
}

/** Native "Save as"; null when the user cancels. */
export async function saveAs(name: string, content: string): Promise<FileSystemFileHandle | null> {
  if (!window.showSaveFilePicker) {
    download(name, content, 'text/markdown;charset=utf-8')
    return null
  }
  try {
    const handle = await window.showSaveFilePicker({ suggestedName: name, types: MD_TYPES })
    await writeHandle(handle, content)
    return handle
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') return null
    throw e
  }
}

export function ensureExtension(name: string, ext = '.md'): string {
  const trimmed = name.trim() || 'untitled'
  return /\.[a-z0-9]{1,8}$/i.test(trimmed) ? trimmed : trimmed + ext
}
