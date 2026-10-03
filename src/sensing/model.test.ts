import { describe, expect, it, vi } from 'vitest'
import goldenText from '../../ml/export/golden.json?raw'
import forestText from '../../public/models/activity-v1.json?raw'
import { FEATURE_NAMES } from './features.ts'
import { ActivityModel, type ForestJson } from './model.ts'

const forest = JSON.parse(forestText) as ForestJson
const golden = JSON.parse(goldenText) as {
  classes: string[]
  featureNames: string[]
  cases: { features: number[]; label: string; probs: number[] }[]
}

/** A one-split forest on feature 0, for small behaviour tests. */
function tinyForest(threshold = 0.5): ForestJson {
  return {
    version: 'test',
    kind: 'random-forest',
    classes: ['stand', 'walk'],
    featureNames: [...FEATURE_NAMES],
    hz: 25,
    windowSeconds: 2,
    confidenceThreshold: threshold,
    trees: [
      { feature: [0, -1, -1], threshold: [1.1, 0, 0], left: [1, 0, 1], right: [2, -1, -1], leaves: [0.9, 0.1, 0.2, 0.8] },
      { feature: [0, -1, -1], threshold: [1.2, 0, 0], left: [1, 0, 1], right: [2, -1, -1], leaves: [0.7, 0.3, 0, 1] },
    ],
  }
}

describe('ActivityModel', () => {
  it('matches scikit-learn on the golden vectors within 1e-5', () => {
    const model = new ActivityModel(forest)
    expect(model.classes).toEqual(golden.classes)
    expect(golden.featureNames).toEqual([...FEATURE_NAMES])
    expect(golden.cases.length).toBeGreaterThanOrEqual(30)
    let worst = 0
    for (const c of golden.cases) {
      const p = model.predictProba(Float32Array.from(c.features))
      c.probs.forEach((q, i) => {
        worst = Math.max(worst, Math.abs(p[i] - q))
      })
    }
    expect(worst).toBeLessThan(1e-5)
  })

  it('averages leaf distributions over trees and fills missing labels with 0', () => {
    const model = new ActivityModel(tinyForest())
    const x = new Float32Array(FEATURE_NAMES.length)
    x[0] = 1.0
    const low = model.classify(x)
    expect(low.label).toBe('stand')
    expect(low.probs.stand).toBeCloseTo(0.8)
    expect(low.probs.roll).toBe(0)
    expect(low.confident).toBe(true)
    x[0] = 1.15
    const mid = model.classify(x)
    expect(mid.probs.stand).toBeCloseTo(0.45)
    expect(mid.label).toBe('walk')
    expect(mid.confident).toBe(true)
  })

  it('is not confident below the threshold', () => {
    const model = new ActivityModel(tinyForest(0.6))
    const x = new Float32Array(FEATURE_NAMES.length)
    x[0] = 1.15
    expect(model.classify(x).confident).toBe(false)
  })

  it('refuses a model built on other features', () => {
    expect(() => new ActivityModel({ ...tinyForest(), featureNames: ['a', 'b'] })).toThrow(/features/)
  })

  it('loads from a URL', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(tinyForest()))) as unknown as typeof fetch
    const model = await ActivityModel.load('/models/x.json', fetchFn)
    expect(model.version).toBe('test')
    expect(fetchFn).toHaveBeenCalledWith('/models/x.json')
  })
})
