import { describe, expect, it } from 'vitest'
import { DAY, HOUR, localDayStart } from '../shared/lib/clock'
import type { Activity, HourBudget } from '../shared/types'
import {
  belowNormalActivity,
  deviationSince,
  hotAfternoons,
  insightLines,
  largestWorkChange,
  oneDecimal,
  signedMin,
  signedPct,
  todayTotals,
  topDeviations,
  weekChange,
  type Deviation,
} from './insights'

// A fixed "now": 14:20 local on a Saturday, like the demo clock.
const NOW = Date.UTC(2026, 9, 3, 11, 20)
const TODAY = localDayStart(NOW)

interface HourOpts {
  minutes?: Partial<Record<Activity, number>>
  workMin?: number
  distanceKm?: number
  climbM?: number
  tempC?: number
  coverage?: number
}

function hour(hourStart: number, o: HourOpts = {}): HourBudget {
  const m: Record<Activity, number> = { stand: 0, walk: 0, trot: 0, eat: 0, roll: 0, lie: 0, unknown: 0, ...o.minutes }
  const used = m.walk + m.trot + m.eat + m.roll + m.lie + m.unknown
  if (o.minutes?.stand === undefined) m.stand = Math.max(0, 60 - used)
  return {
    animalId: 'a',
    hourStart,
    coverage: o.coverage ?? 1,
    minutes: m,
    lyingBouts: 0,
    upDowns: 0,
    rollingBouts: 0,
    falls: 0,
    odba: 0.08,
    distanceKm: o.distanceKm ?? 0,
    climbM: o.climbM ?? 0,
    workMin: o.workMin ?? 0,
    tempC: o.tempC ?? 20,
    rh: 60,
    waterStopMin: 0,
  }
}

/** Hourly budgets from `days` days before today up to now, built by `f(hourStart)`. */
function series(days: number, f: (t: number) => HourOpts): HourBudget[] {
  const out: HourBudget[] = []
  for (let t = TODAY - days * DAY; t <= NOW; t += HOUR) out.push(hour(t, f(t)))
  return out
}

describe('todayTotals', () => {
  it('sums since local midnight only', () => {
    const b = series(2, () => ({ distanceKm: 0.5, climbM: 10, workMin: 30, minutes: { lie: 6 } }))
    const tot = todayTotals(b, NOW)
    // 00:00 to 14:00 local is 15 hours.
    expect(tot.hoursWithData).toBe(15)
    expect(tot.km).toBeCloseTo(7.5)
    expect(tot.climbM).toBe(150)
    expect(tot.workH).toBeCloseTo(7.5)
    expect(tot.lyingH).toBeCloseTo(1.5)
  })
})

describe('deviationSince', () => {
  const normal = (t: number): HourOpts => (t < TODAY ? { minutes: { eat: 30, walk: 6 } } : {})

  it('finds activity well below the normal for the same hours', () => {
    // 14 days at 36 active minutes of 60, then a quiet morning with 12.
    const b = series(16, (t) => (t < TODAY ? { minutes: { eat: 30, walk: 6 } } : { minutes: { eat: 10, walk: 2 } }))
    const d = deviationSince(b, 'activity', NOW, NOW - 6 * HOUR)!
    expect(d).not.toBeNull()
    expect(d.pct).toBeCloseTo(-66.7, 0)
    expect(d.z).toBeLessThan(-3)
    expect(d.hours).toBe(6)
  })

  it('is null while the normal is still being learned', () => {
    const b = series(1, normal)
    expect(deviationSince(b, 'activity', NOW)).toBeNull()
  })

  it('reports lying in minutes, not %, when the normal is near zero', () => {
    const b = series(16, (t) => (t >= NOW - 3 * HOUR ? { minutes: { lie: 20 } } : {}))
    const d = deviationSince(b, 'lying', NOW, NOW - 6 * HOUR)!
    expect(Number.isNaN(d.pct)).toBe(true)
    // Three hours with 20 lying minutes each, against a normal of none.
    expect(d.diffMin).toBeCloseTo(60, 0)
  })
})

const dev = (signal: Deviation['signal'], z: number, pct = -10): Deviation => ({
  signal,
  z,
  pct,
  actual: 0,
  normal: 0,
  diffMin: NaN,
  hours: 4,
})

describe('topDeviations and belowNormalActivity', () => {
  const byId = {
    bari: { activity: dev('activity', -3.5), eating: dev('eating', -2.4), lying: dev('lying', 11) },
    mulu: { activity: dev('activity', -0.4) },
    saba: { activity: dev('activity', 1.4, 12) },
    gelila: { activity: null },
  }

  it('lists only values outside the normal band, largest first', () => {
    const top = topDeviations(byId)
    expect(top.map((r) => `${r.animalId}:${r.deviation.signal}`)).toEqual(['bari:lying', 'bari:activity', 'bari:eating', 'saba:activity'])
  })

  it('counts animals below their own normal activity at the same time', () => {
    expect(belowNormalActivity(byId)).toEqual(['bari'])
  })
})

