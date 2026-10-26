import { EditorSelection, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { commands, toggleTask } from './commands'

function setup(doc: string, from: number, to = from) {
  const view = new EditorView({ state: EditorState.create({ doc, selection: EditorSelection.single(from, to) }) })
  return { view, text: () => view.state.doc.toString(), sel: () => view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to) }
}

describe('editor commands', () => {
  it('wraps and unwraps a selection', () => {
    const { view, text, sel } = setup('make this bold', 5, 9)
    commands.bold(view)
    expect(text()).toBe('make **this** bold')
    expect(sel()).toBe('this')
    commands.bold(view)
    expect(text()).toBe('make this bold')
  })

  it('puts the cursor between markers when nothing is selected', () => {
    const { view, text } = setup('', 0)
    commands.code(view)
    expect(text()).toBe('``')
    expect(view.state.selection.main.head).toBe(1)
  })

  it('toggles and swaps line prefixes', () => {
    const { view, text } = setup('one\ntwo', 0, 7)
    commands.bullet(view)
    expect(text()).toBe('- one\n- two')
    commands.ordered(view)
    expect(text()).toBe('1. one\n2. two')
    commands.ordered(view)
    expect(text()).toBe('one\ntwo')
  })

  it('replaces a heading level instead of stacking it', () => {
    const { view, text } = setup('## Title', 3)
    commands.h1(view)
    expect(text()).toBe('# Title')
  })

  it('turns a selection into a link and selects the URL', () => {
    const { view, text, sel } = setup('see docs', 4, 8)
    commands.link(view)
    expect(text()).toBe('see [docs](https://)')
    expect(sel()).toBe('https://')
  })

  it('inserts blocks on their own lines', () => {
    const { view, text } = setup('intro', 5)
    commands.table(view)
    expect(text()).toBe('intro\n\n| Column | Column |\n| --- | --- |\n|  | |\n')
    expect(view.state.selection.main.head).toBe(text().lastIndexOf('|  |') + 2)
  })

  it('wraps selected lines in a code block', () => {
    const { view, text } = setup('let a = 1', 0, 9)
    commands.codeBlock(view)
    expect(text()).toBe('```\nlet a = 1\n```\n')
    expect(view.state.selection.main.head).toBe(3)
  })

  it('ticks a task by line number', () => {
    const { view, text } = setup('- [ ] a\n  - [x] b', 0)
    expect(toggleTask(view, 0)).toBe(true)
    expect(toggleTask(view, 1)).toBe(true)
    expect(text()).toBe('- [x] a\n  - [ ] b')
    expect(toggleTask(view, 5)).toBe(false)
  })
})
