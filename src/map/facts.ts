// What the map shows for each animal: its last fix, today's route, and today's numbers.
// Everything comes from the simulation (positions are simulated, the tag has no GPS yet).
import { assessHerd } from '../alerts'
import { workloadOf } from '../baseline'
import { describePosition, recommendFor } from '../forecast'
import { DEMO_NOW, localDayStart } from '../shared/lib/clock'
import type { Animal, Assessment, Fix, Place, Recommendation } from '../shared/types'
import { distanceKm, getBudgets, getFixes, herdMember, homeOfAnimal, PLACES } from '../simulation'

/** A climb counts from this much gain, in m. */
export const MIN_CLIMB_M = 40
/** A climb ends when the animal has come down this far from its highest point, in m. */
export const CLIMB_END_DROP_M = 15
/** Fixes this close to home are drawn at home, so a night in the yard is not a scribble. */
export const HOME_SNAP_KM = 0.15
/** Route vertices closer than this to the previous one are dropped. */
const MIN_STEP_KM = 0.02

export interface Climbs {
  count: number
  /** Gain of the longest climb, m. 0 when there was none. */
  longestM: number
}

/**
 * Uphill climbs in a list of fixes: stretches where the animal gained at least MIN_CLIMB_M,
 * ended by a drop of CLIMB_END_DROP_M or the end of the list.
 */
export function countClimbs(fixes: readonly Pick<Fix, 'eleM'>[]): Climbs {
  if (fixes.length < 2) return { count: 0, longestM: 0 }
  let low = fixes[0].eleM
  let high = low
  let climbing = false
  let count = 0
  let longest = 0
  for (const { eleM } of fixes) {
    if (!climbing) {
      if (eleM < low) low = eleM
      if (eleM - low >= MIN_CLIMB_M) {
        climbing = true
        high = eleM
      }
    } else {
      if (eleM > high) high = eleM
      if (high - eleM >= CLIMB_END_DROP_M) {
        count++
        longest = Math.max(longest, high - low)
        climbing = false
        low = eleM
      }
    }
  }
  if (climbing) {
    count++
    longest = Math.max(longest, high - low)
  }
  return { count, longestM: Math.round(longest) }
}

/** Today's route as [lon, lat] pairs: fixes near home snap to home, tiny steps are dropped. */
export function routeLine(fixes: readonly Fix[], home: { lat: number; lon: number }): [number, number][] {
  const out: [number, number][] = []
  let last: { lat: number; lon: number } | undefined
  for (const f of fixes) {
    const p = distanceKm(f, home) <= HOME_SNAP_KM ? home : f
    if (last && distanceKm(last, p) < MIN_STEP_KM) continue
    out.push([p.lon, p.lat])
    last = p
  }
  return out
}

export interface TodayNumbers {
  distanceKm: number
  climbM: number
  workMin: number
  /** Mean workload (0 to 100) of the hours with work. NaN when the animal did not work. */
  workload: number
}

/** Today's numbers from the tag's hourly budgets, from local midnight to now. */
export function todayNumbers(animalId: string, now: number = DEMO_NOW): TodayNumbers {
  const start = localDayStart(now)
  const hours = getBudgets(animalId).filter((b) => b.hourStart >= start && b.hourStart < now)
  const worked = hours.filter((b) => b.workMin > 0)
  return {
    distanceKm: hours.reduce((s, b) => s + b.distanceKm, 0),
    climbM: hours.reduce((s, b) => s + b.climbM, 0),
    workMin: hours.reduce((s, b) => s + b.workMin, 0),
    workload: worked.length ? worked.reduce((s, b) => s + workloadOf(b), 0) / worked.length : NaN,
  }
}

export interface MapAnimal {
  animal: Animal
  assessment: Assessment
  /** Last position fix today. Undefined when the tag sent none today. */
  lastFix?: Fix
  /** Today's route, [lon, lat]. */
  route: [number, number][]
  today: TodayNumbers
  climbs: Climbs
  /** Where the last fix is, in words. */
  where?: ReturnType<typeof describePosition>
  /** The first next step for the owner or health worker. */
  next?: Recommendation
}

/** The herd for the map, most urgent first (the order of assessHerd). */
export function mapHerd(now: number = DEMO_NOW, places: Place[] = PLACES): MapAnimal[] {
  const start = localDayStart(now)
  return assessHerd(now).map((assessment) => {
    const id = assessment.animalId
    const animal = herdMember(id).animal
    const fixes = getFixes(id, start, now)
    const lastFix = fixes[fixes.length - 1]
    return {
      animal,
      assessment,
      lastFix,
      route: routeLine(fixes, homeOfAnimal(id)),
      today: todayNumbers(id, now),
      climbs: countClimbs(fixes),
      where: lastFix ? describePosition(lastFix, places) : undefined,
      next: recommendFor(id, now)[0],
    }
  })
}

/** [[west, south], [east, north]] around the given points, or undefined for none. */
export function boundsOf(points: readonly { lat: number; lon: number }[]): [[number, number], [number, number]] | undefined {
  if (points.length === 0) return undefined
  let w = Infinity
  let s = Infinity
  let e = -Infinity
  let n = -Infinity
  for (const p of points) {
    w = Math.min(w, p.lon)
    e = Math.max(e, p.lon)
    s = Math.min(s, p.lat)
    n = Math.max(n, p.lat)
  }
  return [
    [w, s],
    [e, n],
  ]
}
