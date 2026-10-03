// Numbers for the case file: today so far against the animal's own normal by this time of day,
// and the series behind the trend charts.
//
// Today is a part day. Comparing 14 hours of today with whole past days would make every
// working animal look short of its normal, and scaling today up to 24 hours would make a
// morning of work look like a double day. So "normal for Mulu" on the Today cards is the
// same part of the day (midnight to now) on each of the 14 days before today: median plus or
// minus 1.28 spread (scaled MAD), the band the baseline domain uses for the trend charts.

import type { Animal, ForecastPoint, HourBudget, ReasonKind, SignalId, StateId } from '../shared/types'
import { DAY, HOUR, MINUTE, localDayStart } from '../shared/lib/clock'
import {
  BAND_Z,
  SIGNAL_INFO,
  budgetsBetween,
  coveredMinutes,
  dailySeries,
  freeMinutes,
  hourlySeries,
  median,
  scaledMad,
  signalValue,
  workloadOf,
} from '../baseline'
import { deficitPct, forecastSignal, waterStateAt } from '../forecast'
import { weatherAt } from '../simulation'
import type { BandPoint } from '../shared/charts'

export const CARD_SIGNALS = ['activity', 'lying', 'eating', 'workload', 'distance', 'climb', 'waterDebt'] as const
export type CardSignal = (typeof CARD_SIGNALS)[number]

/** Past days that make the normal for the Today cards. */
export const NORMAL_DAYS = 14
/** Fewer past days than this and the card says the normal is not learned yet. */
const MIN_NORMAL_DAYS = 3
/** Less than this share of the part day recorded, and today has no value. */
const MIN_PART_COVERAGE = 0.5

/** Smallest spread for a part-day value, as a share of the whole-day floor (sums) or as is. */
const PART_FLOOR: Record<CardSignal, { floor: number; perDay: boolean }> = {
  activity: { floor: SIGNAL_INFO.activity.dailySpreadFloor, perDay: false },
  lying: { floor: SIGNAL_INFO.lying.dailySpreadFloor, perDay: true },
  eating: { floor: SIGNAL_INFO.eating.dailySpreadFloor, perDay: true },
  workload: { floor: SIGNAL_INFO.workload.dailySpreadFloor, perDay: true },
  distance: { floor: SIGNAL_INFO.distance.dailySpreadFloor, perDay: true },
  climb: { floor: SIGNAL_INFO.climb.dailySpreadFloor, perDay: true },
  waterDebt: { floor: SIGNAL_INFO.waterDebt.dailySpreadFloor, perDay: false },
}

export interface Reading {
  signal: CardSignal
  /** Today so far, in display units (activity in %). null when the tag has too little data. */
  value: number | null
  /** The animal's normal by this time of day, in display units. null while it is learned. */
  low: number | null
  high: number | null
  /** Past days behind the normal. */
  days: number
}

/** Display scale: activity is a share (0 to 1) and shows as a percentage. */
export function toDisplay(signal: SignalId, v: number): number {
  return signal === 'activity' ? v * 100 : v
}

/** Share of a budget's minutes that fall inside [from, to). Today's open hour holds only what was recorded. */
function share(b: HourBudget, to: number): number {
  if (b.hourStart + HOUR <= to) return 1
  const f = Math.max(0, (to - b.hourStart) / HOUR)
  return b.coverage > 0 ? Math.min(1, f / b.coverage) : 0
}

/** One signal from midnight to `to`, scaled up for minutes without data. NaN when too little was recorded. */
export function partDayValue(budgets: HourBudget[], signal: Exclude<CardSignal, 'waterDebt'>, to: number): number {
  const from = localDayStart(to)
  const hours = budgetsBetween(budgets, from, to)
  const elapsed = (to - from) / MINUTE
  let covered = 0
  let sum = 0
  let weight = 0
  for (const b of hours) {
    const c = share(b, to)
    if (c <= 0 || b.coverage <= 0) continue
    covered += coveredMinutes(b) * c
    switch (signal) {
      case 'activity': {
        const v = signalValue(b, 'activity')
        if (!Number.isFinite(v)) break
        const w = freeMinutes(b) * c
        sum += v * w
        weight += w
        break
      }
      case 'lying':
        sum += b.minutes.lie * c
        break
      case 'eating':
        sum += b.minutes.eat * c
        break
      case 'workload':
        sum += (workloadOf(b) * c) / 8
        break
      case 'distance':
        sum += b.distanceKm * c
        break
      case 'climb':
        sum += b.climbM * c
        break
    }
  }
  if (elapsed <= 0 || covered < MIN_PART_COVERAGE * elapsed) return NaN
  if (signal === 'activity') return weight > 0 ? sum / weight : NaN
  const v = sum * (elapsed / covered)
  return signal === 'workload' ? Math.min(100, v) : v
}

