// Water debt: how much water an animal has lost since it last drank, as % of its body weight.
//
// Sources and assumptions (each marked; see docs/model-notes.md):
// - Maintenance water for horses: 5 L per 100 kg per day at 20 C rising to 12 L at 35 C
//   (NRC 2007, Nutrient Requirements of Horses). Linear in between, flat outside.
// - Donkeys: 8 to 10 L per 100 kg per day over the same range; about 20 L a day for a working
//   donkey in heat (The Donkey Sanctuary owner guidance).
// - Mule: halfway between horse and donkey. ASSUMPTION.
// - Forage water: green forage and crop residue cover part of the need, so only 70% of the
//   maintenance need builds up as debt between drinks. ASSUMPTION (FORAGE_SHARE).
// - Sweat while working: horses about 0.5 to 1 L per 100 kg per hour at slow draught work,
//   scaled by how hard the work is (climbing) and by heat above 25 C (+10% per degree, ASSUMPTION).
// - Donkeys sweat about half as much as horses for the same work. ASSUMPTION: no measured
//   figure found; donkeys conserve water better than horses. Mules 0.75. ASSUMPTION.
// - Drinking: at a known water point the animal drinks back its deficit at up to 1.5 L per
//   minute. ASSUMPTION.
// - Comfort index (horse): temperature in F plus relative humidity in %. Under 130 normal, 150
//   reduce work, 180 stop work (widely used US extension guidance for horses). For donkeys this
//   is likely conservative.

import type { Animal, HourBudget, Species, WaterProjection } from '../shared/types'
import { HOUR, MINUTE, localDayStart } from '../shared/lib/clock'

export const WATER_BANDS = { offer: 3, concern: 5, urgent: 8 } as const
export const FORAGE_SHARE = 0.3
export const DONKEY_SWEAT_FACTOR = 0.5
export const MULE_SWEAT_FACTOR = 0.75
export const DRINK_L_PER_MIN = 1.5
/** EU working equid guidance: rest at least every 4 hours of work, 30 minutes, with water. */
export const MAX_WORK_WITHOUT_WATER_H = 4

export const COMFORT = { normal: 130, reduce: 150, stop: 180 } as const
/** The comfort index only counts from this air temperature. ASSUMPTION (see alerts). */
export const COMFORT_MIN_TEMP_C = 25
/** In heat past the "reduce work" index, this much work without water is enough for WATER. */
export const HOT_WORK_WITHOUT_WATER_H = 3

export interface WeatherLike {
  tempC: number
  rh: number
}
export type WeatherFn = (t: number) => WeatherLike

const lerp = (a: number, b: number, f: number) => a + (b - a) * f
const heatFraction = (tempC: number) => Math.max(0, Math.min(1, (tempC - 20) / 15))

/** Maintenance water need in L per day. */
export function maintenanceLPerDay(species: Species, bodyWeightKg: number, tempC: number): number {
  const f = heatFraction(tempC)
  const horse = lerp(5, 12, f)
  const donkey = lerp(8, 10, f)
  const per100 = species === 'horse' ? horse : species === 'donkey' ? donkey : (horse + donkey) / 2
  return (bodyWeightKg / 100) * per100
}

/** Comfort index for horses: deg F plus RH %. */
export function comfortIndex(tempC: number, rh: number): number {
  return (tempC * 9) / 5 + 32 + rh
}

/**
 * Sweat loss in L per hour of moving work. `intensity` 0 to 1 sets the horse rate between 0.5
 * and 1 L per 100 kg per hour.
 */
export function sweatLPerHour(species: Species, bodyWeightKg: number, tempC: number, rh: number, intensity: number): number {
  const base = 0.5 + 0.5 * Math.max(0, Math.min(1, intensity))
  let heat = 1 + Math.max(0, tempC - 25) / 10
  const ci = tempC >= COMFORT_MIN_TEMP_C ? comfortIndex(tempC, rh) : 0
  if (ci >= COMFORT.stop) heat *= 1.5
  else if (ci >= COMFORT.reduce) heat *= 1.25
  const species_ = species === 'horse' ? 1 : species === 'donkey' ? DONKEY_SWEAT_FACTOR : MULE_SWEAT_FACTOR
  return (bodyWeightKg / 100) * base * heat * species_
}

/** Minutes of moving work in an hour: work minutes that were walking or trotting. */
export function movingWorkMin(b: HourBudget): number {
  return Math.min(b.workMin, b.minutes.walk + b.minutes.trot)
}

/** Work intensity 0 to 1 from the climb rate while working: 0.5 on the flat, 1 at 200 m/h. */
export function workIntensity(b: HourBudget): number {
  const moving = movingWorkMin(b)
  if (moving <= 0) return 0.5
  const climbPerHour = b.climbM / (moving / 60)
  return Math.max(0.5, Math.min(1, 0.5 + climbPerHour / 400))
}

export interface WaterState {
  /** Litres lost since the last full drink. */
  deficitL: number
  /** Last time the animal drank, epoch ms, if known. */
  lastDrink?: number
  /** Work minutes since the last water stop. */
  workSinceWaterMin: number
}

/**
 * Advance the water state through one hourly budget. `fraction` is the share of the hour that
 * has passed (1 for past hours, less for the current hour).
 */
