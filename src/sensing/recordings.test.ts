import { afterEach, describe, expect, it } from 'vitest'
import { createRecordingStore, type RecordingExport, type RecordingStore, windowsFromExport } from './recordings.ts'
import { synthSequence } from './synthetic.ts'

let n = 0
let store: RecordingStore
function fresh(): RecordingStore {
  store = createRecordingStore(`test-recordings-${n++}`)
  return store
}

afterEach(() => store?.close())

describe('recording store', () => {
  it('saves, lists newest first and reads back the windows', async () => {
    const s = fresh()
    const a = await s.save({ label: 'walk', windows: synthSequence(3, 10_000, (i) => ({ bounce: 0.2, seed: i })), now: 1 })
    const b = await s.save({ label: 'stand', animalId: 'a1', note: 'by the gate', windows: synthSequence(2, 20_000, () => ({})), now: 2 })
    const list = await s.list()
    expect(list.map((r) => r.id)).toEqual([b.id, a.id])
    expect(list[0]).toMatchObject({ label: 'stand', animalId: 'a1', windowCount: 2, hz: 25, windowSamples: 50, start: 20_000 })
    expect(list[0]).not.toHaveProperty('data')
    const got = await s.get(a.id)
    expect(got!.windows.length).toBe(3)
    expect(got!.windows[1].start).toBe(12_000)
    expect(got!.windows[0].az[0]).toBeCloseTo(1, 1)
  })

  it('refuses an empty recording', async () => {
    await expect(fresh().save({ label: 'eat', windows: [] })).rejects.toThrow()
  })

  it('forwards pending recordings once and marks them sent', async () => {
    const s = fresh()
    await s.save({ label: 'walk', windows: synthSequence(1, 0, () => ({})) })
    await s.save({ label: 'eat', windows: synthSequence(1, 0, () => ({})) })
    const sent: RecordingExport[] = []
    expect(await s.forward(async (p) => void sent.push(p), 99)).toBe(2)
    expect(sent[0].recordings.length).toBe(2)
    expect(await s.pending()).toEqual([])
    expect((await s.list()).every((r) => r.sentAt === 99)).toBe(true)
    expect(await s.forward(async (p) => void sent.push(p))).toBe(0)
    expect(sent.length).toBe(1)
  })

  it('keeps recordings pending when sending fails', async () => {
    const s = fresh()
    await s.save({ label: 'walk', windows: synthSequence(1, 0, () => ({})) })
    await expect(
      s.forward(async () => {
        throw new Error('offline')
      }),
    ).rejects.toThrow('offline')
    expect((await s.pending()).length).toBe(1)
  })

  it('exports JSON that decodes back to the same windows', async () => {
    const s = fresh()
    const windows = synthSequence(2, 5_000, (i) => ({ bounce: 0.3, seed: i }))
    const r = await s.save({ label: 'trot', windows })
    const json = JSON.parse(await s.exportJson(undefined, 7)) as RecordingExport
    expect(json.format).toBe('equid-sentinel-recordings')
    expect(json.recordings[0].id).toBe(r.id)
    const back = windowsFromExport(json.recordings[0])
    expect(back.length).toBe(2)
    for (let i = 0; i < 50; i++) expect(Math.abs(back[1].ax[i] - windows[1].ax[i])).toBeLessThanOrEqual(0.0006)
  })

  it('removes a recording', async () => {
    const s = fresh()
    const r = await s.save({ label: 'walk', windows: synthSequence(1, 0, () => ({})) })
    await s.remove(r.id)
    expect(await s.list()).toEqual([])
  })
})
