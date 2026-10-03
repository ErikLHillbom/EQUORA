// Everything the case file shows for one demo animal, gathered from the domains in one place.
import { assess, logbook } from '../alerts'
import { recommendFor, whatIfAll, type WhatIfResult } from '../forecast'
import type { WhatIfPlan } from '../forecast'
import { HERD, getBudgets } from '../simulation'
import type { Animal, Assessment, DetectedChange, HourBudget, Recommendation, StateId } from '../shared/types'
import { readings, mainSignal, type CardSignal, type Reading } from './readings'

export interface CaseFile {
  animal: Animal
  budgets: HourBudget[]
  assessment: Assessment
  recommendations: Recommendation[]
  /** Present when water matters for this animal right now. */
  whatIf?: Record<WhatIfPlan, WhatIfResult>
  readings: Record<CardSignal, Reading>
  main: CardSignal
  changes: DetectedChange[]
}

const WATER_REASONS = new Set(['waterDebt', 'noRest', 'heat'])

/** True when the water plans help the owner decide: the state is WATER or a reason is about water. */
export function waterMatters(a: Assessment): boolean {
  return a.state === 'water' || a.reasons.some((r) => WATER_REASONS.has(r.kind))
}

/** null for an id that is not in the herd. */
export function caseFile(id: string, now: number): CaseFile | null {
  const animal = HERD.find((m) => m.animal.id === id)?.animal
  if (!animal) return null
  const budgets = getBudgets(id)
  const assessment = assess(animal, budgets, now)
  return {
    animal,
    budgets,
    assessment,
    recommendations: assessment.state === 'normal' ? [] : recommendFor(id, now),
    whatIf: waterMatters(assessment) ? whatIfAll(animal, now) : undefined,
    readings: readings(animal, budgets, now),
    main: mainSignal(assessment.reasons[0]?.kind, assessment.state),
    changes: logbook(id, now),
  }
}

/**
 * Ink for readings outside the normal. A NORMAL animal can still have a number outside its band;
 * it is drawn in the grey of NOT SURE, so green never means "look here".
 */
export function departState(state: StateId): StateId {
  return state === 'normal' ? 'not_sure' : state
}
