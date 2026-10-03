// Public API of the forecast domain: expected behaviour, water debt, what-if plans and next steps.

import type { Animal, Fix, Recommendation, WaterProjection } from '../shared/types'
import { DEMO_NOW, HOUR } from '../shared/lib/clock'
import { assess } from '../alerts'
import { PLACES, distanceKm, getBudgets, getFixes, herdMember, weatherAt } from '../simulation'
import { recommend } from './recommend'
import { COMFORT_MIN_TEMP_C, WHAT_IF_PLANS, projectWaterDebt, type WhatIfPlan } from './water'

export { forecastSignal, levelFactor, EWMA_ALPHA, LEVEL_HALF_LIFE_H, type ForecastOptions } from './forecast'
export {
  projectWaterDebt,
  waterStateAt,
  stepWater,
  deficitPct,
  maintenanceLPerDay,
  sweatLPerHour,
  comfortIndex,
  isWorkingNow,
  movingWorkMin,
  workIntensity,
  WATER_BANDS,
  COMFORT,
  COMFORT_MIN_TEMP_C,
  FORAGE_SHARE,
  DONKEY_SWEAT_FACTOR,
  MULE_SWEAT_FACTOR,
  DRINK_L_PER_MIN,
  MAX_WORK_WITHOUT_WATER_H,
  HOT_WORK_WITHOUT_WATER_H,
  WHAT_IF_PLANS,
  type WhatIfPlan,
  type WaterState,
  type WeatherFn,
  type WeatherLike,
  type ProjectionOptions,
} from './water'
export { recommend, recommendationText, describePosition, type ForecastBundle, type RecommendContext } from './recommend'

/** Walking speed to the nearest water point for rest_at_water, km/h. */
const WALK_TO_WATER_KMH = 4

export interface WhatIfResult {
  plan: WhatIfPlan
  water: WaterProjection
}

function lastFixOf(animalId: string, now: number): Fix | undefined {
  const fixes = getFixes(animalId, now - 6 * HOUR, now)
  return fixes[fixes.length - 1]
}

/** Since when the animal has stayed within about 25 m of its last fix. */
export function stillSince(fixes: Fix[]): number | undefined {
  if (!fixes.length) return undefined
  const last = fixes[fixes.length - 1]
  let since = last.t
  for (let i = fixes.length - 2; i >= 0; i--) {
    if (distanceKm(fixes[i], last) > 0.025) break
    since = fixes[i].t
  }
  return since
}

function minutesToWater(animalId: string, now: number): number {
  const fix = lastFixOf(animalId, now)
  if (!fix) return 30
  const km = Math.min(...PLACES.filter((p) => p.kind === 'water').map((p) => distanceKm(fix, p)))
  return Math.max(5, Math.round((km / WALK_TO_WATER_KMH) * 60))
}

/** Water debt for a demo animal under one plan: keep working, rest now, or rest at water. */
export function whatIf(animal: Animal, now: number, plan: WhatIfPlan): WhatIfResult {
  const budgets = getBudgets(animal.id)
  const water = projectWaterDebt(animal, budgets, weatherAt, now, plan, { minutesToWater: minutesToWater(animal.id, now) })
  return { plan, water }
}

/** All three plans side by side. */
export function whatIfAll(animal: Animal, now: number): Record<WhatIfPlan, WhatIfResult> {
  return Object.fromEntries(WHAT_IF_PLANS.map((p) => [p, whatIf(animal, now, p)])) as Record<WhatIfPlan, WhatIfResult>
}

/** First hour in the next 12 when the air is below the comfort-index temperature. */
function coolAt(now: number): number | undefined {
  for (let k = 1; k <= 12; k++) {
    const t = now - (now % HOUR) + k * HOUR
    if (weatherAt(t).tempC < COMFORT_MIN_TEMP_C) return t
  }
  return undefined
}

/** Recommendations for a demo animal, with everything gathered from the simulation. */
export function recommendFor(animalId: string, now: number = DEMO_NOW): Recommendation[] {
  const animal = herdMember(animalId).animal
  const budgets = getBudgets(animalId)
  const assessment = assess(animal, budgets, now)
  const fixes = getFixes(animalId, now - 6 * HOUR, now)
  const all = whatIfAll(animal, now)
  return recommend(
    animal,
    assessment,
    {
      water: projectWaterDebt(animal, budgets, weatherAt, now),
      whatIf: { continue_work: all.continue_work.water, rest_now: all.rest_now.water, rest_at_water: all.rest_at_water.water },
    },
    PLACES,
    { now, lastFix: fixes[fixes.length - 1], stillSince: stillSince(fixes), coolAt: coolAt(now) },
  )
}

