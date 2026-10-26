import type { Mermaid } from 'mermaid'

let loading: Promise<Mermaid> | null = null
let configuredFor = ''
const cache = new Map<string, string>()
let counter = 0

// Mermaid is ~1 MB, so it only loads the first time a document actually contains a diagram.
function load(): Promise<Mermaid> {
  loading ??= import('mermaid').then((m) => m.default)
  return loading
}

function themeVars(): Record<string, string> {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string) => css.getPropertyValue(name).trim()
  return {
    fontFamily: v('--font-mono') || 'monospace',
    fontSize: '13px',
    background: 'transparent',
    primaryColor: v('--raised'),
    primaryTextColor: v('--ink'),
    primaryBorderColor: v('--ink-3'),
    secondaryColor: v('--code-bg'),
    tertiaryColor: v('--panel'),
    lineColor: v('--ink-3'),
    textColor: v('--ink'),
    noteBkgColor: v('--accent'),
    noteTextColor: '#0c0d0e',
    noteBorderColor: v('--accent'),
    mainBkg: v('--raised'),
    clusterBkg: v('--code-bg'),
    clusterBorder: v('--line-2'),
    edgeLabelBackground: v('--panel'),
  }
}

/**
 * Turns every `.mermaid` source block inside `root` into an SVG. Results are cached by theme and
 * source, so retyping elsewhere in the document doesn't make diagrams flicker.
 */
export async function drawDiagrams(root: HTMLElement, theme: string): Promise<void> {
  const blocks = [...root.querySelectorAll<HTMLElement>('.mermaid:not([data-drawn])')]
  if (!blocks.length) return

  // Cached diagrams go in synchronously, before the browser paints.
  const pending: HTMLElement[] = []
  for (const block of blocks) {
    const source = block.dataset.source ?? block.textContent ?? ''
    block.dataset.source = source
    const hit = cache.get(theme + source)
    if (hit) paint(block, hit)
    else pending.push(block)
  }
  if (!pending.length) return

  const mermaid = await load()
  if (configuredFor !== theme) {
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base', themeVariables: themeVars(), flowchart: { curve: 'basis' } })
    configuredFor = theme
  }
  for (const block of pending) {
    if (!block.isConnected) continue
    const source = block.dataset.source!
    try {
      const { svg } = await mermaid.render(`mermaid-${++counter}`, source)
      cache.set(theme + source, svg)
      if (cache.size > 100) cache.delete(cache.keys().next().value!)
      if (block.isConnected) paint(block, svg)
    } catch (e) {
      block.dataset.drawn = 'error'
      block.classList.add('mermaid-error')
      block.textContent = `Diagram error: ${(e as Error).message.split('\n')[0]}`
    }
  }
}

function paint(block: HTMLElement, svg: string) {
  block.innerHTML = svg
  block.dataset.drawn = 'ok'
}
