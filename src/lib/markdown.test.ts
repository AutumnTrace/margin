import { render, slugify } from './markdown'

describe('render', () => {
  it('renders GitHub-flavoured basics', () => {
    const { html } = render('# Title\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n~~gone~~ and https://example.com')
    expect(html).toContain('<h1')
    expect(html).toContain('<table')
    expect(html).toContain('<s>gone</s>')
    expect(html).toContain('href="https://example.com"')
  })

  it('tags blocks with their source line, shifted past front matter', () => {
    const { html } = render('---\ntitle: Hi\n---\n# Heading\n\nParagraph')
    expect(html).toMatch(/<h1[^>]*data-line="3"/)
    expect(html).toMatch(/<p data-line="5"/)
  })

  it('collects headings with unique ids', () => {
    const { headings } = render('# Intro\n## Setup\n## Setup\n### `code` here')
    expect(headings.map((h) => h.id)).toEqual(['intro', 'setup', 'setup-1', 'code-here'])
    expect(headings.map((h) => h.level)).toEqual([1, 2, 2, 3])
    expect(headings[1]!.line).toBe(1)
  })

  it('parses YAML front matter into a properties list', () => {
    const { html, frontMatter } = render('---\ntitle: Notes\ntags: [a, b]\n---\nBody')
    expect(frontMatter).toEqual({ title: 'Notes', tags: ['a', 'b'] })
    expect(html).toContain('<dl class="front-matter"')
    expect(html).toContain('<span class="chip">a</span>')
  })

  it('leaves invalid front matter in the body', () => {
    const { frontMatter, html } = render('---\n: : :\n---\ntext')
    expect(frontMatter).toBeNull()
    expect(html).toContain('text')
  })

  it('highlights fenced code and adds a copy button', () => {
    const { html } = render('```ts\nconst x = 1\n```')
    expect(html).toContain('<figure class="code" data-line="0">')
    expect(html).toContain('hljs-keyword')
    expect(html).toContain('data-copy')
  })

  it('renders inline, block and fenced math', () => {
    expect(render('$x^2$').html).toContain('class="katex"')
    expect(render('$$\n\\int_0^1 x\\,dx\n$$').html).toContain('katex-display')
    expect(render('```math\na+b\n```').html).toContain('math-block')
  })

  it('leaves mermaid source for the client to draw', () => {
    const { html } = render('```mermaid\ngraph TD; A-->B\n```')
    expect(html).toContain('<div class="mermaid" data-line="0">graph TD; A--&gt;B\n</div>')
  })

  it('renders alerts, task lists and footnotes', () => {
    const { html } = render('> [!WARNING]\n> Careful\n\n- [x] done\n- [ ] todo\n\nText[^1]\n\n[^1]: Note')
    expect(html).toContain('markdown-alert-warning')
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('checked')
    expect(html).toContain('footnote')
  })

  it('strips scripts, event handlers and styles from raw HTML', () => {
    const { html } = render('<img src=x onerror="alert(1)"><script>alert(2)</script><style>body{}</style><a href="javascript:alert(3)">x</a>')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('<style')
    expect(html).not.toContain('javascript:')
  })

  it('opens external links in a new tab but keeps anchors in place', () => {
    const { html } = render('[out](https://a.dev) [in](#intro)')
    expect(html).toContain('href="https://a.dev" target="_blank" rel="noopener noreferrer"')
    expect(html).toContain('<a href="#intro">in</a>')
  })
})

describe('slugify', () => {
  it('keeps letters and numbers from any script', () => {
    expect(slugify('Hello, World!')).toBe('hello-world')
    expect(slugify('Привет мир')).toBe('привет-мир')
    expect(slugify('!!!')).toBe('section')
  })
})
