import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useEffect, useRef } from 'react'
import { editor, useCursor } from '../editor/bridge'
import type { CommandName } from '../editor/commands'
import { baseExtensions } from '../editor/setup'
import { keyLabel } from '../lib/keys'
import { useActiveDoc, useStore } from '../store'
import { Icon, type IconName } from './Icon'

const TOOLS: ({ cmd: CommandName; icon: IconName; label: string; key?: string } | '|')[] = [
  { cmd: 'h2', icon: 'heading', label: 'Heading', key: 'Mod+Alt+2' },
  { cmd: 'bold', icon: 'bold', label: 'Bold', key: 'Mod+B' },
  { cmd: 'italic', icon: 'italic', label: 'Italic', key: 'Mod+I' },
  { cmd: 'strike', icon: 'strike', label: 'Strikethrough', key: 'Mod+Shift+X' },
  { cmd: 'code', icon: 'code', label: 'Inline code', key: 'Mod+E' },
  '|',
  { cmd: 'link', icon: 'link', label: 'Link', key: 'Mod+Shift+K' },
  { cmd: 'quote', icon: 'quote', label: 'Quote' },
  { cmd: 'bullet', icon: 'list', label: 'Bulleted list', key: 'Mod+Shift+8' },
  { cmd: 'ordered', icon: 'ordered', label: 'Numbered list', key: 'Mod+Shift+7' },
  { cmd: 'task', icon: 'task', label: 'Task list', key: 'Mod+Shift+9' },
  '|',
  { cmd: 'table', icon: 'table', label: 'Table' },
  { cmd: 'codeBlock', icon: 'more', label: 'Code block' },
  { cmd: 'math', icon: 'sigma', label: 'Math block' },
  { cmd: 'diagram', icon: 'diagram', label: 'Mermaid diagram' },
  { cmd: 'rule', icon: 'rule', label: 'Divider' },
]

// Where each document was left, so switching back restores the cursor and scroll position.
const positions = new Map<string, { anchor: number; head: number; scroll: number }>()

export function EditorPane() {
  const doc = useActiveDoc()
  const host = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const docId = useRef<string | undefined>(undefined)

  useEffect(() => {
    const view = new EditorView({ parent: host.current! })
    viewRef.current = view
    editor.attach(view)
    return () => {
      view.destroy()
      viewRef.current = null
      docId.current = undefined
      editor.attach(null)
    }
  }, [])

  // Swap in a fresh state (and undo history) when the active document changes.
  useEffect(() => {
    const view = viewRef.current
    if (!view || !doc) return
    if (docId.current === doc.id) return
    if (docId.current) {
      const sel = view.state.selection.main
      positions.set(docId.current, { anchor: sel.anchor, head: sel.head, scroll: view.scrollDOM.scrollTop })
    }
    docId.current = doc.id
    const id = doc.id
    const saved = positions.get(id)
    const len = doc.content.length
    view.setState(
      EditorState.create({
        doc: doc.content,
        selection: saved ? { anchor: Math.min(saved.anchor, len), head: Math.min(saved.head, len) } : undefined,
        extensions: baseExtensions(
          (text) => useStore.getState().update(id, text),
          (line, col) => useCursor.setState({ line, col }),
        ),
      }),
    )
    view.scrollDOM.scrollTop = saved?.scroll ?? 0
    const head = view.state.selection.main.head
    const line = view.state.doc.lineAt(head)
    useCursor.setState({ line: line.number, col: head - line.from + 1 })
  }, [doc])

  return (
    <section aria-label="Editor" className="flex h-full min-w-0 flex-col bg-panel">
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-line pl-4">
        <span className="ui-label hidden whitespace-nowrap lg:block">
          <span className="text-accent-ink">01</span> Source
        </span>
        <div role="toolbar" aria-label="Formatting" className="flex min-w-0 flex-1 items-center gap-px overflow-x-auto pr-2 [scrollbar-width:none]">
          {TOOLS.map((t, i) =>
            t === '|' ? (
              <span key={i} aria-hidden className="mx-1.5 h-4 w-px shrink-0 bg-line" />
            ) : (
              <button
                key={t.cmd}
                type="button"
                className="tool !h-[26px] !min-w-[26px] shrink-0"
                aria-label={t.label}
                title={t.key ? `${t.label} (${keyLabel(t.key)})` : t.label}
                onMouseDown={(e) => e.preventDefault()} // Keep the editor's selection.
                onClick={() => editor.run(t.cmd)}
              >
                {t.cmd === 'codeBlock' ? <span className="font-mono text-[11px] font-semibold">{'{}'}</span> : <Icon name={t.icon} size={15} />}
              </button>
            ),
          )}
        </div>
      </div>
      <div ref={host} className="min-h-0 flex-1" />
    </section>
  )
}
