// Public API of the alerts domain: the five states, the rules that pick one, and the logbook.

import type { Assessment, DetectedChange } from '../shared/types'
import { STATE_PRIORITY } from '../shared/types'
import { DEMO_NOW } from '../shared/lib/clock'
import { getBudgets, getDetectedChanges, getHerd, herdMember } from '../simulation'
import { assess } from './assess'
import { detectChanges, mergeFeedback } from './detect'

export {
  assess,
  evaluate,
  contextFor,
  longestLyingRun,
  currentLyingRun,
  activityCusum,
  type AssessContext,
  type BehaviourSignal,
} from './assess'
export { detectChanges, mergeFeedback, type DetectOptions } from './detect'
export { PROFILES, RULES, type SpeciesProfile } from './profiles'

/** Every animal of the demo herd, most urgent first (then by name). */
export function assessHerd(now: number = DEMO_NOW): Assessment[] {
  const out = getHerd().map((a) => assess(a, getBudgets(a.id), now))
  const name = (id: string) => herdMember(id).animal.name
  return out.sort((x, y) => STATE_PRIORITY[y.state] - STATE_PRIORITY[x.state] || name(x.animalId).localeCompare(name(y.animalId)))
}

const logbookCache = new Map<string, DetectedChange[]>()

/**
 * The logbook of one demo animal: changes the rules find in its history, with the owner's
 * feedback copied from the recorded entries. Newest first. Memoised.
 */
export function logbook(animalId: string, now: number = DEMO_NOW): DetectedChange[] {
  const key = `${animalId}:${now}`
  const hit = logbookCache.get(key)
  if (hit) return hit
  const animal = herdMember(animalId).animal
  const detected = detectChanges(animal, getBudgets(animalId), now)
  const merged = mergeFeedback(detected, getDetectedChanges(animalId))
  logbookCache.set(key, merged)
  return merged
}
