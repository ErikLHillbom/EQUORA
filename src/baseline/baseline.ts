// Each animal's own normal: for every local hour of the day, the median and spread of a signal
// over the trailing 14 days. Spread is the scaled median absolute deviation (1.4826 * MAD), which
// equals the standard deviation for normal data and ignores a few odd days. It is floored so a
// z-score never divides by 0.
//
// With fewer than 7 days of data each hour shares a 4-hour bin with its neighbours, so a young
// baseline is smoother. From 7 days on, each hour stands alone.

import type { Animal, Baseline, BaselineCell, HourBudget, SignalId } from '../shared/types'
import { DAY, localDayStart, localHour } from '../shared/lib/clock'
import { SIGNAL_INFO, signalValue } from './signals'

export const BASELINE_DAYS = 14
/** Days of data before the baseline uses 1-hour cells instead of 4-hour bins. */
export const HOURLY_CELLS_FROM_DAYS = 7
/** Below this many days of data the animal is NOT SURE. */
export const MIN_BASELINE_DAYS = 3
/** Learning stamp: "Day {day} of 5". */
export const LEARNING_DAYS = 5
/** A day counts toward the baseline with at least this many hours of good data. */
const MIN_HOURS_PER_DAY = 6
/** An hour counts with at least this much coverage. */
export const MIN_COVERAGE = 0.5
/** Behaviour cells widen to neighbouring hours until they have this many values. */
const MIN_VALUES = 4

export function median(values: number[]): number {
  if (values.length === 0) return NaN
  const s = values.slice().sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** 1.4826 * median absolute deviation. */
export function scaledMad(values: number[], med = median(values)): number {
  if (values.length === 0) return NaN
  return 1.4826 * median(values.map((v) => Math.abs(v - med)))
}

/** z = (obs - median) / spread. NaN when either side is missing. */
export function zScore(cell: BaselineCell, obs: number): number {
  if (!Number.isFinite(obs) || !Number.isFinite(cell.median)) return NaN
  return (obs - cell.median) / cell.spread
}

/** Index of the first budget at or after t (budgets sorted by hourStart). */
export function indexAt(budgets: HourBudget[], t: number): number {
  let lo = 0
  let hi = budgets.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (budgets[mid].hourStart < t) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** Budgets in [from, to), sorted input assumed. */
export function budgetsBetween(budgets: HourBudget[], from: number, to: number): HourBudget[] {
  return budgets.slice(indexAt(budgets, from), indexAt(budgets, to))
}

/** Days in the window with at least 6 hours of good data. */
export function countDaysOfData(window: HourBudget[]): number {
  const perDay = new Map<number, number>()
  for (const b of window) {
    if (b.coverage < MIN_COVERAGE) continue
    const d = localDayStart(b.hourStart)
    perDay.set(d, (perDay.get(d) ?? 0) + 1)
  }
  let n = 0
  for (const c of perDay.values()) if (c >= MIN_HOURS_PER_DAY) n++
  return n
}

export interface BaselineOptions {
  days?: number
}

/**
 * The animal's normal for one signal as of `now`, from the 14 whole days before today.
 * Today is left out so a change that started this morning does not become its own normal.
 */
export function computeBaseline(
  budgets: HourBudget[],
  signal: SignalId,
  now: number,
  opts: BaselineOptions = {},
): Baseline {
  const days = opts.days ?? BASELINE_DAYS
  const today = localDayStart(now)
  const window = budgetsBetween(budgets, today - days * DAY, today)
  const daysOfData = countDaysOfData(window)
  const info = SIGNAL_INFO[signal]
  const binHours = daysOfData < HOURLY_CELLS_FROM_DAYS ? 4 : 1

  // values[h] = list of [value, day] for local hour h.
  const values: { v: number; day: number }[][] = Array.from({ length: 24 }, () => [])
  for (const b of window) {
    if (b.coverage < MIN_COVERAGE) continue
    const v = signalValue(b, signal)
    if (!Number.isFinite(v)) continue
    values[localHour(b.hourStart)].push({ v, day: localDayStart(b.hourStart) })
  }

  const pools: { v: number; day: number }[][] = []
  const medians: number[] = []
  for (let h = 0; h < 24; h++) {
    const bin = Math.floor(h / binHours) * binHours
    let pool: { v: number; day: number }[] = []
    for (let k = bin; k < bin + binHours; k++) pool.push(...values[k])
    // Behaviour signals only exist in free hours. If most days worked through this hour, borrow
    // the neighbouring hours so the cell still has a few values.
    if (info.behaviour) {
      for (let w = 1; w <= 3 && pool.length < MIN_VALUES; w++) {
        pool = pool.concat(values[(bin - w + 24) % 24], values[(bin + binHours - 1 + w) % 24])
      }
    }
    pools.push(pool)
    medians.push(median(pool.map((p) => p.v)))
  }

  // Spread: 14 values per hour give a noisy MAD. With 1-hour cells, the spread pools the
  // deviations of the hour and its two neighbours, each from its own hour's median.
  const byHour: BaselineCell[] = []
  for (let h = 0; h < 24; h++) {
    const cells = binHours === 1 ? [(h + 23) % 24, h, (h + 1) % 24] : [h]
    const dev: number[] = []
    for (const c of cells) {
      if (!Number.isFinite(medians[c])) continue
      for (const p of pools[c]) dev.push(Math.abs(p.v - medians[c]))
    }
    const spread = Math.max(info.spreadFloor, 1.4826 * median(dev) || 0)
    byHour.push({ median: medians[h], spread, n: new Set(pools[h].map((p) => p.day)).size })
  }
  return { animalId: budgets[0]?.animalId ?? '', signal, byHour, daysOfData }
}

export interface LearningProgress {
  /** "Day {day} of {of}", counted from the day the tag was fitted. */
  day: number
  of: number
  /** True until the tag has 5 days. */
  learning: boolean
  /** Days of good data in the last 14 days. */
  daysOfData: number
  /** At least 3 days of data: the rules may compare against the baseline. */
  enough: boolean
}

export function learningProgress(animal: Animal, budgets: HourBudget[], now: number): LearningProgress {
  const first = budgets.length ? Math.max(animal.tagSince, budgets[0].hourStart) : animal.tagSince
  const elapsedDays = Math.max(0, (now - first) / DAY)
  const day = Math.min(LEARNING_DAYS, Math.floor(elapsedDays) + 1)
  const today = localDayStart(now)
  const daysOfData = countDaysOfData(budgetsBetween(budgets, today - BASELINE_DAYS * DAY, today))
  return {
    day,
    of: LEARNING_DAYS,
    learning: elapsedDays < LEARNING_DAYS,
    daysOfData,
    enough: daysOfData >= MIN_BASELINE_DAYS,
  }
}

/** The cell for the local hour containing t. */
export function cellAt(baseline: Baseline, t: number): BaselineCell {
  return baseline.byHour[localHour(t)]
}

