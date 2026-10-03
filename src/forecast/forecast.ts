// Expected behaviour for the next hours: the animal's own normal for each coming hour, scaled by
// how it has run against that normal lately.
//
// Level factor r = EWMA(observed / normal) over the last 24 hours, alpha 0.2. A dull donkey at
// 70% of its normal gets r of about 0.7. r drifts back toward 1 with a half-life of 12 hours:
// we do not assume a change lasts forever, nor that it ends at once.
// Band: P10 to P90 as median +/- 1.28 spread (the normal band), scaled by r, widened by
// sqrt(1 + 1/n) for a baseline built from n days and by sqrt(1 + k/12) for k hours ahead.

import type { Animal, ForecastPoint, HourBudget, SignalForecast, SignalId } from '../shared/types'
import { HOUR, hourStart, localHour } from '../shared/lib/clock'
import { BAND_Z, SIGNAL_INFO, computeBaseline, indexAt, signalValue } from '../baseline'
import { projectWaterDebt, type WeatherFn } from './water'

export const EWMA_ALPHA = 0.2
export const LEVEL_HALF_LIFE_H = 12

/** EWMA of observed / normal over the last 24 hours. 1 when nothing can be compared. */
export function levelFactor(budgets: HourBudget[], signal: SignalId, now: number): { r: number; n: number } {
  const base = computeBaseline(budgets, signal, now)
  const floor = SIGNAL_INFO[signal].spreadFloor
  const end = indexAt(budgets, now)
  let r = 1
  let n = 0
  for (let i = Math.max(0, end - 24); i < end; i++) {
    const b = budgets[i]
    if (b.coverage < 0.25) continue
    const cell = base.byHour[localHour(b.hourStart)]
    const v = signalValue(b, signal)
    // A ratio needs a normal clearly above zero (lying at midday is often 0).
    if (!Number.isFinite(v) || !Number.isFinite(cell.median) || cell.median < 2 * floor) continue
    const ratio = Math.max(0, Math.min(3, v / cell.median))
    r = EWMA_ALPHA * ratio + (1 - EWMA_ALPHA) * r
    n++
  }
  return { r, n }
}

export interface ForecastOptions {
  horizonH?: number
  /** Needed for the waterDebt signal. */
  weather?: WeatherFn
}

export function forecastSignal(
  animal: Animal,
  budgets: HourBudget[],
  signal: SignalId,
  now: number,
  opts: ForecastOptions = {},
): SignalForecast {
  const horizonH = opts.horizonH ?? 12
  if (signal === 'waterDebt') {
    if (!opts.weather) throw new Error('forecastSignal(waterDebt) needs weather')
    const proj = projectWaterDebt(animal, budgets, opts.weather, now, undefined, { horizonH, stepMin: 60 })
    // The water model has no measured error. ASSUMPTION: +/-15% at 6 hours, growing with sqrt(k).
    const points: ForecastPoint[] = proj.points.slice(1).map((p, i) => {
      const w = 0.15 * Math.sqrt((i + 1) / 6) * p.deficitPct
      return { t: p.t, p10: Math.max(0, p.deficitPct - w), p50: p.deficitPct, p90: p.deficitPct + w }
    })
    return { animalId: animal.id, signal, points }
  }
  const base = computeBaseline(budgets, signal, now)
  const { r } = levelFactor(budgets, signal, now)
  const points: ForecastPoint[] = []
  const start = hourStart(now)
  for (let k = 1; k <= horizonH; k++) {
    const t = start + k * HOUR
    const cell = base.byHour[localHour(t)]
    const rk = 1 + (r - 1) * Math.pow(0.5, k / LEVEL_HALF_LIFE_H)
    const p50 = cell.median * rk
    const width = BAND_Z * cell.spread * rk * Math.sqrt(1 + 1 / Math.max(1, cell.n)) * Math.sqrt(1 + k / 12)
    let p10 = Math.max(0, p50 - width)
    let p90 = p50 + width
    if (signal === 'activity') {
      p10 = Math.min(1, p10)
      p90 = Math.min(1, p90)
    }
    points.push({ t, p10, p50, p90 })
  }
  return { animalId: animal.id, signal, points }
}
