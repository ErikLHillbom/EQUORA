import { describe, expect, it } from 'vitest'
import { angleDeg, FallDetector, LyingDetector, RollingDetector, type SensingEvent, vedba } from './rules.ts'
import { synthSequence, synthWindow } from './synthetic.ts'

const UP: [number, number, number] = [0.2, -0.1, 0.97]
const ON_SIDE: [number, number, number] = [0.95, 0.1, 0.2]
const HEAD_DOWN: [number, number, number] = [0.2, 0.55, 0.8] // about 35 degrees from UP

function run<T extends { events: SensingEvent[] }>(windows: ReturnType<typeof synthSequence>, step: (w: (typeof windows)[number]) => T) {
  const results = windows.map(step)
  return { results, events: results.flatMap((r) => r.events) }
}

describe('window helpers', () => {
  it('measures angles and dynamic energy', () => {
    expect(angleDeg([0, 0, 1], [1, 0, 0])).toBeCloseTo(90)
    expect(vedba(synthWindow({ start: 0 }))).toBeLessThan(0.02)
    expect(vedba(synthWindow({ start: 0, bounce: 0.3 }))).toBeGreaterThan(0.1)
  })
})

describe('LyingDetector', () => {
  it('learns upright while walking, then reports lying after a sustained still deviation, then getting up', () => {
    const d = new LyingDetector()
    const walk = synthSequence(30, 0, (i) => ({ gravity: UP, bounce: 0.2, seed: i }))
    const lie = synthSequence(60, 60_000, (i) => ({ gravity: ON_SIDE, noise: 0.003, seed: 100 + i }))
    const up = synthSequence(10, 180_000, (i) => ({ gravity: UP, bounce: 0.2, seed: 200 + i }))
    const before = run(walk, (w) => d.update(w))
    expect(d.referenceReady).toBe(true)
    expect(before.results.at(-1)!.posture).toBe('standing')

    const lying = run(lie, (w) => d.update(w))
    // Not yet lying after 30 s, lying after 60 s.
    expect(lying.results[14].posture).toBe('standing')
    expect(lying.results.at(-1)!.posture).toBe('lying')
    expect(lying.events.map((e) => e.kind)).toEqual(['lieDown'])
    expect(lying.events[0].at).toBe(60_000)

    const after = run(up, (w) => d.update(w))
    expect(after.events.map((e) => e.kind)).toEqual(['getUp'])
    expect(after.results.at(-1)!.posture).toBe('standing')
  })

  it('reports unknown until it has seen the animal moving upright', () => {
    const d = new LyingDetector()
    const still = synthSequence(40, 0, (i) => ({ gravity: ON_SIDE, seed: i }))
    expect(still.map((w) => d.update(w).posture).every((p) => p === 'unknown')).toBe(true)
  })

  it('does not call grazing with the head down lying', () => {
    const d = new LyingDetector()
    synthSequence(30, 0, (i) => ({ gravity: UP, bounce: 0.2, seed: i })).forEach((w) => d.update(w))
    const graze = synthSequence(90, 60_000, (i) => ({ gravity: HEAD_DOWN, bounce: 0.08, freq: 3, seed: 50 + i }))
    const out = run(graze, (w) => d.update(w))
    expect(out.events).toEqual([])
    expect(out.results.at(-1)!.posture).toBe('standing')
  })

  it('uses the classifier label to learn the reference when given', () => {
    const d = new LyingDetector()
    synthSequence(20, 0, (i) => ({ gravity: UP, noise: 0.002, seed: i })).forEach((w) => d.update(w, 'stand'))
    expect(d.referenceReady).toBe(false)
    synthSequence(20, 40_000, (i) => ({ gravity: UP, bounce: 0.2, seed: i })).forEach((w) => d.update(w, 'walk'))
    expect(d.referenceReady).toBe(true)
  })
})

