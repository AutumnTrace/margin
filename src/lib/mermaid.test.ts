import { afterEach, describe, expect, it, vi } from 'vitest'

describe('drawDiagrams', () => {
  afterEach(() => {
    vi.doUnmock('mermaid')
    vi.resetModules()
  })

  it('keeps the diagram source in place when Mermaid cannot load', async () => {
    vi.doMock('mermaid', () => {
      throw new Error('Failed to fetch dynamically imported module')
    })
    const { drawDiagrams } = await import('./mermaid')
    const root = document.createElement('div')
    root.innerHTML = '<div class="mermaid">graph TD; A--&gt;B</div>'

    await expect(drawDiagrams(root, 'dark')).resolves.toBeUndefined()
    expect(root.querySelector('.mermaid')!.textContent).toBe('graph TD; A-->B')
    expect(root.querySelector('svg')).toBeNull()
  })
})
