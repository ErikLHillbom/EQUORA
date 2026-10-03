// Walks an animal's history hour by hour and records each change of state for the logbook:
// a change into WATER, CHECK or URGENT, and the return to normal after it.
// NOT SURE hours are skipped: they say the tag could not tell, not that the animal changed.

import type { Animal, DetectedChange, HourBudget, StateId } from '../shared/types'
import { STATE_PRIORITY } from '../shared/types'
import { DAY, HOUR, localDayStart } from '../shared/lib/clock'
import { stepWater, type WaterState } from '../forecast/water'
import { contextFor, evaluate, type AssessContext } from './assess'

/** Hours of NORMAL needed before a change counts as over. */
const NORMAL_HOURS_TO_CLOSE = 2

export interface DetectOptions {
  /** Start of the walk, epoch ms. Default: 180 days before now. */
  from?: number
}

export function detectChanges(animal: Animal, budgets: HourBudget[], now: number, opts: DetectOptions = {}): DetectedChange[] {
  if (budgets.length === 0) return []
  const from = Math.max(opts.from ?? now - 180 * DAY, budgets[0].hourStart)
  const out: DetectedChange[] = []
  const contexts = new Map<number, AssessContext>()
  let water: WaterState = { deficitL: 0, workSinceWaterMin: 0 }
  let open: DetectedChange[] = []
  let normalRun = 0
  let i = 0
  while (i < budgets.length && budgets[i].hourStart < from) i++

  const close = (at: number) => {
    const first = open[0]
    for (const c of open) c.resolved = true
    out.push({
      id: `${animal.id}-${at}-normal`,
      animalId: animal.id,
      at,
      state: 'normal',
      reasons: [{ kind: first.reasons[0]?.kind ?? 'activity', textKey: 'alerts.reason.backToNormal', params: { name: animal.name } }],
      resolved: true,
    })
    open = []
  }

  for (; i < budgets.length; i++) {
    const b = budgets[i]
    if (b.hourStart >= now) break
    const t = Math.min(now, b.hourStart + HOUR)
    water = stepWater(water, animal, b, Math.min(1, (t - b.hourStart) / HOUR))
    const day = localDayStart(t - 1)
    let ctx = contexts.get(day)
    if (!ctx) {
      ctx = contextFor(animal, budgets, t - 1)
      contexts.clear()
      contexts.set(day, ctx)
    }
    const a = evaluate(ctx, t, water)
    const s: StateId = a.state
    if (s === 'not_sure') continue
    if (s === 'normal') {
      normalRun++
      if (open.length && normalRun >= NORMAL_HOURS_TO_CLOSE) close(t)
      continue
    }
    normalRun = 0
    const top = open[open.length - 1]
    if (!top || STATE_PRIORITY[s] > STATE_PRIORITY[top.state]) {
      const change: DetectedChange = {
        id: `${animal.id}-${t}-${s}`,
        animalId: animal.id,
        at: t,
        state: s,
        reasons: a.reasons,
        resolved: false,
      }
      open.push(change)
      out.push(change)
    }
  }
  return out.sort((x, y) => y.at - x.at)
}

/**
 * Copies the owner's feedback from recorded logbook entries onto detected changes of the same
 * state within `toleranceH` hours.
 */
export function mergeFeedback(detected: DetectedChange[], recorded: DetectedChange[], toleranceH = 4): DetectedChange[] {
  return detected.map((d) => {
    if (d.state === 'normal') return d
    const match = recorded.find((r) => r.state === d.state && Math.abs(r.at - d.at) <= toleranceH * HOUR)
    return match?.feedback ? { ...d, feedback: match.feedback } : d
  })
}
