// Herd numbers for the home screen and the statistics ledger. Pure functions over hourly budgets,
// so every sentence on screen is computed from the data and never typed by hand.
//
// "Today" is the local day up to `now`. "This week" is the 7 x 24 hours before `now`, and
// "last week" the 7 x 24 hours before that.

import { BAND_Z, MIN_BASELINE_DAYS, budgetsBetween, computeBaseline, freeMinutes, signalValue } from '../baseline'
import { DAY, HOUR, localDayStart, localHour } from '../shared/lib/clock'
import type { Baseline, HourBudget } from '../shared/types'

/** Below this share of the hour with data, an hour does not count. Same as the baseline. */
const MIN_COVERAGE = 0.5

/** Window for "versus own normal": the last 6 hours, the same lookback the alert rules use. */
export const RECENT_HOURS = 6

/** Changes smaller than this, in %, are described as "about the same". */
export const SAME_PCT = 5

/** Hot afternoons must be at least this much warmer than the others to compare activity, deg C. */
export const MIN_HEAT_GAP_C = 1

// ---------- Today ----------

export interface DayTotals {
  /** Distance walked, km. */
  km: number
  /** Height climbed, m. */
  climbM: number
  /** Time worked, hours. */
  workH: number
  /** Time lying, hours. */
  lyingH: number
  /** Hours since local midnight with any data. */
  hoursWithData: number
}

/** What the tag recorded since local midnight. */
export function todayTotals(budgets: HourBudget[], now: number): DayTotals {
  const today = budgetsBetween(budgets, localDayStart(now), now + 1)
  let km = 0
  let climbM = 0
  let workMin = 0
  let lieMin = 0
  let hoursWithData = 0
  for (const b of today) {
    if (b.coverage <= 0) continue
    hoursWithData++
    km += b.distanceKm
    climbM += b.climbM
    workMin += b.workMin
    lieMin += b.minutes.lie
  }
  return { km, climbM, workH: workMin / 60, lyingH: lieMin / 60, hoursWithData }
}

// ---------- Against the animal's own normal ----------

export type DeviationSignal = 'activity' | 'eating' | 'lying'
export const DEVIATION_SIGNALS: readonly DeviationSignal[] = ['activity', 'eating', 'lying']

export interface Deviation {
  signal: DeviationSignal
  /** Free-minute weighted mean of the hourly values. */
  actual: number
  /** The same mean of the animal's normal for those hours of day. */
  normal: number
  /** Change against normal, %. NaN when the normal is close to 0 (lying is often near 0). */
  pct: number
  /** Change against normal in minutes over the free time (lying only; NaN otherwise). */
  diffMin: number
  /** How far outside the normal, in spreads. Beyond BAND_Z the value is outside the normal band. */
  z: number
  /** Hours that counted. */
  hours: number
}

/**
 * The hours from `from` (never before local midnight) up to `now`, against the animal's normal
 * for the same hours of day. Hours with free time only, because behaviour signals are not
 * measured while the animal works. Null while the baseline has fewer than 3 days, or when no
 * hour counts.
 */
export function deviationSince(
  budgets: HourBudget[],
  signal: DeviationSignal,
  now: number,
  from: number = localDayStart(now),
  baseline?: Baseline,
): Deviation | null {
  const base = baseline ?? computeBaseline(budgets, signal, now)
  if (base.daysOfData < MIN_BASELINE_DAYS) return null
  const hoursIn = budgetsBetween(budgets, Math.max(from, localDayStart(now)), now + 1)
  let w = 0
  let sumV = 0
  let sumM = 0
  let sumVar = 0
  let hours = 0
  for (const b of hoursIn) {
    if (b.coverage < MIN_COVERAGE) continue
    const v = signalValue(b, signal)
    const cell = base.byHour[localHour(b.hourStart)]
    if (!Number.isFinite(v) || !Number.isFinite(cell.median)) continue
    const f = freeMinutes(b)
    w += f
    sumV += f * v
    sumM += f * cell.median
    sumVar += (f * cell.spread) ** 2
    hours++
  }
  if (hours === 0 || w <= 0) return null
  const actual = sumV / w
  const normal = sumM / w
  const z = (sumV - sumM) / Math.sqrt(sumVar)
  // Lying is minutes per 60 free minutes, so this is minutes over the free time.
  const diffMin = signal === 'lying' ? (sumV - sumM) / 60 : NaN
  const nearZero = signal === 'lying' ? normal < 2 : Math.abs(normal) < 1e-6
  const pct = nearZero ? NaN : (actual / normal - 1) * 100
  return { signal, actual, normal, pct, diffMin, z, hours }
}

/** Deviations per animal and signal, keyed by animal id. */
export type DeviationsById = Record<string, Partial<Record<DeviationSignal, Deviation | null>>>

