import { describe, expect, it } from 'vitest'
import { createFeedbackStore } from './feedback'

let n = 0
const fresh = () => createFeedbackStore(`feedback-test-${++n}`)

describe('feedback store', () => {
  it('keeps one answer per change and lists them per animal', async () => {
    const store = fresh()
    await store.record({ changeId: 'bari-1', animalId: 'bari', feedback: 'fine', at: 1 })
    await store.record({ changeId: 'bari-2', animalId: 'bari', feedback: 'treated', at: 2 })
    await store.record({ changeId: 'kito-1', animalId: 'kito', feedback: 'called_help', at: 3 })
    // A second answer for the same change replaces the first.
    await store.record({ changeId: 'bari-1', animalId: 'bari', feedback: 'not_eating', at: 4 })
    expect((await store.get('bari-1'))?.feedback).toBe('not_eating')
    const bari = await store.forAnimal('bari')
    expect(bari.map((r) => r.changeId).sort()).toEqual(['bari-1', 'bari-2'])
    expect(await store.forAnimal('mulu')).toEqual([])
    store.close()
  })

  it('survives closing and opening the database again', async () => {
    const name = `feedback-test-${++n}`
    const a = createFeedbackStore(name)
    await a.record({ changeId: 'chaltu-1', animalId: 'chaltu', feedback: 'fine', at: 5 })
    a.close()
    const b = createFeedbackStore(name)
    expect(await b.get('chaltu-1')).toEqual({ changeId: 'chaltu-1', animalId: 'chaltu', feedback: 'fine', at: 5 })
    b.close()
  })

  it('refuses an answer that is not one of the four', async () => {
    const store = fresh()
    await expect(
      store.record({ changeId: 'x', animalId: 'bari', feedback: 'colic' as never, at: 1 }),
    ).rejects.toThrow()
    store.close()
  })
})
