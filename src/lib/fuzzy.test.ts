import { fuzzyScore } from './fuzzy'

describe('fuzzyScore', () => {
  it('matches subsequences and rejects the rest', () => {
    expect(fuzzyScore('exh', 'Export HTML')).not.toBeNull()
    expect(fuzzyScore('xyz', 'Export HTML')).toBeNull()
    expect(fuzzyScore('', 'anything')).toBe(0)
  })

  it('prefers word starts and consecutive runs', () => {
    expect(fuzzyScore('theme', 'Toggle theme')!).toBeGreaterThan(fuzzyScore('theme', 'the mermaid example')!)
    expect(fuzzyScore('new', 'New document')!).toBeGreaterThan(fuzzyScore('new', 'Download a new HTML file')!)
  })
})
