export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') || 'section'
  )
}

/** A file name from the document's first heading (outside front matter and code), or null. */
export function nameFromHeading(content: string): string | null {
  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, '')
  let fenced = false
  for (const line of body.split('\n')) {
    if (/^\s{0,3}(```|~~~)/.test(line)) fenced = !fenced
    if (fenced) continue
    const m = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/.exec(line)
    if (!m) continue
    const text = m[1]!.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`~]/g, '')
    const slug = slugify(text).slice(0, 60).replace(/-+$/, '')
    return slug && slug !== 'section' ? `${slug}.md` : null
  }
  return null
}
