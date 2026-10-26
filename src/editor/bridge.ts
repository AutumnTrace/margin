import type { EditorView } from '@codemirror/view'
import { create } from 'zustand'
import { commands, type CommandName } from './commands'

// The one live EditorView, so toolbars, the palette and the preview can act on the text.
let current: EditorView | null = null

export const editor = {
  get view() {
    return current
  },
  attach(view: EditorView | null) {
    current = view
  },
  run(name: CommandName) {
    if (!current) return
    commands[name](current)
    current.focus()
  },
  focus() {
    current?.focus()
  },
  /** Scrolls the editor so 0-based `line` sits near the top and puts the cursor there. */
  reveal(line: number) {
    if (!current) return
    const target = current.state.doc.line(Math.min(Math.max(line + 1, 1), current.state.doc.lines))
    current.dispatch({ selection: { anchor: target.from }, scrollIntoView: true })
    const top = current.lineBlockAt(target.from).top
    current.scrollDOM.scrollTo({ top: Math.max(0, top - 60), behavior: 'smooth' })
    current.focus()
  },
}

export const useCursor = create<{ line: number; col: number }>()(() => ({ line: 1, col: 1 }))
