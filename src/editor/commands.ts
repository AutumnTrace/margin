import { EditorSelection, type ChangeSpec, type EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

export type Command = (view: EditorView) => boolean

/** Wraps each selection in `mark` (bold, italic, code…), or unwraps it if it is already wrapped. */
export function toggleWrap(mark: string): Command {
  return (view) => {
    const { state } = view
    const tx = state.changeByRange((range) => {
      const before = state.sliceDoc(range.from - mark.length, range.from)
      const after = state.sliceDoc(range.to, range.to + mark.length)
      if (before === mark && after === mark) {
        return {
          changes: [
            { from: range.from - mark.length, to: range.from },
            { from: range.to, to: range.to + mark.length },
          ],
          range: EditorSelection.range(range.from - mark.length, range.to - mark.length),
        }
      }
      const text = state.sliceDoc(range.from, range.to)
      if (text.length > mark.length * 2 && text.startsWith(mark) && text.endsWith(mark)) {
        return {
          changes: { from: range.from, to: range.to, insert: text.slice(mark.length, -mark.length) },
          range: EditorSelection.range(range.from, range.to - mark.length * 2),
        }
      }
      return {
        changes: [
          { from: range.from, insert: mark },
          { from: range.to, insert: mark },
        ],
        range: EditorSelection.range(range.from + mark.length, range.to + mark.length),
      }
    })
    view.dispatch(state.update(tx, { scrollIntoView: true, userEvent: 'input.format' }))
    return true
  }
}

function selectedLines(state: EditorState) {
  const seen = new Set<number>()
  const lines = []
  for (const range of state.selection.ranges) {
    for (let n = state.doc.lineAt(range.from).number; n <= state.doc.lineAt(range.to).number; n++) {
      if (!seen.has(n)) {
        seen.add(n)
        lines.push(state.doc.line(n))
      }
    }
  }
  return lines
}

const BLOCK_PREFIX = /^(\s*)(#{1,6}\s+|>\s?|[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+)?/

/**
 * Toggles a line prefix (heading, quote, list, task) on every selected line. A different block
 * prefix is replaced rather than stacked, so "- item" becomes "1. item", not "1. - item".
 */
export function toggleLinePrefix(prefix: string | ((index: number) => string)): Command {
  return (view) => {
    const lines = selectedLines(view.state).filter((l, _, all) => all.length === 1 || l.text.trim())
    const prefixFor = (i: number) => (typeof prefix === 'string' ? prefix : prefix(i))
    const pattern = typeof prefix === 'string' ? prefix : prefix(0)
    const kind = (p: string) => p.replace(/\d+/, '1').trim()
    const all = lines.every((l) => kind(BLOCK_PREFIX.exec(l.text)?.[2] ?? '') === kind(pattern))
    const changes: ChangeSpec[] = lines.map((line, i) => {
      const [, indent = '', existing = ''] = BLOCK_PREFIX.exec(line.text) ?? []
      const from = line.from + indent.length
      return { from, to: from + existing.length, insert: all ? '' : prefixFor(i) }
    })
    view.dispatch({ changes, scrollIntoView: true, userEvent: 'input.format' })
    return true
  }
}

export const heading = (level: number) => toggleLinePrefix('#'.repeat(level) + ' ')

/** [selection](url), with "url" selected so it can be typed over. */
export const insertLink: Command = (view) => {
  const { state } = view
  const tx = state.changeByRange((range) => {
    const text = state.sliceDoc(range.from, range.to)
    const isUrl = /^https?:\/\/\S+$/.test(text)
    const label = isUrl ? 'link' : text || 'link'
    const url = isUrl ? text : 'https://'
    const insert = `[${label}](${url})`
    const urlFrom = range.from + label.length + 3
    return {
      changes: { from: range.from, to: range.to, insert },
      range: isUrl || !text ? EditorSelection.range(range.from + 1, range.from + 1 + label.length) : EditorSelection.range(urlFrom, urlFrom + url.length),
    }
  })
  view.dispatch(state.update(tx, { scrollIntoView: true, userEvent: 'input.format' }))
  return true
}

const CURSOR = '$CURSOR'

/**
 * Inserts a block on its own lines and puts the cursor at `$CURSOR`. A template with `$SEL` wraps the
 * selection (code block around selected lines); otherwise the block goes below the current line.
 */
export function insertBlock(template: string): Command {
  return (view) => {
    const { state } = view
    const { from, to } = state.selection.main
    const selected = state.sliceDoc(from, to)
    const wrap = Boolean(selected) && template.includes('$SEL')
    const line = state.doc.lineAt(wrap ? from : to)
    const [start, end] = wrap ? [from, to] : line.text.trim() ? [line.to, line.to] : [line.from, line.to]
    const lead = state.sliceDoc(state.doc.lineAt(start).from, start).trim() ? '\n\n' : ''
    const trail = state.sliceDoc(end, state.doc.lineAt(end).to).trim() ? '\n\n' : '\n'
    const body = template.replace('$SEL', wrap ? selected : '')
    const cursor = body.indexOf(CURSOR)
    view.dispatch({
      changes: { from: start, to: end, insert: lead + body.replace(CURSOR, '') + trail },
      selection: { anchor: start + lead.length + (cursor >= 0 ? cursor : body.length) },
      scrollIntoView: true,
      userEvent: 'input.format',
    })
    return true
  }
}

export const commands = {
  bold: toggleWrap('**'),
  italic: toggleWrap('*'),
  strike: toggleWrap('~~'),
  code: toggleWrap('`'),
  h1: heading(1),
  h2: heading(2),
  h3: heading(3),
  quote: toggleLinePrefix('> '),
  bullet: toggleLinePrefix('- '),
  ordered: toggleLinePrefix((i) => `${i + 1}. `),
  task: toggleLinePrefix('- [ ] '),
  link: insertLink,
  codeBlock: insertBlock('```$CURSOR\n$SEL\n```'),
  table: insertBlock('| Column | Column |\n| --- | --- |\n| $CURSOR | |'),
  rule: insertBlock('---\n$CURSOR'),
  math: insertBlock('$$\n$CURSOR\n$$'),
  diagram: insertBlock('```mermaid\nflowchart LR\n  A[Start] --> B[End]$CURSOR\n```'),
} satisfies Record<string, Command>

export type CommandName = keyof typeof commands

/** Flips "- [ ]" ↔ "- [x]" on a 0-based line, for checkboxes clicked in the preview. */
export function toggleTask(view: EditorView, line: number): boolean {
  if (line < 0 || line >= view.state.doc.lines) return false
  const l = view.state.doc.line(line + 1)
  const m = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])\]/.exec(l.text)
  if (!m) return false
  const at = l.from + m[1]!.length
  view.dispatch({ changes: { from: at, to: at + 1, insert: m[2] === ' ' ? 'x' : ' ' }, userEvent: 'input.toggle' })
  return true
}
