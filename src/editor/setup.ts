import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { bracketMatching, HighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import type { Extension } from '@codemirror/state'
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
  rectangularSelection,
} from '@codemirror/view'
import { tags as t } from '@lezer/highlight'
import { commands } from './commands'

// Markdown syntax keeps its marks visible but quiet: the text is the loud part.
const highlight = HighlightStyle.define([
  { tag: t.heading1, color: 'var(--ink)', fontWeight: '600', fontSize: '1.18em' },
  { tag: t.heading2, color: 'var(--ink)', fontWeight: '600', fontSize: '1.08em' },
  { tag: [t.heading3, t.heading4, t.heading5, t.heading6], color: 'var(--ink)', fontWeight: '600' },
  { tag: t.processingInstruction, color: 'var(--accent-ink)' },
  { tag: t.strong, color: 'var(--ink)', fontWeight: '600' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through', color: 'var(--ink-3)' },
  { tag: t.link, color: 'var(--ink)', textDecoration: 'underline', textDecorationColor: 'var(--accent-line)' },
  { tag: t.url, color: 'var(--ink-3)' },
  { tag: t.monospace, color: 'var(--ink)', backgroundColor: 'var(--code-bg)', borderRadius: '2px' },
  { tag: t.quote, color: 'var(--ink-2)', fontStyle: 'italic' },
  { tag: t.contentSeparator, color: 'var(--ink-3)' },
  { tag: t.meta, color: 'var(--ink-3)' },
  { tag: t.comment, color: 'var(--ink-3)', fontStyle: 'italic' },
  // Code inside fenced blocks
  { tag: [t.keyword, t.modifier, t.operatorKeyword], color: '#8b6cff' },
  { tag: [t.string, t.special(t.string), t.regexp], color: '#3f9a5c' },
  { tag: [t.number, t.bool, t.null, t.atom], color: '#d0632a' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#1a8cb8' },
  { tag: [t.typeName, t.className, t.attributeName], color: '#c0841a' },
  { tag: t.propertyName, color: 'var(--ink)' },
  { tag: t.invalid, color: 'var(--danger)' },
])

const formatKeys = keymap.of([
  { key: 'Mod-b', run: commands.bold },
  { key: 'Mod-i', run: commands.italic },
  { key: 'Mod-e', run: commands.code },
  { key: 'Mod-Shift-x', run: commands.strike },
  { key: 'Mod-Shift-k', run: commands.link },
  { key: 'Mod-Alt-1', run: commands.h1 },
  { key: 'Mod-Alt-2', run: commands.h2 },
  { key: 'Mod-Alt-3', run: commands.h3 },
  { key: 'Mod-Shift-7', run: commands.ordered },
  { key: 'Mod-Shift-8', run: commands.bullet },
  { key: 'Mod-Shift-9', run: commands.task },
])

export function baseExtensions(onChange: (text: string) => void, onCursor: (line: number, col: number) => void): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    history(),
    drawSelection(),
    dropCursor(),
    rectangularSelection(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    search({ top: true }),
    EditorView.lineWrapping,
    markdown({ base: markdownLanguage, codeLanguages: languages, addKeymap: true }),
    syntaxHighlighting(highlight),
    placeholder('Start writing…  Markdown, math ($x^2$) and ```mermaid diagrams all work.'),
    formatKeys,
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, indentWithTab]),
    EditorView.contentAttributes.of({ 'aria-label': 'Markdown source', spellcheck: 'true' }),
    EditorView.updateListener.of((u) => {
      if (u.docChanged) onChange(u.state.doc.toString())
      if (u.docChanged || u.selectionSet) {
        const head = u.state.selection.main.head
        const line = u.state.doc.lineAt(head)
        onCursor(line.number, head - line.from + 1)
      }
    }),
  ]
}
