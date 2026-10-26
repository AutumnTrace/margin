/**
 * Subsequence match: every query character must appear in order. Higher scores for matches at
 * word starts and for runs of consecutive characters. Null when it doesn't match at all.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.toLowerCase().replace(/\s+/g, '')
  if (!q) return 0
  const t = text.toLowerCase()
  let best: number | null = null
  // Greedy from each place the first character occurs, keeping the best run.
  for (let start = t.indexOf(q[0]!); start >= 0; start = t.indexOf(q[0]!, start + 1)) {
    const score = scoreFrom(q, t, start)
    if (score !== null && (best === null || score > best)) best = score
  }
  return best === null ? null : best - t.length * 0.01
}

function scoreFrom(q: string, t: string, start: number): number | null {
  let score = 0
  let at = start - 1
  let run = 0
  for (const ch of q) {
    const next = t.indexOf(ch, at + 1)
    if (next < 0) return null
    run = next === at + 1 && at >= start ? run + 1 : 0
    const wordStart = next === 0 || /[\s\-_./#]/.test(t[next - 1]!)
    score += 1 + run * 2 + (wordStart ? 3 : 0) - (at >= start ? Math.min(next - at - 1, 4) * 0.25 : 0)
    at = next
  }
  return score
}