describe('weekChange and largestWorkChange', () => {
  // Group a works 2 h a day this week and 1 h last week; group b the same both weeks.
  const a = series(15, (t) => ({ workMin: t >= NOW - 7 * DAY ? 120 / 24 : 60 / 24 }))
  const b = series(15, () => ({ workMin: 60 / 24, distanceKm: 0.25 }))

  it('compares the last 7 days with the 7 before', () => {
    const c = weekChange([a], NOW, 'workH')
    expect(c.thisWeek).toBeCloseTo(14, 0)
    expect(c.lastWeek).toBeCloseTo(7, 0)
    expect(c.pct).toBeCloseTo(100, 0)
    expect(weekChange([b], NOW, 'km').pct).toBeCloseTo(0, 5)
  })

  it('picks the group that changed most', () => {
    const best = largestWorkChange({ a: [a], b: [b], empty: [] }, NOW)!
    expect(best.groupId).toBe('a')
    expect(best.animals).toBe(1)
  })
})

describe('hotAfternoons', () => {
  // Days 1 to 3 before today are hot (30 deg C) and quiet; the others are 20 deg C.
  const hotDay = (t: number) => {
    const k = Math.round((TODAY - localDayStart(t)) / DAY)
    return k >= 1 && k <= 3
  }
  const b = series(8, (t) => (hotDay(t) ? { tempC: 30, minutes: { eat: 15 } } : { tempC: 20, minutes: { eat: 30 } }))

  it('compares activity on the hottest afternoons with the others', () => {
    const h = hotAfternoons([b], NOW)!
    expect(h.hotDays).toHaveLength(3)
    expect(h.hotTempC).toBeCloseTo(30)
    expect(h.otherTempC).toBeCloseTo(20)
    expect(h.otherDays).toBe(4)
    expect(h.pct).toBeCloseTo(-50, 0)
  })

  it('needs enough days', () => {
    expect(hotAfternoons([series(3, () => ({}))], NOW)).toBeNull()
  })
})

describe('insightLines', () => {
  const heat = {
    hotDays: [1, 2, 3],
    hotTempC: 30,
    otherTempC: 20,
    minTempC: 19.6,
    maxTempC: 30.2,
    hotActivity: 0.3,
    otherActivity: 0.5,
    pct: -40,
    otherDays: 4,
  }

  it('states what the numbers show', () => {
    const lines = insightLines({
      work: { groupId: 'domorso', animals: 3, thisWeek: 36.4, lastWeek: 30, pct: 21.3 },
      distance: { thisWeek: 100, lastWeek: 98, pct: 2 },
      heat,
      belowNames: ['Bari', 'Mulu', 'Kito'],
    })
    const byId = Object.fromEntries(lines.map((l) => [l.id, l]))
    expect(byId.below.textKey).toBe('herd.insight.belowMany')
    expect(byId.below.params.count).toBe(3)
    expect(byId.work.textKey).toBe('herd.insight.workUp')
    expect(byId.work.params).toMatchObject({ pct: 21, now: 36, before: 30, groupKey: 'simulation.household.domorso' })
    expect(byId.distance.textKey).toBe('herd.insight.distanceSame')
    expect(byId.heat.textKey).toBe('herd.insight.heatDown')
    expect(byId.heat.params.pct).toBe(40)
  })

  it('does not compare by heat when the afternoons were all alike', () => {
    const lines = insightLines({ work: null, distance: null, heat: { ...heat, hotTempC: 26.2, otherTempC: 25.7 }, belowNames: [] })
    expect(lines.find((l) => l.id === 'heat')!.textKey).toBe('herd.insight.heatFlat')
    expect(lines.find((l) => l.id === 'below')!.textKey).toBe('herd.insight.below0')
    expect(lines.some((l) => l.id === 'work')).toBe(false)
  })
})

describe('number formats', () => {
  it('signs and rounds', () => {
    expect(signedPct(-31.4)).toBe('-31%')
    expect(signedPct(8.6)).toBe('+9%')
    expect(signedPct(0.2)).toBe('0%')
    expect(signedMin(52.4)).toBe('+52 min')
    expect(oneDecimal(9.96)).toBe('10')
    expect(oneDecimal(7.44)).toBe('7.4')
    expect(oneDecimal(26.17)).toBe('26')
  })
})