function valueAt(animal: Animal, budgets: HourBudget[], signal: CardSignal, t: number): number {
  if (signal === 'waterDebt') {
    // The water model starts from no debt 36 hours back, so it needs budgets before t.
    if (!budgets.length || budgets[0].hourStart > t - 36 * HOUR) return NaN
    return deficitPct(waterStateAt(animal, budgets, t), animal)
  }
  return partDayValue(budgets, signal, t)
}

/** Today so far and the normal by this time of day, for one signal. */
export function reading(animal: Animal, budgets: HourBudget[], signal: CardSignal, now: number): Reading {
  const today = valueAt(animal, budgets, signal, now)
  const past: number[] = []
  for (let k = 1; k <= NORMAL_DAYS; k++) {
    const v = valueAt(animal, budgets, signal, now - k * DAY)
    if (Number.isFinite(v)) past.push(v)
  }
  const value = Number.isFinite(today) ? toDisplay(signal, today) : null
  if (past.length < MIN_NORMAL_DAYS) return { signal, value, low: null, high: null, days: past.length }
  const med = median(past)
  const { floor, perDay } = PART_FLOOR[signal]
  const dayShare = (now - localDayStart(now)) / DAY
  const spread = Math.max(perDay ? floor * dayShare : floor, scaledMad(past, med) || 0)
  let low = Math.max(0, med - BAND_Z * spread)
  let high = med + BAND_Z * spread
  if (signal === 'activity') high = Math.min(1, high)
  low = toDisplay(signal, low)
  high = toDisplay(signal, high)
  return { signal, value, low, high, days: past.length }
}

export function readings(animal: Animal, budgets: HourBudget[], now: number): Record<CardSignal, Reading> {
  return Object.fromEntries(CARD_SIGNALS.map((s) => [s, reading(animal, budgets, s, now)])) as Record<CardSignal, Reading>
}

export function isOutside(r: Reading): boolean {
  return r.value != null && r.low != null && r.high != null && (r.value < r.low || r.value > r.high)
}

/** The card that carries the first reason of the state, so it gets the one highlight. */
export function mainSignal(reasonKind: ReasonKind | undefined, state: StateId): CardSignal {
  if (state === 'normal' || state === 'not_sure' || !reasonKind) return 'activity'
  switch (reasonKind) {
    case 'eating':
      return 'eating'
    case 'lying':
    case 'longLying':
    case 'fall':
    case 'upDowns':
    case 'rolling':
      return 'lying'
    case 'waterDebt':
    case 'noRest':
    case 'heat':
      return 'waterDebt'
    case 'workload':
    case 'distance':
    case 'climb':
      return reasonKind
    default:
      return 'activity'
  }
}

// ---------- Trend series ----------

export type Range = 'today' | 'd7' | 'd30' | 'm6'
export const RANGE_DAYS: Record<Exclude<Range, 'today'>, number> = { d7: 7, d30: 30, m6: 180 }

export interface Trend {
  data: BandPoint[]
  forecast?: ForecastPoint[]
  now?: number
}

const finite = (...xs: number[]) => xs.every(Number.isFinite)

/** Today's hours against the normal for each hour, and the expected rest of today. */
export function todayTrend(animal: Animal, budgets: HourBudget[], signal: CardSignal, now: number): Trend {
  const dayStart = localDayStart(now)
  const hoursLeft = Math.max(1, Math.ceil((dayStart + DAY - now) / HOUR))
  if (signal === 'waterDebt') return todayWaterTrend(animal, budgets, now, hoursLeft)
  const data: BandPoint[] = hourlySeries(budgets, signal, now)
    .filter((p) => finite(p.low, p.high))
    .map((p) => ({
      t: p.t,
      value: Number.isFinite(p.value) ? toDisplay(signal, p.value) : null,
      low: toDisplay(signal, p.low),
      high: toDisplay(signal, p.high),
    }))
  const forecast = forecastSignal(animal, budgets, signal, now, { horizonH: hoursLeft })
    .points.filter((p) => finite(p.p10, p.p50, p.p90))
    .map((p) => ({ t: p.t, p10: toDisplay(signal, p.p10), p50: toDisplay(signal, p.p50), p90: toDisplay(signal, p.p90) }))
  return { data, forecast, now }
}

