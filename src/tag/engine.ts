// What the tag decides. The tag keeps its animal's history as hourly budgets (src/simulation in the
// demo) and adds what it measures right now to the current hour. The state then comes from the
// same rules the app uses (src/alerts), so the tag and the app can never disagree.
import { assess } from '../alerts'
import type { PipelineCounters } from '../sensing'
import { hourStart } from '../shared/lib/clock'
import { ACTIVITIES, type Activity, type Animal, type Assessment, type HourBudget } from '../shared/types'

/** Share of live windows below the model's confidence threshold that makes the tag say NOT SURE. */
export const LOW_CONFIDENCE_SHARE = 0.3
/** Live windows needed before the tag judges its own confidence. */
export const MIN_WINDOWS_FOR_CONFIDENCE = 15

/**
 * The current hour's budget with the live minutes in place of the most recent part of the hour.
 * Counts of events (lying bouts, up-downs, rolling, falls) are added on top.
 */
export function overlayLive(base: HourBudget, live: PipelineCounters): HourBudget {
  const liveMin = ACTIVITIES.reduce((s, a) => s + live.minutes[a], 0)
  const covered = 60 * base.coverage
  const keep = covered > 0 ? Math.max(0, covered - liveMin) / covered : 0
  const minutes = Object.fromEntries(
    ACTIVITIES.map((a: Activity) => [a, base.minutes[a] * keep + live.minutes[a]]),
  ) as Record<Activity, number>
  const moving = live.minutes.walk + live.minutes.trot
  return {
    ...base,
    coverage: Math.min(1, (covered * keep + liveMin) / 60),
    minutes,
    lyingBouts: base.lyingBouts + live.lyingBouts,
    upDowns: base.upDowns + live.upDowns,
    rollingBouts: base.rollingBouts + live.rollingBouts,
    falls: base.falls + live.falls,
    workMin: base.workMin * keep + moving,
  }
}

/** History with the current hour replaced by the live overlay. */
export function withLive(budgets: readonly HourBudget[], live: PipelineCounters, now: number): HourBudget[] {
  const h = hourStart(now)
  const i = budgets.findIndex((b) => b.hourStart === h)
  if (i < 0) return [...budgets]
  const out = budgets.slice(0, i + 1)
  out[i] = overlayLive(budgets[i], live)
  return out
}

/** The tag's decision for its animal, given what it has measured so far. */
export function tagAssessment(
  animal: Animal,
  budgets: readonly HourBudget[],
  live: PipelineCounters,
  now: number,
): Assessment {
  const result = assess(animal, withLive(budgets, live, now), now)
  // The tag also knows when its own input is poor: many windows the model is unsure about.
  // URGENT still wins, because a fall or repeated rolling is not a question of confidence.
  if (
    result.state !== 'urgent' &&
    live.windowsProcessed >= MIN_WINDOWS_FOR_CONFIDENCE &&
    live.notSure / live.windowsProcessed > LOW_CONFIDENCE_SHARE
  ) {
    return {
      ...result,
      state: 'not_sure',
      reasons: [
        {
          kind: 'lowConfidence',
          params: { pct: Math.round((100 * live.notSure) / live.windowsProcessed) },
          textKey: 'tag.reason.lowConfidence',
        },
        ...result.reasons,
      ],
    }
  }
  return result
}
