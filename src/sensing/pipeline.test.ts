import { describe, expect, it } from 'vitest'
import forestText from '../../public/models/activity-v1.json?raw'
import type { ClassifierLabel } from '../shared/types.ts'
import { FEATURE_NAMES } from './features.ts'
import { ActivityModel, type ForestJson } from './model.ts'
import { createPipeline, decideActivity } from './pipeline.ts'
import { loadReplay, type Replay, replaySequence } from './replay.ts'
import { synthSequence, synthWindow } from './synthetic.ts'

/** Reads public/ from disk, standing in for the browser's fetch. */
async function fileFetch(url: string): Promise<Response> {
  const fsName = 'node:fs'
  const fs = (await import(/* @vite-ignore */ fsName)) as { readFileSync: (p: string) => Uint8Array }
  const bytes = fs.readFileSync(`public${url}`)
  return new Response(new Uint8Array(bytes))
}

const model = new ActivityModel(JSON.parse(forestText) as ForestJson)

/** A model that always answers the same, for rule and counter tests. */
function fixedModel(label: ClassifierLabel, p = 0.9): ActivityModel {
  return new ActivityModel({
    version: 'fixed',
    kind: 'random-forest',
    classes: [label, label === 'stand' ? 'walk' : 'stand'],
    featureNames: [...FEATURE_NAMES],
    hz: 25,
    windowSeconds: 2,
    confidenceThreshold: 0.5,
    trees: [{ feature: [-1], threshold: [0], left: [0], right: [-1], leaves: [p, 1 - p] }],
  })
}

const UP: [number, number, number] = [0.2, -0.1, 0.97]
const ON_SIDE: [number, number, number] = [0.95, 0.1, 0.2]

describe('decideActivity', () => {
  const c = { label: 'eat' as const, probs: { stand: 0, walk: 0, trot: 0, eat: 0.9, roll: 0 }, confident: true }
  it('puts the rules before the classifier', () => {
    expect(decideActivity(c, 'standing', true)).toBe('roll')
    expect(decideActivity(c, 'lying', false)).toBe('lie')
    expect(decideActivity(c, 'standing', false)).toBe('eat')
    expect(decideActivity({ ...c, confident: false }, 'unknown', false)).toBe('unknown')
  })
})

describe('createPipeline', () => {
  it('counts windows and minutes per activity', () => {
    const p = createPipeline(fixedModel('walk'))
    synthSequence(30, 0, (i) => ({ gravity: UP, bounce: 0.2, seed: i })).forEach((w) => p.push(w))
    const c = p.counters()
    expect(c.windowsProcessed).toBe(30)
    expect(c.minutes.walk).toBeCloseTo(1)
    expect(c.notSure).toBe(0)
  })

  it('counts low-confidence windows as not sure', () => {
    const unsure = new ActivityModel({
      version: 'unsure',
      kind: 'random-forest',
      classes: ['walk', 'stand', 'eat'],
      featureNames: [...FEATURE_NAMES],
      hz: 25,
      windowSeconds: 2,
      confidenceThreshold: 0.5,
      trees: [{ feature: [-1], threshold: [0], left: [0], right: [-1], leaves: [0.45, 0.35, 0.2] }],
    })
    const p = createPipeline(unsure)
    const out = p.push(synthWindow({ start: 0 }))
    expect(out.classification.confident).toBe(false)
    expect(out.activity).toBe('unknown')
    expect(out.counters.notSure).toBe(1)
  })

  it('reports a lying bout, moves its first minute into lie, and counts the up-down', () => {
    const p = createPipeline(fixedModel('walk'))
    const outs = [
      ...synthSequence(30, 0, (i) => ({ gravity: UP, bounce: 0.2, seed: i })),
      ...synthSequence(60, 60_000, (i) => ({ gravity: ON_SIDE, noise: 0.003, seed: 100 + i })),
      ...synthSequence(5, 180_000, (i) => ({ gravity: UP, bounce: 0.2, seed: 200 + i })),
    ].map((w) => p.push(w))
    const kinds = outs.flatMap((o) => o.events.map((e) => e.kind))
    expect(kinds).toEqual(['lieDown', 'getUp'])
    const c = p.counters()
    expect(c.lyingBouts).toBe(1)
    expect(c.upDowns).toBe(1)
    // 60 lying windows of 2 s, all counted as lie once the bout is confirmed, plus the first
    // upright window: getting up needs two upright windows in a row.
    expect(c.minutes.lie).toBeCloseTo(2 + 2 / 60)
    expect(outs[89].posture).toBe('lying')
  })

  it('counts a fall and a rolling bout', () => {
    const p = createPipeline(fixedModel('walk'))
    synthSequence(5, 0, (i) => ({ gravity: UP, bounce: 0.2, seed: i })).forEach((w) => p.push(w))
    p.push(synthWindow({ start: 10_000, gravity: UP, gravityTo: ON_SIDE, spike: { index: 10, g: 4.2 }, bounce: 0.3, seed: 9 }))
    synthSequence(6, 12_000, (i) => ({ gravity: ON_SIDE, noise: 0.003, seed: 20 + i })).forEach((w) => p.push(w))
    const dirs: [number, number, number][] = [ON_SIDE, [-0.2, 0.1, -0.97], [-0.95, 0, 0.2], UP, ON_SIDE]
    synthSequence(5, 24_000, (i) => ({ gravity: dirs[i], gravityTo: dirs[(i + 1) % 5], bounce: 0.5, seed: 40 + i })).forEach((w) =>
      p.push(w),
    )
    const c = p.counters()
    expect(c.falls).toBe(1)
    expect(c.rollingBouts).toBe(1)
    expect(c.minutes.roll).toBeGreaterThan(0)
  })

  it('starts again after reset', () => {
    const p = createPipeline(fixedModel('stand'))
    p.push(synthWindow({ start: 0 }))
    p.reset()
    expect(p.counters().windowsProcessed).toBe(0)
  })
})

describe('replay through the real model', () => {
  let replay: Replay

  it('loads every clip listed in the manifest', async () => {
    replay = await loadReplay('/replay/', fileFetch as typeof fetch)
    expect(replay.clips.map((c) => c.label)).toEqual(replay.manifest.clips.map((c) => c.label))
    for (const c of replay.clips) expect(c.windows[0].ax.length).toBe(50)
  })

  it('classifies the held-out horse mostly right', () => {
    const p = createPipeline(model)
    const seq = replaySequence(replay, ['stand', 'walk', 'trot', 'eat'])
    const byLabel: Record<string, { n: number; ok: number }> = {}
    for (const { window, label } of seq) {
      const out = p.push(window)
      byLabel[label] ??= { n: 0, ok: 0 }
      byLabel[label].n++
      if (out.classification.label === label) byLabel[label].ok++
    }
    for (const [label, { n, ok }] of Object.entries(byLabel)) {
      expect(ok / n, label).toBeGreaterThan(0.7)
    }
    // Real collar data of a standing, walking, trotting and grazing horse: no rule events.
    const c = p.counters()
    expect(c.falls).toBe(0)
    expect(c.rollingBouts).toBe(0)
    expect(c.lyingBouts).toBe(0)
  })

  it('backs up the rare roll class with the rolling rule on real rolling data', () => {
    const p = createPipeline(model)
    const events = replaySequence(replay, ['roll']).flatMap(({ window }) => p.push(window).events)
    expect(events.filter((e) => e.kind === 'roll').length).toBeGreaterThanOrEqual(1)
    expect(p.counters().minutes.roll).toBeGreaterThan(0)
  })
})