export interface TopDeviation {
  animalId: string
  deviation: Deviation
}

/**
 * The largest departures from each animal's own normal, outside the normal band (|z| above
 * BAND_Z), largest first. One row per animal and signal.
 */
export function topDeviations(byId: DeviationsById, limit = 6): TopDeviation[] {
  const rows: TopDeviation[] = []
  for (const [animalId, sigs] of Object.entries(byId)) {
    for (const d of Object.values(sigs)) {
      if (!d || !Number.isFinite(d.z) || Math.abs(d.z) <= BAND_Z) continue
      rows.push({ animalId, deviation: d })
    }
  }
  return rows
    .sort((a, b) => Math.abs(b.deviation.z) - Math.abs(a.deviation.z) || a.animalId.localeCompare(b.animalId))
    .slice(0, limit)
}

/** Animals whose activity is below their own normal band at the same time. */
export function belowNormalActivity(byId: DeviationsById): string[] {
  return Object.entries(byId)
    .filter(([, s]) => s.activity != null && s.activity.z < -BAND_Z)
    .map(([id]) => id)
    .sort()
}

// ---------- This week against last week ----------

export interface WeekChange {
  /** Total over the last 7 days, in the unit of the measure. */
  thisWeek: number
  /** Total over the 7 days before. */
  lastWeek: number
  /** Change, %. NaN when last week was 0. */
  pct: number
}

/** Hours worked, or km walked. */
export type WeekMeasure = 'workH' | 'km'

function weekTotal(budgets: HourBudget[], from: number, to: number, measure: WeekMeasure): number {
  const list = budgetsBetween(budgets, from, to)
  return measure === 'workH' ? list.reduce((s, b) => s + b.workMin, 0) / 60 : list.reduce((s, b) => s + b.distanceKm, 0)
}

/** A group of animals in the last 7 days against the 7 days before. */
export function weekChange(budgetsList: HourBudget[][], now: number, measure: WeekMeasure = 'workH'): WeekChange {
  let thisWeek = 0
  let lastWeek = 0
  for (const budgets of budgetsList) {
    thisWeek += weekTotal(budgets, now - 7 * DAY, now, measure)
    lastWeek += weekTotal(budgets, now - 14 * DAY, now - 7 * DAY, measure)
  }
  const pct = lastWeek > 0 ? (thisWeek / lastWeek - 1) * 100 : NaN
  return { thisWeek, lastWeek, pct }
}

export interface GroupWeekChange extends WeekChange {
  groupId: string
  animals: number
}

/** The group whose hours of work changed most between the two weeks (by absolute %). */
export function largestWorkChange(groups: Record<string, HourBudget[][]>, now: number): GroupWeekChange | null {
  let best: GroupWeekChange | null = null
  for (const [groupId, list] of Object.entries(groups)) {
    if (!list.length) continue
    const c = weekChange(list, now, 'workH')
    if (!Number.isFinite(c.pct)) continue
    if (!best || Math.abs(c.pct) > Math.abs(best.pct)) best = { ...c, groupId, animals: list.length }
  }
  return best
}

// ---------- Heat and activity ----------

export interface HotAfternoons {
  /** Local midnight of each hottest afternoon, hottest first. */
  hotDays: number[]
  /** Mean temperature at the tags on those afternoons and on the others, deg C. */
  hotTempC: number
  otherTempC: number
  /** Coolest and hottest afternoon of the period, deg C. */
  minTempC: number
  maxTempC: number
  /** Herd activity in free time (share of upright free minutes) on those afternoons and the others. */
  hotActivity: number
  otherActivity: number
  /** Change on the hot afternoons against the others, %. */
  pct: number
  /** Number of other afternoons compared. */
  otherDays: number
}

export interface HotAfternoonOptions {
  /** How many hottest afternoons. Default 3. */
  count?: number
  /** Whole days before today to look at. Default 7. */
  days?: number
  /** Afternoon hours, local, [from, to). Default 12 to 17. */
  fromHour?: number
  toHour?: number
}

/**
 * Herd activity on the hottest afternoons of the last week against the other afternoons.
 * Temperature is the tag temperature averaged over the herd. Activity is free-minute weighted,
 * so work does not count. Whole days before today only. Null when there is too little data.
 */
