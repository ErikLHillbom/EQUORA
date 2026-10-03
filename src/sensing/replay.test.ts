import { describe, expect, it } from 'vitest'
import { decodeWindows, encodeWindows, loadReplay, replaySequence } from './replay.ts'
import { synthSequence } from './synthetic.ts'

describe('replay encoding', () => {
  it('round-trips windows at milli-g resolution', () => {
    const windows = synthSequence(3, 0, (i) => ({ bounce: 0.3, seed: i }))
    const back = decodeWindows(encodeWindows(windows), { hz: 25, windowSamples: 50, scale: 1000, start: 5000 })
    expect(back.length).toBe(3)
    expect(back[1].start).toBe(7000)
    for (let i = 0; i < 50; i++) expect(Math.abs(back[2].az[i] - windows[2].az[i])).toBeLessThanOrEqual(0.0005 + 1e-7)
  })

  it('rejects a partial window', () => {
    expect(() => decodeWindows(new ArrayBuffer(10), { hz: 25, windowSamples: 50, scale: 1000 })).toThrow()
  })

  it('loads clips and joins them into one stream', async () => {
    const stand = encodeWindows(synthSequence(2, 0, (i) => ({ seed: i })))
    const walk = encodeWindows(synthSequence(3, 0, (i) => ({ bounce: 0.2, seed: i })))
    const manifest = {
      version: 1,
      hz: 25,
      windowSamples: 50,
      scale: 1000,
      clips: [
        { label: 'stand', file: 'stand.bin', windows: 2, sourceLabels: ['standing'] },
        { label: 'walk', file: 'walk.bin', windows: 3, sourceLabels: ['walking-natural'] },
      ],
    }
    const files: Record<string, BodyInit> = {
      '/r/manifest.json': JSON.stringify(manifest),
      '/r/stand.bin': stand,
      '/r/walk.bin': walk,
    }
    const fetchFn = (async (url: string) => new Response(files[url])) as typeof fetch
    const replay = await loadReplay('/r', fetchFn)
    const seq = replaySequence(replay, ['walk', 'stand'], 1000)
    expect(seq.map((s) => s.label)).toEqual(['walk', 'walk', 'walk', 'stand', 'stand'])
    expect(seq.map((s) => s.window.start)).toEqual([1000, 3000, 5000, 7000, 9000])
  })
})
