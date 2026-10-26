import { useEffect, useRef } from 'react'
import { editor } from '../editor/bridge'

interface Marker {
  line: number
  top: number
}

/** Preview offset kept above the synced block. */
const LEAD = 24

/**
 * Keeps the editor and the preview at the same place in the document. Every rendered block
 * carries the source line it came from (data-line); positions in between are interpolated.
 * Whichever pane the user last touched drives, so the two never feed back into each other.
 */
export function useScrollSync(scroller: React.RefObject<HTMLElement | null>, enabled: boolean, version: unknown) {
  const markers = useRef<Marker[] | null>(null)
  const driver = useRef<'editor' | 'preview'>('editor')
  const apply = useRef<() => void>(() => {})

  useEffect(() => {
    const preview = scroller.current
    const view = editor.view
    if (!enabled || !preview || !view) return
    const source = view.scrollDOM

    const measure = (): Marker[] => {
      if (markers.current) return markers.current
      const base = preview.getBoundingClientRect().top - preview.scrollTop
      const list: Marker[] = [{ line: 0, top: 0 }]
      for (const el of preview.querySelectorAll<HTMLElement>('[data-line]')) {
        const line = Number(el.dataset.line)
        const top = el.getBoundingClientRect().top - base
        const last = list.at(-1)!
        // Keep the list monotonic in both line and position (nested blocks share lines).
        if (line > last.line && top >= last.top) list.push({ line, top })
      }
      list.push({ line: view.state.doc.lines, top: preview.scrollHeight })
      return (markers.current = list)
    }

    const editorOffset = () => view.documentTop - source.getBoundingClientRect().top + source.scrollTop

    const fromEditor = () => {
      const atBottom = source.scrollTop + source.clientHeight >= source.scrollHeight - 2
      if (atBottom) return void (preview.scrollTop = preview.scrollHeight)
      const h = source.scrollTop - editorOffset()
      const block = view.lineBlockAtHeight(Math.max(0, h))
      const line = view.state.doc.lineAt(block.from).number - 1 + Math.min(1, Math.max(0, (h - block.top) / (block.height || 1)))
      const list = measure()
      const i = Math.max(0, list.findLastIndex((m) => m.line <= line))
      const a = list[i]!
      const b = list[i + 1] ?? a
      const t = b.line > a.line ? (line - a.line) / (b.line - a.line) : 0
      preview.scrollTop = a.top + (b.top - a.top) * t - LEAD
    }

    const fromPreview = () => {
      const y = preview.scrollTop + LEAD
      const list = measure()
      const i = Math.max(0, list.findLastIndex((m) => m.top <= y))
      const a = list[i]!
      const b = list[i + 1] ?? a
      const t = b.top > a.top ? (y - a.top) / (b.top - a.top) : 0
      const line = a.line + (b.line - a.line) * t
      const doc = view.state.doc
      const n = Math.min(doc.lines, Math.floor(line) + 1)
      const blockTop = view.lineBlockAt(doc.line(n).from)
      const next = n < doc.lines ? view.lineBlockAt(doc.line(n + 1).from).top : blockTop.bottom
      source.scrollTop = blockTop.top + (next - blockTop.top) * (line - Math.floor(line)) + editorOffset()
    }

    const onSource = () => driver.current === 'editor' && fromEditor()
    const onPreview = () => driver.current === 'preview' && fromPreview()
    const driveEditor = () => (driver.current = 'editor')
    const drivePreview = () => (driver.current = 'preview')

    const inputs = ['wheel', 'pointerdown', 'keydown', 'touchstart'] as const
    inputs.forEach((ev) => source.addEventListener(ev, driveEditor, { passive: true }))
    inputs.forEach((ev) => preview.addEventListener(ev, drivePreview, { passive: true }))
    source.addEventListener('scroll', onSource, { passive: true })
    preview.addEventListener('scroll', onPreview, { passive: true })

    // Images, diagrams and fonts change heights after render.
    const resize = new ResizeObserver(() => {
      markers.current = null
    })
    resize.observe(preview.firstElementChild ?? preview)
    resize.observe(source)

    apply.current = () => {
      markers.current = null
      if (driver.current === 'editor') fromEditor()
    }

    return () => {
      inputs.forEach((ev) => source.removeEventListener(ev, driveEditor))
      inputs.forEach((ev) => preview.removeEventListener(ev, drivePreview))
      source.removeEventListener('scroll', onSource)
      preview.removeEventListener('scroll', onPreview)
      resize.disconnect()
      apply.current = () => {}
    }
  }, [scroller, enabled])

  // New render: positions moved. Follow the editor while typing.
  useEffect(() => {
    apply.current()
    // `version` is the trigger, not an input.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [version])
}
