import { editor } from './editor/bridge'
import { canUseFileSystem, download, pickFiles, saveAs, writeHandle, type OpenedFile } from './lib/files'
import { drawLightDiagrams } from './lib/mermaid'
import { shareUrl } from './lib/share'
import { storage } from './lib/storage'
import { WELCOME } from './lib/welcome'
import previewCss from './preview.css?inline'
import tokensCss from './tokens.css?inline'
import { toast, useStore } from './store'

// What the toolbar, the command palette and the keyboard shortcuts all call.

/** The rendered preview element, for export and print. Set by the preview pane. */
export const previewElement: { current: HTMLElement | null } = { current: null }

const active = () => {
  const s = useStore.getState()
  return s.docs.find((d) => d.id === s.activeId)
}

const fail = (what: string) => (e: unknown) => toast(`${what} failed: ${(e as Error).message}`)

export function newDocument() {
  useStore.getState().create()
  if (useStore.getState().view === 'read') useStore.getState().setPrefs({ view: 'split' })
  // Unless something else (the palette) has opened and taken focus in the meantime.
  requestAnimationFrame(() => !document.querySelector('[role=dialog]') && editor.focus())
}

export async function openFiles(files?: OpenedFile[]) {
  try {
    const list = files ?? (await pickFiles())
    const { create, link } = useStore.getState()
    for (const file of list) {
      const doc = create({ name: file.name, content: file.content })
      if (file.handle) link(doc.id, file.handle)
    }
    if (list.length) toast(list.length === 1 ? `Opened ${list[0]!.name}` : `Opened ${list.length} files`)
  } catch (e) {
    fail('Opening')(e)
  }
}

/** Ctrl+S: writes to the linked file if there is one, otherwise asks where to save. */
export async function saveToDisk() {
  const doc = active()
  if (!doc) return
  try {
    const handle = await storage.getHandle(doc.id)
    if (handle && (await writeHandle(handle, doc.content))) {
      toast(`Saved to ${handle.name}`)
      return
    }
    const saved = await saveAs(doc.name, doc.content)
    if (saved) {
      useStore.getState().link(doc.id, saved)
      if (saved.name !== doc.name) useStore.getState().rename(doc.id, saved.name)
      toast(`Saved to ${saved.name}. Ctrl S keeps writing to it.`)
    } else if (!canUseFileSystem) {
      toast(`Downloaded ${doc.name}`)
    }
  } catch (e) {
    fail('Saving')(e)
  }
}

export function exportMarkdown() {
  const doc = active()
  if (doc) download(doc.name, doc.content, 'text/markdown;charset=utf-8')
}

const stem = (name: string) => name.replace(/\.[^.]+$/, '')

/** A single self-contained page: the rendered HTML (diagrams already drawn) plus the preview styles. */
export function buildHtml(title: string, body: string, font: string): string {
  const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Serif:ital,wght@0,400;0,600;1,400&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.css">
<style>
${tokensCss}
body { margin: 0; background: var(--panel); }
${previewCss}
.md figure.code .copy { display: none; }
</style>
</head>
<body>
<article class="md" data-font="${font}">
${body}
</article>
</body>
</html>
`
}

/** The rendered preview as HTML, with diagrams redrawn in light colours for paper and other screens. */
async function exportBody(el: HTMLElement): Promise<string> {
  const copy = el.cloneNode(true) as HTMLElement
  await drawLightDiagrams(copy)
  return copy.innerHTML
}

export async function exportHtml() {
  const doc = active()
  const el = previewElement.current
  if (!doc || !el) return toast('Open the preview to export HTML')
  const body = await exportBody(el)
  download(`${stem(doc.name)}.html`, buildHtml(stem(doc.name), body, useStore.getState().readingFont), 'text/html;charset=utf-8')
}

export async function exportPdf() {
  const doc = active()
  const el = previewElement.current
  if (!doc || !el) return toast('Open the preview to export PDF')
  const body = await exportBody(el)
  let print = document.getElementById('print')
  if (!print) {
    print = document.createElement('div')
    print.id = 'print'
    document.body.append(print)
  }
  print.innerHTML = `<article class="md" data-font="${useStore.getState().readingFont}">${body}</article>`
  const title = document.title
  document.title = stem(doc.name) // Becomes the PDF's default file name.
  window.print()
  document.title = title
}

export async function copyShareLink() {
  const doc = active()
  if (!doc) return
  const url = shareUrl({ name: doc.name, content: doc.content })
  try {
    await navigator.clipboard.writeText(url)
    toast(url.length > 32_000 ? 'Link copied. It is long, so some chat apps may cut it off.' : 'Share link copied. The document is inside the link.')
  } catch {
    toast('Could not reach the clipboard')
  }
}

export function removeDocument(id: string) {
  const doc = useStore.getState().remove(id)
  if (doc) toast(`Deleted ${doc.name}`, { label: 'Undo', run: () => useStore.getState().restore(doc) })
}

export function restoreWelcome() {
  useStore.getState().create({ name: 'welcome.md', content: WELCOME })
}

export function cycleTheme() {
  const order = ['system', 'light', 'dark'] as const
  const { theme, setPrefs } = useStore.getState()
  const next = order[(order.indexOf(theme) + 1) % order.length]!
  setPrefs({ theme: next })
  toast(`Theme: ${next}`)
}
