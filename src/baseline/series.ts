// Series for the trend charts: one point per day (7 days, 30 days, 6 months) and one point per
// hour (today), each with the animal's normal band.
//
// The band is median +/- 1.28 spread, which holds about 80% of values when they are roughly
// normal (P10 to P90), the same band the forecast uses.

import type { HourBudget, SignalId } from '../shared/types'
import { DAY, HOUR, localDayStart } from '../shared/lib/clock'
import { MIN_COVERAGE, budgetsBetween, computeBaseline, median, scaledMad } from './baseline'
import { SIGNAL_INFO, coveredMinutes, freeMinutes, signalValue, workloadOf } from './signals'

export const BAND_Z = 1.28

export interface SeriesPoint {
  /** Start of the day or hour, epoch ms. */
  t: number
  /** NaN when there is no data (or, for behaviour signals, no free time in that hour). */
  value: number
  median: number
  low: number
  high: number
  /** Share of the period with data, 0 to 1. */
  coverage: number
}

function band(med: number, spread: number, signal: SignalId) {
  const low = med - BAND_Z * spread
  const high = med + BAND_Z * spread
  const lo = Math.max(0, low)
  return { median: med, low: lo, high: signal === 'activity' ? Math.min(1, high) : high }
}

/**
 * One value per local day.
 * - activity: free-minute weighted mean share.
 * - lying, eating: minutes per day, scaled up for hours with no data.
 * - distance, climb: per day, scaled up for hours with no data.
 * - workload: hourly workload summed and divided by 8, capped at 100 (8 full work hours = 100).
 * - temperature: mean.
 * - waterDebt: not available here (NaN); see the forecast domain.
 */
export function dailyValue(day: HourBudget[], signal: SignalId): { value: number; coverage: number } {
  const good = day.filter((b) => b.coverage >= MIN_COVERAGE)
  const coverage = day.reduce((s, b) => s + b.coverage, 0) / 24
  if (good.length === 0 || signal === 'waterDebt') return { value: NaN, coverage }
  const covered = good.reduce((s, b) => s + coveredMinutes(b), 0)
  const scale = (24 * 60) / covered
  switch (signal) {
    case 'activity': {
      let w = 0
      let s = 0
      for (const b of good) {
        const v = signalValue(b, 'activity')
        if (!Number.isFinite(v)) continue
        const f = freeMinutes(b)
        w += f
        s += v * f
      }
      return { value: w > 0 ? s / w : NaN, coverage }
    }
    case 'lying':
      return { value: good.reduce((s, b) => s + b.minutes.lie, 0) * scale, coverage }
    case 'eating':
      return { value: good.reduce((s, b) => s + b.minutes.eat, 0) * scale, coverage }
    case 'distance':
      return { value: good.reduce((s, b) => s + b.distanceKm, 0) * scale, coverage }
    case 'climb':
      return { value: good.reduce((s, b) => s + b.climbM, 0) * scale, coverage }
    case 'workload':
      return { value: Math.min(100, good.reduce((s, b) => s + workloadOf(b), 0) / 8), coverage }
    case 'temperature':
      return { value: good.reduce((s, b) => s + b.tempC, 0) / good.length, coverage }
  }
}

/**
 * Daily values from the day containing `from` to the day containing `to`, each with a normal
 * band from the 14 days before it. Use for the 7 day, 30 day and 6 month charts.
 */
export function dailySeries(budgets: HourBudget[], signal: SignalId, from: number, to: number): SeriesPoint[] {
  const first = localDayStart(from)
  const last = localDayStart(to)
  const values: { t: number; value: number; coverage: number }[] = []
  for (let d = first - 14 * DAY; d <= last; d += DAY) {
    const { value, coverage } = dailyValue(budgetsBetween(budgets, d, d + DAY), signal)
    values.push({ t: d, value, coverage })
  }
  const out: SeriesPoint[] = []
  const floor = SIGNAL_INFO[signal].dailySpreadFloor
  for (let i = 14; i < values.length; i++) {
    const prior = values
      .slice(i - 14, i)
      .filter((p) => Number.isFinite(p.value) && p.coverage >= 0.5)
      .map((p) => p.value)
    const med = median(prior)
    const spread = Math.max(floor, scaledMad(prior, med) || 0)
    out.push({ t: values[i].t, value: values[i].value, coverage: values[i].coverage, ...band(med, spread, signal) })
  }
  return out
}

/** Today's hours up to now, each against the animal's normal for that hour of day. */
export function hourlySeries(budgets: HourBudget[], signal: SignalId, now: number): SeriesPoint[] {
  const baseline = computeBaseline(budgets, signal, now)
  const today = localDayStart(now)
  const out: SeriesPoint[] = []
  const todays = budgetsBetween(budgets, today, now + HOUR)
  for (let h = 0; h < 24; h++) {
    const t = today + h * HOUR
    if (t > now) break
    const b = todays.find((x) => x.hourStart === t)
    const cell = baseline.byHour[h]
    out.push({
      t,
      value: b ? signalValue(b, signal) : NaN,
      coverage: b ? b.coverage : 0,
      ...band(cell.median, cell.spread, signal),
    })
  }
  return out
}
