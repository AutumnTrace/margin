import clsx from 'clsx'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { previewElement } from '../actions'
import { editor } from '../editor/bridge'
import { toggleTask } from '../editor/commands'
import { drawDiagrams } from '../lib/mermaid'
import { useStore, type ReadingFont } from '../store'
import { Icon } from './Icon'
import { useScrollSync } from './useScrollSync'

const FONTS: { id: ReadingFont; label: string; className: string }[] = [
  { id: 'sans', label: 'Sans', className: 'font-sans' },
  { id: 'serif', label: 'Serif', className: 'font-serif' },
  { id: 'mono', label: 'Mono', className: 'font-mono text-[11px]' },
]

/** Copy buttons, live task checkboxes and in-page links inside the rendered document. */
function handleClick(e: MouseEvent, article: HTMLElement) {
  const target = e.target as HTMLElement

  const copy = target.closest<HTMLElement>('[data-copy]')
  if (copy) {
    const code = copy.closest('figure')?.querySelector('code')?.textContent ?? ''
    void navigator.clipboard.writeText(code).then(() => {
      copy.textContent = 'Copied'
      copy.dataset.done = ''
      setTimeout(() => {
        copy.textContent = 'Copy'
        delete copy.dataset.done
      }, 1400)
    })
    return
  }

  if (target instanceof HTMLInputElement && target.type === 'checkbox') {
    const line = Number(target.closest<HTMLElement>('li[data-line]')?.dataset.line)
    if (!editor.view || Number.isNaN(line) || !toggleTask(editor.view, line)) e.preventDefault()
    return
  }

  // In-page links (headings, footnotes) scroll the preview instead of changing the URL hash.
  const link = target.closest('a')
  const href = link?.getAttribute('href')
  if (href?.startsWith('#')) {
    e.preventDefault()
    const id = decodeURIComponent(href.slice(1))
    article.querySelector(`[id="${CSS.escape(id)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export function PreviewPane({ html, theme, syncable }: { html: string; theme: string; syncable: boolean }) {
  const scroller = useRef<HTMLDivElement>(null)
  const article = useRef<HTMLElement>(null)
  const font = useStore((s) => s.readingFont)
  const sync = useStore((s) => s.syncScroll)
  const setPrefs = useStore((s) => s.setPrefs)

  // Set the HTML by hand (not via React) so diagrams can be swapped in before the browser paints.
  useLayoutEffect(() => {
    const el = article.current!
    el.innerHTML = html
    void drawDiagrams(el, theme)
  }, [html, theme])

  useLayoutEffect(() => {
    previewElement.current = article.current
    return () => {
      previewElement.current = null
    }
  }, [])

  useScrollSync(scroller, syncable && sync, html)

  useEffect(() => {
    const el = scroller.current!
    const onClick = (e: MouseEvent) => handleClick(e, article.current!)
    el.addEventListener('click', onClick)
    return () => el.removeEventListener('click', onClick)
  }, [])

  return (
    <section aria-label="Preview" className="flex h-full min-w-0 flex-col bg-raised">
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-line px-4">
        <span className="ui-label whitespace-nowrap">
          <span className="text-accent-ink">02</span> Preview
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div role="radiogroup" aria-label="Reading font" className="flex items-center">
            {FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={font === f.id}
                onClick={() => setPrefs({ readingFont: f.id })}
                title={`${f.label} reading font`}
                className={clsx(
                  'cursor-pointer rounded-[3px] px-2 py-[3px] text-[12px] transition-colors',
                  f.className,
                  font === f.id ? 'bg-line text-ink' : 'text-ink-3 hover:text-ink',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          {syncable && (
            <>
              <span aria-hidden className="h-4 w-px bg-line" />
              <button
                type="button"
                className="tool !h-[26px]"
                aria-pressed={sync}
                aria-label="Scroll sync"
                title={sync ? 'Scroll sync on' : 'Scroll sync off'}
                onClick={() => setPrefs({ syncScroll: !sync })}
              >
                <Icon name="sync" size={15} className={sync ? 'text-accent-ink' : undefined} />
              </button>
            </>
          )}
        </div>
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        <article ref={article} className="md" data-font={font} />
      </div>
    </section>
  )
}
