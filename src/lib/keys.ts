export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/** "Mod+Shift+K" → "⌘⇧K" on a Mac, "Ctrl Shift K" elsewhere. */
export function keyLabel(combo: string): string {
  const parts = combo.split('+')
  if (isMac) return parts.map((p) => ({ Mod: '⌘', Shift: '⇧', Alt: '⌥' })[p] ?? p).join('')
  return parts.map((p) => (p === 'Mod' ? 'Ctrl' : p)).join(' ')
}

/** True when a keyboard event matches "Mod+Shift+K" style combos. */
export function matches(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.split('+')
  const key = parts.at(-1)!.toLowerCase()
  const mod = isMac ? e.metaKey : e.ctrlKey
  return (
    mod === parts.includes('Mod') &&
    e.shiftKey === parts.includes('Shift') &&
    e.altKey === parts.includes('Alt') &&
    (e.key.toLowerCase() === key || e.code.toLowerCase() === `digit${key}` || e.code.toLowerCase() === `key${key}`)
  )
}
