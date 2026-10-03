import { describe, expect, it } from 'vitest'
import { LABEL_MAP, normaliseLabel, type RawWindow, Windower } from './build-features.ts'

function feed(w: Windower, from: number, n: number, label: string, segment = 's1', value = 9.80665) {
  for (let r = from; r < from + n; r++) w.push(r, 0, 0, value, label, segment)
}

describe('Windower', () => {
  it('cuts non-overlapping 2 s windows and converts to g at 25 Hz', () => {
    const out: RawWindow[] = []
    const w = new Windower('Test', (x) => out.push(x))
    feed(w, 0, 450, 'standing')
    expect(out.length).toBe(2)
    expect(out[0].startRow).toBe(0)
    expect(out[1].startRow).toBe(200)
    expect(out[0].az.length).toBe(50)
    expect(out[0].az[0]).toBeCloseTo(1, 6)
  })

  it('breaks a run on a label change, a segment change or a row gap', () => {
    const out: RawWindow[] = []
    const w = new Windower('Test', (x) => out.push(x))
    feed(w, 0, 150, 'standing')
    feed(w, 150, 150, 'grazing')
    expect(out.length).toBe(0)
    feed(w, 300, 150, 'grazing', 's2')
    feed(w, 451, 150, 'grazing', 's2')
    expect(out.length).toBe(0)
    feed(w, 601, 100, 'grazing', 's2')
    expect(out.length).toBe(1)
    expect(out[0].startRow).toBe(451)
  })

  it('drops a run that contains a missing value', () => {
    const out: RawWindow[] = []
    const w = new Windower('Test', (x) => out.push(x))
    feed(w, 0, 100, 'standing')
    w.push(100, Number.NaN, 0, 9.8, 'standing', 's1')
    feed(w, 101, 199, 'standing')
    expect(out.length).toBe(0)
  })
})

describe('labels', () => {
  it('maps both spellings of a label', () => {
    expect(LABEL_MAP[normaliseLabel('Walking_Rider')]).toBe('walk')
    expect(LABEL_MAP[normaliseLabel('trotting-natural')]).toBe('trot')
    expect(LABEL_MAP[normaliseLabel('Galloping_Rider')]).toBeUndefined()
  })
})