export function hotAfternoons(budgetsList: HourBudget[][], now: number, opts: HotAfternoonOptions = {}): HotAfternoons | null {
  const count = opts.count ?? 3
  const days = opts.days ?? 7
  const fromHour = opts.fromHour ?? 12
  const toHour = opts.toHour ?? 17
  const today = localDayStart(now)
  const perDay: { day: number; temp: number; act: number }[] = []
  for (let k = days; k >= 1; k--) {
    const day = today - k * DAY
    let tempSum = 0
    let tempN = 0
    let actSum = 0
    let w = 0
    for (const budgets of budgetsList) {
      for (const b of budgetsBetween(budgets, day + fromHour * HOUR, day + toHour * HOUR)) {
        if (b.coverage < MIN_COVERAGE) continue
        tempSum += b.tempC
        tempN++
        const v = signalValue(b, 'activity')
        if (!Number.isFinite(v)) continue
        const f = freeMinutes(b)
        actSum += f * v
        w += f
      }
    }
    if (tempN > 0 && w > 0) perDay.push({ day, temp: tempSum / tempN, act: actSum / w })
  }
  if (perDay.length < count + 2) return null
  const sorted = [...perDay].sort((a, b) => b.temp - a.temp)
  const hot = sorted.slice(0, count)
  const other = sorted.slice(count)
  const mean = (xs: typeof perDay, key: 'temp' | 'act') => xs.reduce((s, x) => s + x[key], 0) / xs.length
  const hotActivity = mean(hot, 'act')
  const otherActivity = mean(other, 'act')
  return {
    hotDays: hot.map((d) => d.day),
    hotTempC: mean(hot, 'temp'),
    otherTempC: mean(other, 'temp'),
    minTempC: sorted[sorted.length - 1].temp,
    maxTempC: sorted[0].temp,
    hotActivity,
    otherActivity,
    pct: otherActivity > 0 ? (hotActivity / otherActivity - 1) * 100 : NaN,
    otherDays: other.length,
  }
}

// ---------- Numbers for sentences and cells ----------

/** "-31%" or "+8%". Whole percent; "0%" stays unsigned. */
export function signedPct(pct: number): string {
  const r = Math.round(pct)
  if (r === 0) return '0%'
  return `${r > 0 ? '+' : '-'}${Math.abs(r)}%`
}

/** "+52 min" or "-15 min". */
export function signedMin(min: number): string {
  const r = Math.round(min)
  if (r === 0) return '0 min'
  return `${r > 0 ? '+' : '-'}${Math.abs(r)} min`
}

/** One decimal below 10, whole numbers from 10. */
export function oneDecimal(x: number): string {
  if (!Number.isFinite(x)) return ''
  const r = Math.round(x * 10) / 10
  return Math.abs(r) >= 10 ? String(Math.round(x)) : r.toFixed(1)
}

// ---------- Herd insights as sentences ----------

export interface HerdInsightInput {
  work: GroupWeekChange | null
  distance: WeekChange | null
  heat: HotAfternoons | null
  /** Names of the animals below their own normal activity at the same time. */
  belowNames: string[]
}

export interface InsightLine {
  id: 'work' | 'distance' | 'heat' | 'below'
  /** String key of the sentence. */
  textKey: string
  /** Params for the sentence. A param named `groupKey` holds a string key for `group`. */
  params: Record<string, string | number>
}

const pctWord = (pct: number) => (Math.abs(pct) < SAME_PCT ? 'Same' : pct > 0 ? 'Up' : 'Down')

/** The herd insights as sentences, each computed from the data. Only what the data shows. */
export function insightLines(input: HerdInsightInput): InsightLine[] {
  const out: InsightLine[] = []
  const { work, distance, heat, belowNames } = input
  const n = belowNames.length
  out.push({
    id: 'below',
    textKey: n === 0 ? 'herd.insight.below0' : n === 1 ? 'herd.insight.below1' : 'herd.insight.belowMany',
    params: { count: n, names: belowNames.join(', '), hours: RECENT_HOURS },
  })
  if (work) {
    out.push({
      id: 'work',
      textKey: `herd.insight.work${pctWord(work.pct)}`,
      params: {
        groupKey: `simulation.household.${work.groupId}`,
        pct: Math.abs(Math.round(work.pct)),
        now: Math.round(work.thisWeek),
        before: Math.round(work.lastWeek),
        same: SAME_PCT,
      },
    })
  }
  if (distance && Number.isFinite(distance.pct)) {
    out.push({
      id: 'distance',
      textKey: `herd.insight.distance${pctWord(distance.pct)}`,
      params: { pct: Math.abs(Math.round(distance.pct)), now: Math.round(distance.thisWeek), before: Math.round(distance.lastWeek) },
    })
  }
  if (heat) {
    const gap = heat.hotTempC - heat.otherTempC
    const flat = gap < MIN_HEAT_GAP_C
    out.push({
      id: 'heat',
      textKey: flat ? 'herd.insight.heatFlat' : `herd.insight.heat${pctWord(heat.pct)}`,
      params: {
        count: heat.hotDays.length,
        other: heat.otherDays,
        hot: Math.round(heat.hotTempC),
        cool: Math.round(heat.otherTempC),
        min: Math.floor(heat.minTempC),
        max: Math.ceil(heat.maxTempC),
        pct: Math.abs(Math.round(heat.pct)),
      },
    })
  }
  return out
}
