import { nameFromHeading } from './slug'

describe('nameFromHeading', () => {
  it('uses the first heading of any level', () => {
    expect(nameFromHeading('# Trip notes\n\n## Packing')).toBe('trip-notes.md')
    expect(nameFromHeading('Intro text\n\n### Meeting, 3 May')).toBe('meeting-3-may.md')
  })

  it('drops inline markdown and closing hashes', () => {
    expect(nameFromHeading('# **Bold** `code` [link](https://x.dev) ##')).toBe('bold-code-link.md')
  })

  it('skips front matter and fenced code', () => {
    expect(nameFromHeading('---\ntitle: x\n---\n```sh\n# not a heading\n```\n# Real one')).toBe('real-one.md')
  })

  it('returns null without a usable heading', () => {
    expect(nameFromHeading('just text')).toBeNull()
    expect(nameFromHeading('#no-space')).toBeNull()
    expect(nameFromHeading('# !!!')).toBeNull()
  })

  it('keeps names to a sensible length', () => {
    expect(nameFromHeading(`# ${'word '.repeat(40)}`)!.length).toBeLessThanOrEqual(63)
  })
})
