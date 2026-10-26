import { readShare, shareUrl } from './share'

describe('share links', () => {
  it('round-trips a document through the URL fragment', () => {
    const doc = { name: 'notes.md', content: '# Hi\n\nÜnïcödé, emoji 🎉 and `code`' }
    const url = shareUrl(doc, 'https://example.com/margin/')
    expect(url.startsWith('https://example.com/margin/#share=')).toBe(true)
    expect(readShare(new URL(url).hash)).toEqual(doc)
  })

  it('compresses repetitive text', () => {
    const content = 'The same line again.\n'.repeat(500)
    expect(shareUrl({ name: 'a.md', content }, 'https://x.dev/').length).toBeLessThan(content.length / 5)
  })

  it('rejects anything that is not a share link', () => {
    expect(readShare('')).toBeNull()
    expect(readShare('#intro')).toBeNull()
    expect(readShare('#share=not-valid')).toBeNull()
  })
})
