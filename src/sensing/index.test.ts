import { describe, expect, it } from 'vitest'
import metricsText from '../../public/models/metrics.json?raw'
import { ACTIVITIES } from '../shared/types.ts'
import { FEATURE_NAMES, loadMetrics, type ModelMetrics } from './index.ts'
import { strings } from './strings.ts'

describe('metrics.json', () => {
  const m = JSON.parse(metricsText) as ModelMetrics

  it('has the fields the screens read, with values in range', () => {
    expect(m.version).toBe('activity-v1')
    expect(m.cvMethod).toBe('leave-one-horse-out')
    expect(m.featureNames).toEqual([...FEATURE_NAMES])
    for (const v of [m.accuracy, m.macroF1, m.confidenceThreshold, m.coverageAtThreshold, m.accuracyAtThreshold]) {
      expect(v).toBeGreaterThan(0)
      expect(v).toBeLessThanOrEqual(1)
    }
    expect(m.confusion.matrix.length).toBe(m.confusion.labels.length)
    expect(m.subjectsInShippedModel).not.toContain(m.replaySubject)
    expect(m.modelBytes).toBeGreaterThan(1000)
  })

  it('loads through fetch', async () => {
    const fetchFn = (async () => new Response(metricsText)) as unknown as typeof fetch
    expect((await loadMetrics('/models/metrics.json', fetchFn)).version).toBe('activity-v1')
  })
})

describe('sensing strings', () => {
  it('names every activity in English and Amharic', () => {
    for (const a of ACTIVITIES) {
      expect(strings.en[`sensing.activity.${a}`], a).toBeTruthy()
      expect(strings.am?.[`sensing.activity.${a}`], a).toBeTruthy()
    }
  })
})
