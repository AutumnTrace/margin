import { countStats, snippet, timeAgo } from './stats'

describe('countStats', () => {
  it('counts words, characters, lines and reading time', () => {
    expect(countStats('')).toEqual({ words: 0, characters: 0, lines: 1, readingMinutes: 0 })
    const s = countStats("# Hello world\n\nIt's a **test** — 2 words-ish.")
    expect(s.words).toBe(7)
    expect(s.lines).toBe(3)
    expect(s.readingMinutes).toBe(1)
    expect(countStats('word '.repeat(690)).readingMinutes).toBe(3)
  })
})

describe('snippet', () => {
  it('skips front matter and markdown syntax', () => {
    expect(snippet('---\ntitle: x\n---\n# Title\nbody')).toBe('Title')
    expect(snippet('- [ ] **buy** [milk](https://shop)')).toBe('buy milk')
    expect(snippet('```\ncode\n```')).toBe('code')
    expect(snippet('   \n')).toBe('Empty document')
  })
})

describe('timeAgo', () => {
  it('reads like a person would say it', () => {
    const now = Date.parse('2026-10-26T12:00:00Z')
    expect(timeAgo(now - 10_000, now)).toBe('now')
    expect(timeAgo(now - 5 * 60_000, now)).toBe('5 min ago')
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe('3 h ago')
    expect(timeAgo(now - 2 * 86_400_000, now)).toBe('2 d ago')
  })
})
