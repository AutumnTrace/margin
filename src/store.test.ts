import { storage } from './lib/storage'
import { flushSaves, useStore } from './store'

describe('document store', () => {
  beforeAll(async () => {
    await useStore.getState().init()
  })

  it('starts with the welcome guide', () => {
    const { docs, activeId } = useStore.getState()
    expect(docs).toHaveLength(1)
    expect(docs[0]!.name).toBe('welcome.md')
    expect(activeId).toBe(docs[0]!.id)
  })

  it('creates documents with unique names and saves edits', async () => {
    const { create, update } = useStore.getState()
    const a = create()
    const b = create()
    expect([a.name, b.name]).toEqual(['untitled.md', 'untitled-2.md'])
    update(a.id, '# Changed')
    flushSaves()
    await vi.waitFor(async () => expect((await storage.all()).find((d) => d.id === a.id)?.content).toBe('# Changed'))
  })

  it('renames, duplicates, deletes and restores', () => {
    const s = useStore.getState()
    const doc = s.create({ name: 'plan.md', content: 'x' })
    s.rename(doc.id, 'roadmap')
    expect(useStore.getState().docs.find((d) => d.id === doc.id)!.name).toBe('roadmap.md')
    const copy = s.duplicate(doc.id)!
    expect(copy.name).toBe('roadmap-copy.md')

    const removed = s.remove(doc.id)!
    expect(useStore.getState().docs.some((d) => d.id === doc.id)).toBe(false)
    s.restore(removed)
    expect(useStore.getState().activeId).toBe(doc.id)
  })
})
