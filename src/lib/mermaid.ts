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

// Light-theme token values (see tokens.css), for exports that must look right on paper.
const LIGHT: Record<string, string> = {
  '--font-mono': "'IBM Plex Mono', ui-monospace, monospace",
  '--raised': '#ffffff',
  '--panel': '#f7f8f7',
  '--ink': '#0f1112',
  '--ink-3': '#80868a',
  '--line-2': '#c9cdca',
  '--code-bg': '#eef0ee',
  '--accent': '#d4ff3a',
}

/** Mermaid theme variables from the live CSS tokens, or from a fixed palette. */
function themeVars(palette?: Record<string, string>): Record<string, string> {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string) => palette?.[name] ?? css.getPropertyValue(name).trim()
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

/**
 * Redraws every diagram inside `root` (a detached copy of the preview) in light colours, so
 * exports look the same whatever theme the app is in.
 */
export async function drawLightDiagrams(root: HTMLElement): Promise<void> {
  const blocks = [...root.querySelectorAll<HTMLElement>('.mermaid[data-source]')]
  if (!blocks.length) return
  const mermaid = await load()
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base', themeVariables: themeVars(LIGHT), flowchart: { curve: 'basis' } })
  configuredFor = '' // The preview re-applies its own theme on the next draw.
  for (const block of blocks) {
    try {
      const { svg } = await mermaid.render(`mermaid-export-${++counter}`, block.dataset.source!)
      paint(block, svg)
    } catch {
      // Leave the preview's copy in place.
    }
  }
}

function paint(block: HTMLElement, svg: string) {
  block.innerHTML = svg
  block.dataset.drawn = 'ok'
}
