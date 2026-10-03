// One number per hour for each signal, from the tag's hourly time budget.
//
// Behaviour signals (activity, lying, eating) describe the animal's own time: the minutes it was
// not working. Work hours are set by the owner, not the animal, so an hour with fewer than
// 15 free minutes has no behaviour value (NaN). This keeps a Sunday off from looking like
// dullness, and a dull donkey still shows up in the hours after work.

import type { HourBudget, SignalId } from '../shared/types'

/** Below this many free minutes in an hour, behaviour signals are not measured. */
export const MIN_FREE_MINUTES = 15

export const BEHAVIOUR_SIGNALS: readonly SignalId[] = ['activity', 'lying', 'eating']

export interface SignalInfo {
  /** Unit of the hourly value. */
  unit: string
  /** Unit of the daily value from dailySeries. */
  dailyUnit: string
  /** Smallest spread a baseline cell can have, so z never divides by 0. Hourly units. */
  spreadFloor: number
  /** Smallest spread for a daily value. */
  dailySpreadFloor: number
  /** True when the value only exists in free (non-work) hours. */
  behaviour: boolean
}

export const SIGNAL_INFO: Record<SignalId, SignalInfo> = {
  activity: { unit: 'share of free minutes', dailyUnit: 'share of free minutes', spreadFloor: 0.04, dailySpreadFloor: 0.02, behaviour: true },
  lying: { unit: 'min per free hour', dailyUnit: 'min per day', spreadFloor: 3, dailySpreadFloor: 10, behaviour: true },
  eating: { unit: 'min per free hour', dailyUnit: 'min per day', spreadFloor: 4, dailySpreadFloor: 20, behaviour: true },
  workload: { unit: '0 to 100', dailyUnit: '0 to 100', spreadFloor: 5, dailySpreadFloor: 5, behaviour: false },
  distance: { unit: 'km', dailyUnit: 'km per day', spreadFloor: 0.2, dailySpreadFloor: 0.5, behaviour: false },
  climb: { unit: 'm', dailyUnit: 'm per day', spreadFloor: 10, dailySpreadFloor: 20, behaviour: false },
  temperature: { unit: 'deg C', dailyUnit: 'deg C', spreadFloor: 0.5, dailySpreadFloor: 0.5, behaviour: false },
  waterDebt: { unit: '% of body weight', dailyUnit: '% of body weight', spreadFloor: 0.2, dailySpreadFloor: 0.2, behaviour: false },
}

/** Minutes the tag recorded in the hour. */
export function coveredMinutes(b: HourBudget): number {
  return 60 * b.coverage
}

/** Minutes the animal was not working. */
export function freeMinutes(b: HourBudget): number {
  return Math.max(0, coveredMinutes(b) - b.workMin)
}

export function isFreeHour(b: HourBudget): boolean {
  return freeMinutes(b) >= MIN_FREE_MINUTES
}

/**
 * Hourly workload, 0 to 100: 70 points for a full hour of work, plus up to 30 for climbing
 * (1 point per 5 m climbed). An assumption to rank hours, not a physiological measure.
 */
export function workloadOf(b: HourBudget): number {
  return Math.min(100, (70 * b.workMin) / 60 + Math.min(30, b.climbM / 5))
}

/**
 * The value of one signal for one hour, or NaN when the hour cannot say.
 *
 * - activity: share of free minutes spent walking, trotting, eating or rolling. Eating counts
 *   as active because a dull donkey first stops eating and walking and stands or lies instead.
 *   We use minutes, not ODBA, because minutes come straight from the classifier and mean the same
 *   for every animal, while ODBA depends on collar fit. Work walking is taken out.
 * - lying, eating: minutes per 60 free minutes.
 * - workload: see workloadOf.
 * - distance (km), climb (m), temperature (deg C): as recorded in the hour.
 * - waterDebt: not in the budget. It comes from the forecast domain's water model, so NaN here.
 */
export function signalValue(b: HourBudget, signal: SignalId): number {
  if (b.coverage <= 0) return NaN
  const m = b.minutes
  const free = freeMinutes(b)
  switch (signal) {
    case 'activity': {
      if (free < MIN_FREE_MINUTES) return NaN
      const active = m.walk + m.trot + m.eat + m.roll
      const workMoving = Math.min(b.workMin, m.walk + m.trot)
      return Math.max(0, Math.min(1, (active - workMoving) / free))
    }
    case 'lying':
      return free < MIN_FREE_MINUTES ? NaN : (m.lie * 60) / free
    case 'eating':
      return free < MIN_FREE_MINUTES ? NaN : (m.eat * 60) / free
    case 'workload':
      return workloadOf(b)
    case 'distance':
      return b.distanceKm
    case 'climb':
      return b.climbM
    case 'temperature':
      return b.tempC
    case 'waterDebt':
      return NaN
  }
}

/** Weight of an hour when averaging a behaviour signal: its free minutes. */
export function signalWeight(b: HourBudget, signal: SignalId): number {
  return SIGNAL_INFO[signal].behaviour ? freeMinutes(b) : coveredMinutes(b)
}
