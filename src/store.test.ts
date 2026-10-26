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
    update(a.id, 'Changed')
    flushSaves()
    await vi.waitFor(async () => expect((await storage.all()).find((d) => d.id === a.id)?.content).toBe('Changed'))
  })

  it('names new documents after their first heading until renamed', () => {
    const s = useStore.getState()
    const name = (id: string) => useStore.getState().docs.find((d) => d.id === id)!.name
    const doc = s.create()
    s.update(doc.id, '# Trip')
    expect(name(doc.id)).toBe('trip.md')
    s.update(doc.id, '# Trip notes')
    expect(name(doc.id)).toBe('trip-notes.md')

    const twin = s.create()
    s.update(twin.id, '# Trip notes')
    expect(name(twin.id)).toBe('trip-notes-2.md')

    s.rename(doc.id, 'packing')
    s.update(doc.id, '# Something else')
    expect(name(doc.id)).toBe('packing.md')
  })

  it('leaves opened and shared documents with their own names', () => {
    const s = useStore.getState()
    const doc = s.create({ name: 'readme.md', content: '' })
    s.update(doc.id, '# Project')
    expect(useStore.getState().docs.find((d) => d.id === doc.id)!.name).toBe('readme.md')
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