function todayWaterTrend(animal: Animal, budgets: HourBudget[], now: number, hoursLeft: number): Trend {
  const dayStart = localDayStart(now)
  const times: number[] = []
  for (let t = dayStart; t < now; t += HOUR) times.push(t)
  times.push(now)
  const data: BandPoint[] = []
  for (const t of times) {
    const past: number[] = []
    for (let k = 1; k <= NORMAL_DAYS; k++) {
      const v = valueAt(animal, budgets, 'waterDebt', t - k * DAY)
      if (Number.isFinite(v)) past.push(v)
    }
    if (past.length < MIN_NORMAL_DAYS) continue
    const med = median(past)
    const spread = Math.max(PART_FLOOR.waterDebt.floor, scaledMad(past, med) || 0)
    const v = valueAt(animal, budgets, 'waterDebt', t)
    data.push({ t, value: Number.isFinite(v) ? v : null, low: Math.max(0, med - BAND_Z * spread), high: med + BAND_Z * spread })
  }
  const forecast = forecastSignal(animal, budgets, 'waterDebt', now, { horizonH: hoursLeft, weather: weatherAt }).points
  return { data, forecast, now }
}

/**
 * One point per whole day, placed at the end of the day (when its total is complete). For the
 * 7 day range, today's total is projected: what was recorded so far plus the expected rest of
 * the day from the hourly forecast. Summing the P10 and P90 of each hour assumes the hours move
 * together, so the range is wide on purpose.
 */
export function dailyTrend(
  animal: Animal,
  budgets: HourBudget[],
  signal: Exclude<CardSignal, 'waterDebt'>,
  range: Exclude<Range, 'today'>,
  now: number,
): Trend {
  const days = RANGE_DAYS[range]
  const todayStart = localDayStart(now)
  const series = dailySeries(budgets, signal, todayStart - days * DAY, todayStart)
  const data: BandPoint[] = series
    .filter((p) => finite(p.low, p.high))
    .map((p) => ({
      t: p.t + DAY,
      // Today is a part day: its measured value is left out, the forecast stands in for it.
      value: p.t < todayStart && Number.isFinite(p.value) && p.coverage >= 0.5 ? toDisplay(signal, p.value) : null,
      low: toDisplay(signal, p.low),
      high: toDisplay(signal, p.high),
    }))
  if (range !== 'd7') return { data }
  const last = [...data].reverse().find((p) => p.t <= todayStart && p.value != null)
  const end = projectToday(animal, budgets, signal, now)
  if (!last || !end) return { data }
  const forecast: ForecastPoint[] = [
    { t: last.t, p10: last.value as number, p50: last.value as number, p90: last.value as number },
    { t: todayStart + DAY, ...end },
  ]
  return { data, forecast, now }
}

/** Expected whole-day value for today, in display units. */
export function projectToday(
  animal: Animal,
  budgets: HourBudget[],
  signal: Exclude<CardSignal, 'waterDebt'>,
  now: number,
): { p10: number; p50: number; p90: number } | null {
  const dayStart = localDayStart(now)
  const elapsedH = (now - dayStart) / HOUR
  const leftH = 24 - elapsedH
  const sofar = partDayValue(budgets, signal, now)
  if (!Number.isFinite(sofar)) return null
  const points = forecastSignal(animal, budgets, signal, now, { horizonH: Math.ceil(leftH) }).points.filter((p) =>
    finite(p.p10, p.p50, p.p90),
  )
  if (points.length === 0) return null
  // The open hour's remaining minutes count at the first forecast hour's rate.
  const weights = points.map((_, i) => (i === 0 ? 1 + (leftH - Math.floor(leftH)) : 1))
  const total = (key: 'p10' | 'p50' | 'p90') => points.reduce((s, p, i) => s + p[key] * weights[i], 0)
  const hoursAhead = weights.reduce((s, w) => s + w, 0)
  let out: { p10: number; p50: number; p90: number }
  switch (signal) {
    case 'activity': {
      // A share: weigh the hours so far and the hours ahead by time.
      const mix = (v: number) => (sofar * elapsedH + v) / (elapsedH + hoursAhead)
      out = { p10: mix(total('p10')), p50: mix(total('p50')), p90: mix(total('p90')) }
      break
    }
    case 'workload':
      out = { p10: sofar + total('p10') / 8, p50: sofar + total('p50') / 8, p90: sofar + total('p90') / 8 }
      out = { p10: Math.min(100, out.p10), p50: Math.min(100, out.p50), p90: Math.min(100, out.p90) }
      break
    default:
      // Minutes per free hour (lying, eating), km and m per hour: add up the hours ahead.
      out = { p10: sofar + total('p10'), p50: sofar + total('p50'), p90: sofar + total('p90') }
  }
  return { p10: toDisplay(signal, out.p10), p50: toDisplay(signal, out.p50), p90: toDisplay(signal, out.p90) }
}
