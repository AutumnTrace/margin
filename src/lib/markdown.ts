import katexModule from '@vscode/markdown-it-katex'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/common'
import katex from 'katex'
import MarkdownIt from 'markdown-it'
import footnote from 'markdown-it-footnote'
import alerts from 'markdown-it-github-alerts'
import taskLists from 'markdown-it-task-lists'
import { parse as parseYaml } from 'yaml'
import { slugify } from './slug'

export { slugify }

export interface Heading {
  level: number
  text: string
  id: string
  /** 0-based source line. */
  line: number
}

export interface Rendered {
  html: string
  headings: Heading[]
  /** Parsed YAML front matter, or null when the document has none (or it doesn't parse). */
  frontMatter: Record<string, unknown> | null
}

// A type alias, not an interface, so it fits markdown-it's indexable Env.
type Env = {
  lineOffset: number
  headings: Heading[]
  slugs: Map<string, number>
}

// The plugin is CommonJS with exports.default; bundlers disagree on whether `default` is unwrapped.
const katexPlugin = (katexModule as unknown as { default?: typeof katexModule }).default ?? katexModule

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/


const md = new MarkdownIt({ html: true, linkify: true, typographer: true })
  .use(footnote)
  .use(taskLists, { enabled: true })
  .use(alerts)
  .use(katexPlugin, { katex, throwOnError: false })

const escape = md.utils.escapeHtml

// Every block that maps to source lines carries data-line, so the preview can follow the editor
// (scroll sync) and know which line a clicked checkbox belongs to.
md.core.ruler.push('source_lines', (state) => {
  const env = state.env as Env
  for (const token of state.tokens) {
    if (token.map && token.nesting === 1) token.attrSet('data-line', String(token.map[0] + env.lineOffset))
  }
})

md.core.ruler.push('heading_ids', (state) => {
  const env = state.env as Env
  const tokens = state.tokens
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!
    if (token.type !== 'heading_open') continue
    const text = tokens[i + 1]?.children?.map((c) => (c.type === 'text' || c.type === 'code_inline' ? c.content : '')).join('') ?? ''
    const base = slugify(text)
    const seen = env.slugs.get(base) ?? 0
    env.slugs.set(base, seen + 1)
    const id = seen ? `${base}-${seen}` : base
    token.attrSet('id', id)
    env.headings.push({ level: Number(token.tag.slice(1)), text, id, line: (token.map?.[0] ?? 0) + env.lineOffset })
  }
})

md.renderer.rules.fence = (tokens, idx, _options, env) => {
  const { lineOffset } = env as Env
  const token = tokens[idx]!
  const lang = token.info.trim().split(/\s+/)[0]?.toLowerCase() ?? ''
  const line = token.map ? ` data-line="${token.map[0] + lineOffset}"` : ''

  if (lang === 'mermaid') return `<div class="mermaid"${line}>${escape(token.content)}</div>\n`
  if (lang === 'math') {
    return `<div class="math-block"${line}>${katex.renderToString(token.content, { displayMode: true, throwOnError: false })}</div>\n`
  }

  const known = lang && hljs.getLanguage(lang)
  const code = known ? hljs.highlight(token.content, { language: lang, ignoreIllegals: true }).value : escape(token.content)
  return (
    `<figure class="code"${line}>` +
    `<figcaption><span>${escape(lang || 'text')}</span><button type="button" class="copy" data-copy>Copy</button></figcaption>` +
    `<pre><code class="hljs">${code}</code></pre></figure>\n`
  )
}

// Links leave the app in a new tab; in-page anchors (#heading, footnotes) stay put.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    const href = node.getAttribute('href') ?? ''
    if (href && !href.startsWith('#')) {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  }
})

export function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target'],
    // A <style> or <form> in a document could restyle or phish inside the app itself.
    FORBID_TAGS: ['style', 'form', 'iframe', 'object', 'embed'],
  })
}

function renderFrontMatter(data: Record<string, unknown>, line: number): string {
  const rows = Object.entries(data)
    .map(([key, value]) => {
      const shown = Array.isArray(value) ? value.map((v) => `<span class="chip">${escape(String(v))}</span>`).join('') : escape(formatValue(value))
      return `<dt>${escape(key)}</dt><dd>${shown}</dd>`
    })
    .join('')
  return `<dl class="front-matter" data-line="${line}">${rows}</dl>\n`
}

function formatValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (value !== null && typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function render(source: string): Rendered {
  let body = source
  let frontMatter: Record<string, unknown> | null = null
  let prefix = ''
  let lineOffset = 0

  const match = FRONT_MATTER.exec(source)
  if (match) {
    try {
      const parsed: unknown = parseYaml(match[1]!)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        frontMatter = parsed as Record<string, unknown>
        prefix = renderFrontMatter(frontMatter, 0)
        body = source.slice(match[0].length)
        lineOffset = match[0].split('\n').length - (match[0].endsWith('\n') ? 1 : 0)
      }
    } catch {
      // Not valid YAML: leave it in the body so the user sees what they typed.
    }
  }

  const env: Env = { lineOffset, headings: [], slugs: new Map() }
  const html = sanitize(prefix + md.render(body, env))
  return { html, headings: env.headings, frontMatter }
}
