import { describe, expect, it } from 'vitest'
import { STATE_PRIORITY } from '../shared/types'
import { hasKey } from '../i18n'
import { herdData } from './herdData'

describe('herdData on the demo herd', () => {
  const data = herdData()

  it('has every animal, the one to visit first at the top', () => {
    expect(data.rows).toHaveLength(12)
    const p = data.rows.map((r) => STATE_PRIORITY[r.assessment.state])
    expect([...p].sort((a, b) => b - a)).toEqual(p)
  })

  it('gives every insight a sentence in the string table', () => {
    expect(data.insights.length).toBeGreaterThan(0)
    for (const line of data.insights) expect(hasKey(line.textKey)).toBe(true)
  })

  it('lists only real departures from normal', () => {
    for (const r of data.top) expect(Math.abs(r.deviation.z)).toBeGreaterThan(1.28)
  })
})
