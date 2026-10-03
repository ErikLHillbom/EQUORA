import { describe, expect, it } from 'vitest'
import { DAY, DEMO_NOW, HOUR, localDayStart } from '../shared/lib/clock'
import { WATER_BANDS } from '../forecast'
import { getBudgets, herdMember } from '../simulation'
import { caseFile, departState, waterMatters } from './model'
import { compareAt, crossing, deficitAt } from './plans'
import { dailyTrend, isOutside, mainSignal, partDayValue, readings, todayTrend } from './readings'

const file = (id: string) => {
  const f = caseFile(id, DEMO_NOW)
  if (!f) throw new Error(id)
  return f
}

describe('today against the normal by this time of day', () => {
  it('keeps a normal donkey inside its normal', () => {
    const r = readings(herdMember('mulu').animal, getBudgets('mulu'), DEMO_NOW)
    for (const s of ['activity', 'eating', 'workload', 'waterDebt'] as const) {
      expect(r[s].low).not.toBeNull()
      expect(isOutside({ ...r[s], value: Number(r[s].value?.toFixed(1)) })).toBe(false)
    }
  })

  it('shows Bari quieter than her normal and Chaltu short of water', () => {
    expect(isOutside(file('bari').readings.activity)).toBe(true)
    expect(file('bari').readings.activity.value!).toBeLessThan(file('bari').readings.activity.low!)
    expect(isOutside(file('chaltu').readings.waterDebt)).toBe(true)
    expect(file('chaltu').readings.waterDebt.value!).toBeGreaterThan(WATER_BANDS.offer)
  })

  it('does not scale a part day up to a whole day', () => {
    const b = getBudgets('mulu')
    const sofar = partDayValue(b, 'distance', DEMO_NOW)
    const yesterdayWhole = partDayValue(b, 'distance', localDayStart(DEMO_NOW) - 1)
    expect(sofar).toBeGreaterThan(0)
    // Mulu works mornings: most of the day's distance is done by 14:20, never far above a whole day.
    expect(sofar).toBeLessThan(yesterdayWhole * 1.3)
  })

  it('has no normal while the tag is still learning', () => {
    const r = file('gelila').readings
    expect(r.activity.value).not.toBeNull()
    expect(r.activity.low).toBeNull()
  })

  it('puts the highlight on the card behind the state', () => {
    expect(file('bari').main).toBe('activity')
    expect(file('chaltu').main).toBe('waterDebt')
    expect(file('kito').main).toBe('lying')
    expect(mainSignal(undefined, 'normal')).toBe('activity')
    expect(departState('normal')).toBe('not_sure')
    expect(departState('check')).toBe('check')
  })
})

describe('trend series', () => {
  it('today runs from midnight to now with a forecast to midnight', () => {
    const a = herdMember('bari').animal
    const tr = todayTrend(a, getBudgets('bari'), 'activity', DEMO_NOW)
    expect(tr.data[0].t).toBe(localDayStart(DEMO_NOW))
    expect(tr.data.at(-1)!.t).toBeLessThanOrEqual(DEMO_NOW)
    expect(tr.forecast!.length).toBeGreaterThan(0)
    expect(tr.forecast!.at(-1)!.t).toBeLessThanOrEqual(localDayStart(DEMO_NOW) + DAY)
    for (const p of tr.data) expect(Number.isFinite(p.low) && Number.isFinite(p.high)).toBe(true)
  })

  it('7 days leaves today out of the measured line and projects it', () => {
    const a = herdMember('bari').animal
    const tr = dailyTrend(a, getBudgets('bari'), 'eating', 'd7', DEMO_NOW)
    const end = localDayStart(DEMO_NOW) + DAY
    expect(tr.data.find((p) => p.t === end)?.value).toBeNull()
    expect(tr.forecast?.at(-1)?.t).toBe(end)
    const f = tr.forecast!.at(-1)!
    expect(f.p10).toBeLessThanOrEqual(f.p50)
    expect(f.p50).toBeLessThanOrEqual(f.p90)
  })

  it('6 months has a point per day', () => {
    const tr = dailyTrend(herdMember('mulu').animal, getBudgets('mulu'), 'distance', 'm6', DEMO_NOW)
    expect(tr.data.length).toBeGreaterThan(150)
    expect(tr.forecast).toBeUndefined()
  })

  it('water today has hourly values and the projection ahead', () => {
    const tr = todayTrend(herdMember('chaltu').animal, getBudgets('chaltu'), 'waterDebt', DEMO_NOW)
    expect(tr.data.at(-1)!.t).toBe(DEMO_NOW)
    expect(tr.data.at(-1)!.value!).toBeGreaterThan(3)
    expect(tr.forecast![0].t).toBeGreaterThan(DEMO_NOW)
  })
})

describe('water plans', () => {
  it('appear for Chaltu only among the five', () => {
    expect(waterMatters(file('chaltu').assessment)).toBe(true)
    for (const id of ['bari', 'kito', 'mulu', 'gelila']) expect(file(id).whatIf).toBeUndefined()
  })

  it('compare at 18:00 and rest at water stays under 5%', () => {
    const w = file('chaltu').whatIf!
    const at = compareAt(DEMO_NOW, w.continue_work.water)
    expect(at).toBe(localDayStart(DEMO_NOW) + 18 * HOUR)
    expect(deficitAt(w.continue_work.water, at)).toBeGreaterThan(deficitAt(w.rest_at_water.water, at))
    expect(crossing(w.continue_work.water, 5)).toBeDefined()
    expect(crossing(w.rest_at_water.water, 5)).toBeUndefined()
  })
})

describe('case file', () => {
  it('is null for an id outside the herd', () => {
    expect(caseFile('nobody', DEMO_NOW)).toBeNull()
  })

  it('gives no next steps for a normal animal and some for the others', () => {
    expect(file('mulu').recommendations).toEqual([])
    for (const id of ['bari', 'chaltu', 'kito', 'gelila']) expect(file(id).recommendations.length).toBeGreaterThan(0)
  })
})
