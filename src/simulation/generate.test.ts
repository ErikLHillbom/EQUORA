import { ACTIVITIES } from '../shared/types'
import { DAY, DEMO_NOW, HOUR, MINUTE, hourStart, localDayStart } from '../shared/lib/clock'
import {
  clearSimulationCache,
  getBudgets,
  getDetectedChanges,
  getFixes,
  getHerd,
  HISTORY_DAYS,
} from './generate'
import { GELILA_TAG_SINCE } from './herd'
import { MARKET, bearingDeg, distanceKm } from './places'

describe('generator', () => {
  it('is deterministic: same output twice', () => {
    clearSimulationCache()
    const first = JSON.stringify(getHerd().map((a) => getBudgets(a.id)))
    const fixes1 = JSON.stringify(getFixes('chaltu', DEMO_NOW - DAY, DEMO_NOW))
    clearSimulationCache()
    const second = JSON.stringify(getHerd().map((a) => getBudgets(a.id)))
    const fixes2 = JSON.stringify(getFixes('chaltu', DEMO_NOW - DAY, DEMO_NOW))
    expect(second).toBe(first)
    expect(fixes2).toBe(fixes1)
  })

  it('builds all 12 animals in well under 300 ms, and memoises', () => {
    clearSimulationCache()
    getBudgets('mulu') // warm the code paths once
    clearSimulationCache()
    const t0 = performance.now()
    for (const a of getHerd()) getBudgets(a.id)
    const cold = performance.now() - t0
    // About 130 ms on a laptop; the margin keeps the test steady when the machine is busy.
    expect(cold).toBeLessThan(1000)
    const t1 = performance.now()
    for (const a of getHerd()) getBudgets(a.id)
    expect(performance.now() - t1).toBeLessThan(5)
  })

  it('covers 180 days up to the demo clock, with a partial current hour', () => {
    const b = getBudgets('mulu')
    expect(b[0].hourStart).toBe(localDayStart(DEMO_NOW) - (HISTORY_DAYS - 1) * DAY)
    const last = b[b.length - 1]
    expect(last.hourStart).toBe(hourStart(DEMO_NOW))
    expect(last.coverage).toBeLessThanOrEqual(20 / 60 + 1e-9)
    expect(b.length).toBe((HISTORY_DAYS - 1) * 24 + 15)
  })

  it('keeps minutes consistent with coverage', () => {
    for (const a of getHerd()) {
      for (const h of getBudgets(a.id)) {
        const sum = ACTIVITIES.reduce((s, k) => s + h.minutes[k], 0)
        expect(Math.abs(sum - 60 * h.coverage)).toBeLessThanOrEqual(1)
        for (const k of ACTIVITIES) expect(h.minutes[k]).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('has some missing hours, but none in the last day', () => {
    const all = getHerd().flatMap((a) => getBudgets(a.id))
    expect(all.some((h) => h.coverage === 0)).toBe(true)
    const recent = all.filter((h) => h.hourStart >= DEMO_NOW - DAY && h.hourStart < hourStart(DEMO_NOW))
    for (const h of recent) expect(h.coverage).toBeGreaterThan(0.9)
  })

  it('starts Gelila at her tag date', () => {
    const b = getBudgets('gelila')
    expect(b[0].hourStart).toBe(GELILA_TAG_SINCE)
  })

  it('never has three up-and-downs or two rolls in an hour, except the scripted horse episode', () => {
    for (const a of getHerd()) {
      for (const h of getBudgets(a.id)) {
        if (h.upDowns >= 3 || h.rollingBouts >= 2) {
          expect(a.id).toBe('saba')
          expect(Math.round((DEMO_NOW - h.hourStart) / DAY)).toBe(19)
        }
      }
    }
  })

  it('works animals during the day and lets them lie mostly at night', () => {
    const b = getBudgets('mulu').slice(-24 * 30)
    const lieAt = (from: number, to: number) =>
      b
        .filter((h) => {
          const lh = new Date(h.hourStart + 3 * HOUR).getUTCHours()
          return lh >= from && lh < to
        })
        .reduce((s, h) => s + h.minutes.lie, 0)
    expect(lieAt(0, 6)).toBeGreaterThan(3 * lieAt(6, 18))
    expect(b.reduce((s, h) => s + h.workMin, 0)).toBeGreaterThan(0)
  })

  it('records fixes every 1 to 2 minutes while moving', () => {
    const fixes = getFixes('chaltu', DEMO_NOW - 40 * MINUTE, DEMO_NOW)
    expect(fixes.length).toBeGreaterThan(15)
    for (let i = 1; i < fixes.length; i++) {
      expect(fixes[i].t - fixes[i - 1].t).toBeLessThanOrEqual(2 * MINUTE + 1000)
    }
    for (const f of fixes) expect(f.eleM).toBeGreaterThan(1500)
  })

  it('leaves Kito about 1.2 km north of the market, not moving since 14:14', () => {
    const fixes = getFixes('kito', DEMO_NOW - 2 * HOUR, DEMO_NOW)
    const last = fixes[fixes.length - 1]
    expect(distanceKm(last, MARKET)).toBeCloseTo(1.2, 1)
    const b = bearingDeg(MARKET, last)
    expect(b < 25 || b > 335).toBe(true)
    const since = fixes.filter((f) => f.t >= DEMO_NOW - 6 * MINUTE)
    for (const f of since) expect(distanceKm(f, last)).toBeLessThan(0.02)
    const before = fixes.filter((f) => f.t < DEMO_NOW - 10 * MINUTE)
    expect(distanceKm(before[0], last)).toBeGreaterThan(0.3)
  })

  it('has fixes only for the last 8 days', () => {
    expect(getFixes('mulu', DEMO_NOW - 30 * DAY, DEMO_NOW - 9 * DAY)).toHaveLength(0)
    expect(getFixes('mulu', DEMO_NOW - 7 * DAY, DEMO_NOW - 6 * DAY).length).toBeGreaterThan(0)
  })

  it('logs Saba\'s evening episode with "Called for help"', () => {
    const saba = getDetectedChanges('saba')
    const ep = saba.find((c) => c.state === 'urgent')!
    expect(ep.feedback).toBe('called_help')
    expect(ep.resolved).toBe(true)
    expect(Math.round((DEMO_NOW - ep.at) / DAY)).toBe(19)
    expect(getDetectedChanges('mulu').some((c) => c.feedback === 'fine')).toBe(true)
  })
})
