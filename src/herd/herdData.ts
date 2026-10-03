// Everything the Herd and Statistics screens show, gathered once from the domain APIs.
// The demo clock is fixed, so the result is memoised per `now`.

import { assessHerd } from '../alerts'
import { computeBaseline } from '../baseline'
import { recommendFor } from '../forecast'
import { DEMO_NOW, HOUR } from '../shared/lib/clock'
import type { Animal, Assessment, HourBudget, Recommendation } from '../shared/types'
import { HOUSEHOLDS, getBudgets, herdMember } from '../simulation'
import {
  DEVIATION_SIGNALS,
  RECENT_HOURS,
  belowNormalActivity,
  deviationSince,
  hotAfternoons,
  insightLines,
  largestWorkChange,
  todayTotals,
  topDeviations,
  weekChange,
  type DayTotals,
  type DeviationsById,
  type InsightLine,
  type TopDeviation,
} from './insights'

/** Data older than this draws the posture as a stale outline (DESIGN 7). */
export const STALE_AFTER_MS = 2 * HOUR

/** Herds larger than this get compact rows without drawings (DESIGN 9). */
export const COMPACT_HERD_SIZE = 30

export interface HerdRow {
  animal: Animal
  assessment: Assessment
  /** Since local midnight. */
  totals: DayTotals
  /** The last RECENT_HOURS hours against the animal's own normal. */
  deviations: DeviationsById[string]
}

export interface HerdData {
  now: number
  /** Most urgent first (STATE_PRIORITY), then by name. */
  rows: HerdRow[]
  insights: InsightLine[]
  top: TopDeviation[]
}

const cache = new Map<number, HerdData>()

export function herdData(now: number = DEMO_NOW): HerdData {
  const hit = cache.get(now)
  if (hit) return hit
  const budgets = new Map<string, HourBudget[]>()
  const rows: HerdRow[] = assessHerd(now).map((assessment) => {
    const animal = herdMember(assessment.animalId).animal
    const b = getBudgets(animal.id)
    budgets.set(animal.id, b)
    const deviations = Object.fromEntries(
      DEVIATION_SIGNALS.map((s) => [s, deviationSince(b, s, now, now - RECENT_HOURS * HOUR, computeBaseline(b, s, now))]),
    )
    return { animal, assessment, totals: todayTotals(b, now), deviations }
  })
  const byId: DeviationsById = Object.fromEntries(rows.map((r) => [r.animal.id, r.deviations]))
  const groups = Object.fromEntries(
    HOUSEHOLDS.map((h) => [h, rows.filter((r) => r.animal.household === h).map((r) => budgets.get(r.animal.id)!)]),
  )
  const all = [...budgets.values()]
  const nameOf = (id: string) => herdMember(id).animal.name
  const data: HerdData = {
    now,
    rows,
    insights: insightLines({
      work: largestWorkChange(groups, now),
      distance: weekChange(all, now, 'km'),
      heat: hotAfternoons(all, now),
      belowNames: belowNormalActivity(byId).map(nameOf),
    }),
    top: topDeviations(byId),
  }
  cache.set(now, data)
  return data
}

/** The first next step for one animal, or undefined when there is nothing to do. */
export function firstRecommendation(animalId: string, now: number = DEMO_NOW): Recommendation | undefined {
  return recommendFor(animalId, now)[0]
}
