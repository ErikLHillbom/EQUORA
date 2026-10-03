// Small builders for hand-made hourly budgets. Used by tests in baseline, alerts and forecast.

import type { Activity, HourBudget } from '../shared/types'
import { DAY, HOUR, localDayStart, localHour } from '../shared/lib/clock'
import { createRng, gaussian } from '../shared/lib/random'

export interface HourOverrides extends Partial<Omit<HourBudget, 'minutes'>> {
  minutes?: Partial<Record<Activity, number>>
}

/** One hour; minutes not given fill up with standing so they sum to 60 * coverage. */
export function makeHour(hourStart: number, o: HourOverrides = {}): HourBudget {
  const coverage = o.coverage ?? 1
  const m: Record<Activity, number> = { stand: 0, walk: 0, trot: 0, eat: 0, roll: 0, lie: 0, unknown: 0, ...o.minutes }
  const used = m.walk + m.trot + m.eat + m.roll + m.lie + m.unknown
  if (o.minutes?.stand === undefined) m.stand = Math.max(0, Math.round(60 * coverage) - used)
  return {
    animalId: o.animalId ?? 'test',
    hourStart,
    coverage,
    minutes: m,
    lyingBouts: o.lyingBouts ?? 0,
    upDowns: o.upDowns ?? 0,
    rollingBouts: o.rollingBouts ?? 0,
    falls: o.falls ?? 0,
    odba: o.odba ?? 0.08,
    distanceKm: o.distanceKm ?? 0.1,
    climbM: o.climbM ?? 1,
    workMin: o.workMin ?? 0,
    tempC: o.tempC ?? 20,
    rh: o.rh ?? 60,
    waterStopMin: o.waterStopMin ?? 0,
  }
}

/**
 * A quiet, regular animal: `days` whole days before the day of `now`, then today's hours up to
 * now. Free time: eating about 30 min and walking about 5 min per hour by day, lying 20 min per
 * hour from 01:00 to 04:00. `shape` can change any hour.
 */
export function synthHistory(
  now: number,
  days: number,
  shape: (t: number, h: number, base: HourBudget) => HourBudget = (_t, _h, b) => b,
  seed = 'synth',
): HourBudget[] {
  const rng = createRng(seed)
  const out: HourBudget[] = []
  const start = localDayStart(now) - days * DAY
  for (let t = start; t <= now; t += HOUR) {
    const h = localHour(t)
    const night = h >= 1 && h <= 4
    const lie = night ? 20 : 0
    const eat = Math.round((night ? 20 : 30) * (1 + 0.08 * gaussian(rng)))
    const walk = Math.max(0, Math.round(5 * (1 + 0.2 * gaussian(rng))))
    out.push(shape(t, h, makeHour(t, { minutes: { eat, walk, lie }, lyingBouts: night && h === 1 ? 1 : 0, upDowns: h === 4 ? 1 : 0 })))
  }
  return out
}
