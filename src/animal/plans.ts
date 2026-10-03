// Reading the water plans: the deficit at the end of the working day and when it passes 5%.
import { HOUR, localDayStart } from '../shared/lib/clock'
import type { WaterProjection } from '../shared/types'

/** Time the plans are compared at: 18:00, or the end of the projection when 18:00 is past or too close. */
export function compareAt(now: number, w: WaterProjection): number {
  const evening = localDayStart(now) + 18 * HOUR
  const last = w.points[w.points.length - 1]?.t ?? now
  return evening > now + HOUR && evening <= last ? evening : last
}

/** Projected deficit (% of body weight) at the point closest to t. */
export function deficitAt(w: WaterProjection, t: number): number {
  let best = w.points[0]
  for (const p of w.points) if (Math.abs(p.t - t) < Math.abs(best.t - t)) best = p
  return best?.deficitPct ?? w.deficitPctNow
}

/** First time the projection reaches pct, or undefined when it stays below within the horizon. */
export function crossing(w: WaterProjection, pct: number): number | undefined {
  const c = w.crossings.find((x) => x.thresholdPct === pct)
  if (c) return c.t
  return w.points.find((x) => x.deficitPct >= pct)?.t
}