describe('RollingDetector', () => {
  it('fires once for repeated large swings with high energy', () => {
    const d = new RollingDetector()
    const dirs: [number, number, number][] = [UP, ON_SIDE, [-0.2, 0.1, -0.97], [-0.95, 0, 0.2], UP, ON_SIDE]
    const roll = synthSequence(6, 0, (i) => ({ gravity: dirs[i], gravityTo: dirs[(i + 1) % dirs.length], bounce: 0.5, seed: i }))
    const out = run(roll, (w) => d.update(w))
    expect(out.events.map((e) => e.kind)).toEqual(['roll'])
    expect(out.results.at(-1)!.rolling).toBe(true)
  })

  it('ignores trotting, which has energy but a steady orientation', () => {
    const d = new RollingDetector()
    const trot = synthSequence(30, 0, (i) => ({ gravity: UP, bounce: 0.7, freq: 2.6, noise: 0.05, seed: i }))
    expect(run(trot, (w) => d.update(w)).events).toEqual([])
  })

  it('ignores a single slow turn, such as lying down', () => {
    const d = new RollingDetector()
    const down = synthSequence(10, 0, (i) => ({ gravity: i < 3 ? UP : ON_SIDE, gravityTo: i === 2 ? ON_SIDE : undefined, bounce: i === 2 ? 0.4 : 0, seed: i }))
    expect(run(down, (w) => d.update(w)).events).toEqual([])
  })
})

describe('FallDetector', () => {
  it('reports impact, fast turn, then stillness as a fall', () => {
    const d = new FallDetector()
    const windows = [
      ...synthSequence(5, 0, (i) => ({ gravity: UP, bounce: 0.2, seed: i })),
      synthWindow({ start: 10_000, gravity: UP, gravityTo: ON_SIDE, spike: { index: 10, g: 4.2 }, bounce: 0.3, seed: 9 }),
      ...synthSequence(6, 12_000, (i) => ({ gravity: ON_SIDE, noise: 0.003, seed: 20 + i })),
    ]
    const out = run(windows, (w) => d.update(w))
    expect(out.events.map((e) => e.kind)).toEqual(['fall'])
    expect(out.events[0].at).toBe(10_000 + 10 * 40)
    expect(out.events[0].detail.peakG).toBeGreaterThanOrEqual(3)
  })

  it('ignores a bump without a turn', () => {
    const d = new FallDetector()
    const windows = [
      ...synthSequence(3, 0, (i) => ({ gravity: UP, bounce: 0.2, seed: i })),
      synthWindow({ start: 6_000, gravity: UP, spike: { index: 20, g: 4 }, seed: 5 }),
      ...synthSequence(6, 8_000, (i) => ({ gravity: UP, noise: 0.003, seed: 30 + i })),
    ]
    expect(run(windows, (w) => d.update(w)).events).toEqual([])
  })

  it('ignores lying down calmly, which turns without an impact', () => {
    const d = new FallDetector()
    const windows = [
      ...synthSequence(3, 0, (i) => ({ gravity: UP, bounce: 0.2, seed: i })),
      synthWindow({ start: 6_000, gravity: UP, gravityTo: ON_SIDE, bounce: 0.2, seed: 5 }),
      ...synthSequence(6, 8_000, (i) => ({ gravity: ON_SIDE, noise: 0.003, seed: 30 + i })),
    ]
    expect(run(windows, (w) => d.update(w)).events).toEqual([])
  })

  it('drops the alarm when the animal moves again straight after', () => {
    const d = new FallDetector()
    const windows = [
      ...synthSequence(3, 0, (i) => ({ gravity: UP, bounce: 0.2, seed: i })),
      synthWindow({ start: 6_000, gravity: UP, gravityTo: ON_SIDE, spike: { index: 10, g: 4 }, seed: 5 }),
      ...synthSequence(6, 8_000, (i) => ({ gravity: UP, bounce: 0.4, seed: 30 + i })),
    ]
    expect(run(windows, (w) => d.update(w)).events).toEqual([])
  })
})