export function stepWater(state: WaterState, animal: Animal, b: HourBudget, fraction = 1): WaterState {
  const bw = animal.bodyWeightKg
  const maint = (maintenanceLPerDay(animal.species, bw, b.tempC) / 24) * (1 - FORAGE_SHARE) * fraction
  const sweat = sweatLPerHour(animal.species, bw, b.tempC, b.rh, workIntensity(b)) * (movingWorkMin(b) / 60)
  let deficit = state.deficitL + (maint + sweat) / 2
  let lastDrink = state.lastDrink
  let work = state.workSinceWaterMin
  if (b.waterStopMin >= 3) {
    deficit = Math.max(0, deficit - DRINK_L_PER_MIN * b.waterStopMin)
    lastDrink = b.hourStart + 30 * MINUTE
    // Order inside the hour is unknown: count only the work after a mid-hour stop as half.
    work = b.workMin / 2
  } else {
    work += b.workMin
  }
  deficit += (maint + sweat) / 2
  return { deficitL: deficit, lastDrink, workSinceWaterMin: work }
}

export function deficitPct(state: WaterState, animal: Animal): number {
  return (state.deficitL / animal.bodyWeightKg) * 100
}

/** Water state at `now` from the budgets of the last 36 hours (starts with no debt). */
export function waterStateAt(animal: Animal, budgets: HourBudget[], now: number, lookbackH = 36): WaterState {
  let state: WaterState = { deficitL: 0, workSinceWaterMin: 0 }
  const from = now - lookbackH * HOUR
  // Budgets are sorted; walk back to the first in range.
  let i = budgets.length - 1
  while (i > 0 && budgets[i - 1].hourStart >= from) i--
  for (; i < budgets.length; i++) {
    const b = budgets[i]
    if (b.hourStart > now) break
    if (b.hourStart < from) continue
    const fraction = Math.min(1, (now - b.hourStart) / HOUR)
    state = stepWater(state, animal, b, fraction)
  }
  return state
}

export type WhatIfPlan = 'continue_work' | 'rest_now' | 'rest_at_water'
export const WHAT_IF_PLANS: readonly WhatIfPlan[] = ['continue_work', 'rest_now', 'rest_at_water']

export interface ProjectionOptions {
  horizonH?: number
  stepMin?: number
  /** Minutes to reach water for rest_at_water. */
  minutesToWater?: number
  /** Local hour when work stops for the day under continue_work. */
  workEndsHour?: number
}

/** Moving-work share and intensity of the most recent work hours, for continue_work. */
function recentWork(budgets: HourBudget[], now: number): { share: number; intensity: number } {
  const recent = budgets.filter((b) => b.hourStart > now - 4 * HOUR && b.hourStart <= now && b.workMin >= 15)
  if (recent.length === 0) return { share: 0.7, intensity: 0.7 }
  const covered = recent.reduce((s, b) => s + 60 * b.coverage, 0)
  const moving = recent.reduce((s, b) => s + movingWorkMin(b), 0)
  const intensity = recent.reduce((s, b) => s + workIntensity(b), 0) / recent.length
  return { share: Math.max(0.3, Math.min(1, moving / Math.max(1, covered))), intensity }
}

/** True when the animal worked in the current or the previous hour. */
export function isWorkingNow(budgets: HourBudget[], now: number): boolean {
  const recent = budgets.filter((b) => b.hourStart > now - 2 * HOUR && b.hourStart <= now)
  const last = recent[recent.length - 1]
  if (!last) return false
  const share = last.workMin / Math.max(1, 60 * last.coverage)
  return share >= 0.4
}

/**
 * Projected water deficit for the next hours under a plan. Without a plan: continue_work if
 * the animal is working now, else rest_now.
 */
export function projectWaterDebt(
  animal: Animal,
  budgets: HourBudget[],
  weather: WeatherFn,
  now: number,
  plan?: WhatIfPlan,
  opts: ProjectionOptions = {},
): WaterProjection {
  const horizonH = opts.horizonH ?? 12
  const stepMin = opts.stepMin ?? 10
  const toWater = opts.minutesToWater ?? 30
  const endHour = opts.workEndsHour ?? 18
  const chosen = plan ?? (isWorkingNow(budgets, now) ? 'continue_work' : 'rest_now')
  const state = waterStateAt(animal, budgets, now)
  const bw = animal.bodyWeightKg
  const work = recentWork(budgets, now)
  const workEnds = localDayStart(now) + endHour * HOUR
  let deficit = state.deficitL
  const points: { t: number; deficitPct: number }[] = [{ t: now, deficitPct: (deficit / bw) * 100 }]
  for (let k = 1; k * stepMin <= horizonH * 60; k++) {
    const t = now + k * stepMin * MINUTE
    const mid = t - (stepMin / 2) * MINUTE
    const w = weather(mid)
    const h = stepMin / 60
    deficit += (maintenanceLPerDay(animal.species, bw, w.tempC) / 24) * (1 - FORAGE_SHARE) * h
    const working =
      (chosen === 'continue_work' && mid < workEnds) || (chosen === 'rest_at_water' && mid < now + toWater * MINUTE && isWorkingNow(budgets, now))
    if (working) deficit += sweatLPerHour(animal.species, bw, w.tempC, w.rh, work.intensity) * work.share * h
    if (chosen === 'rest_at_water' && t - stepMin * MINUTE < now + toWater * MINUTE && t >= now + toWater * MINUTE) {
      deficit = 0
    }
    points.push({ t, deficitPct: (deficit / bw) * 100 })
  }
  const crossings: { thresholdPct: number; t: number }[] = []
  for (const thr of [WATER_BANDS.offer, WATER_BANDS.concern, WATER_BANDS.urgent]) {
    if (points[0].deficitPct >= thr) continue
    const hit = points.find((p) => p.deficitPct >= thr)
    if (hit) crossings.push({ thresholdPct: thr, t: hit.t })
  }
  return { deficitPctNow: points[0].deficitPct, points, crossings }
}
