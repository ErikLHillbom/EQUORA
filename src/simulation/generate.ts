// Deterministic generator for the demo herd: hourly time budgets for 180 days up to the demo
// clock, position fixes for the last 8 days, and the scripted logbook entries.
//
// Every animal-day draws from its own seeded random stream (animal id + day number), so the same
// herd comes out on every render, test and screenshot. Results are memoised per animal.
//
// How a day is built:
// 1. Work: the animal's jobs for that weekday and season become legs along routes.json (walk,
//    stand while loading, water stops). Sunday is a rest day except for water carrying.
// 2. Water at home: owners water at about 06:15, 13:00, 18:00 and 21:00 when the animal is home.
// 3. Lying: 2 to 4 bouts at night, mostly before dawn; sometimes a short bout after work
//    (Bukhari et al. 2022: 43% of pack donkeys sometimes lie down after loading); rare day bouts.
// 4. Free time is split into eating, grazing steps and standing with the animal's own shares,
//    a daily factor and hour-to-hour noise.
// 5. Scenarios (scenarios.ts) change one day: dull afternoons, a horse rolling in the evening,
//    work without water, a fall.

import type { Activity, DetectedChange, Fix, HourBudget, Reason } from '../shared/types'
import { DAY, DEMO_NOW, HOUR, MINUTE, TZ_OFFSET_MS, localDayStart } from '../shared/lib/clock'
import { createRng, gaussian } from '../shared/lib/random'
import { HERD, herdMember, type HerdMember } from './herd'
import { ARICHA_WATER, MARKET, distanceKm } from './places'
import { climbBetween, pointAt, routeLengthKm, type RoutePoint } from './routes'
import { weatherAt } from './weather'
import { SCENARIOS, scenariosFor, type Scenario } from './scenarios'

export const HISTORY_DAYS = 180
/** Days with position fixes: today and the 7 days before. */
export const FIX_DAYS = 8
/** Early cherries reach the washing stations from mid-September; the main harvest is October to December. */
export const HARVEST_START = Date.UTC(2026, 8, 15) - TZ_OFFSET_MS

const FREE = 0
const WALK = 1
const STAND = 2
const WATER = 3
const LIE = 4
const MISSING = 5
const FUTURE = 6

const FREE_WALK_KMH = 1.8 // grazing steps, assumption
const FREE_CLIMB_PER_MIN = 0.3 // metres per minute of grazing steps on the slopes, assumption

interface Leg {
  start: number
  end: number
  kind: 'walk' | 'stand' | 'water'
  routeId?: string
  reverse?: boolean
  kmPerMin?: number
  at?: RoutePoint
}

interface DayPlan {
  dayStart: number
  daysAgo: number
  legs: Leg[]
  lie: [number, number][]
  /** Roll minutes; `inBout` when the roll happens during a lying bout. */
  rolls: { min: number; inBout: boolean }[]
  falls: number[]
  fallAt?: RoutePoint
  gaps: [number, number][]
  scen: Scenario[]
}

const hm = (h: number, m = 0) => h * 60 + m

function routeEnd(routeId: string, far: boolean): RoutePoint {
  return pointAt(routeId, far ? routeLengthKm(routeId) : 0)
}

function homePoint(household: string): RoutePoint {
  return routeEnd(`${household}-aricha`, false)
}

const ARICHA_PT = routeEnd('market-aricha', true)
const MARKET_PT = routeEnd('market-aricha', false)
const RIDGE_PT = routeEnd('north-slope', true)
const WATER_PT: RoutePoint = { lat: ARICHA_WATER.lat, lon: ARICHA_WATER.lon, eleM: routeEnd('domorso-water', true).eleM }

/** Distance along the market-to-home route where Kito falls: 1.2 km in a straight line from the market. */
function fallDistanceKm(routeId: string): number {
  const L = routeLengthKm(routeId)
  let best = 0
  let bestErr = Infinity
  for (let d = 0; d <= L; d += 0.01) {
    const err = Math.abs(distanceKm(pointAt(routeId, d, true), MARKET) - 1.2)
    if (err < bestErr) {
      bestErr = err
      best = d
    }
  }
  return best
}

// ---------- Day plan ----------

function planDay(m: HerdMember, dayStart: number, daysAgo: number): DayPlan {
  const a = m.animal
  const p = m.profile
  const rng = createRng(`${a.id}:${Math.round(dayStart / DAY)}`)
  const dow = new Date(dayStart + TZ_OFFSET_MS).getUTCDay()
  const harvest = dayStart >= HARVEST_START
  const scen = scenariosFor(a.id, daysAgo)
  const has = (k: Scenario['kind']) => scen.some((s) => s.kind === k)
  const hh = a.household
  const home = homePoint(hh)
  const legs: Leg[] = []
  const jobEnds: number[] = []
  const falls: number[] = []
  let fallAt: RoutePoint | undefined
  let cur = 0
  const withWater = !has('noWater') && !has('longWork')
  // A dull animal walks slower too (Bari this morning).
  const slow = has('quiet') && daysAgo === 0 ? 0.85 : 1

  const walk = (routeId: string, reverse: boolean, loaded: boolean, factor = 1, trot = false) => {
    const km = routeLengthKm(routeId)
    const kmh = (loaded ? p.speedLoaded : p.speedEmpty) * factor * slow * (0.95 + 0.1 * rng()) * (trot ? 1.05 : 1)
    const dur = Math.max(1, Math.round((km / kmh) * 60))
    legs.push({ start: cur, end: cur + dur, kind: 'walk', routeId, reverse, kmPerMin: km / dur })
    cur += dur
  }
  const stand = (min: number, at: RoutePoint, water = false) => {
    legs.push({ start: cur, end: cur + min, kind: water ? 'water' : 'stand', at })
    cur += min
  }
  const startAt = (h: number) => {
    cur = Math.max(cur, Math.round(h * 60 + (rng() - 0.4) * 30))
  }

  const workday = dow !== 0
  for (const job of p.jobs) {
    if (job === 'pack_aricha' && workday) {
      const r = `${hh}-aricha`
      if (harvest) {
        startAt(p.workStart)
        const trips = p.harvestTrips
        for (let i = 0; i < trips; i++) {
          walk(r, false, true)
          stand(10 + Math.round(rng() * 6), ARICHA_PT)
          if (withWater) stand(8 + Math.round(rng() * 5), WATER_PT, true)
          walk(r, true, false)
          if (i < trips - 1) stand(18 + Math.round(rng() * 6), home)
        }
        jobEnds.push(cur)
        if (has('noWater')) {
          // Chaltu: no water at midday either, and a third load leaves at 13:30 in the heat.
          cur = Math.max(cur, hm(13, 30))
          walk(r, false, true)
          stand(12, ARICHA_PT)
          walk(r, true, false)
        }
      } else if (dow === 2 || dow === 6) {
        startAt(p.workStart + 0.5)
        walk(`${hh}-market`, false, true)
        stand(90 + Math.round(rng() * 60), MARKET_PT)
        walk(`${hh}-market`, true, false)
        jobEnds.push(cur)
      }
    }
    if (job === 'slope_pack' && workday && !harvest && (dow === 1 || dow === 3 || dow === 5)) {
      startAt(p.workStart)
      walk('north-slope', false, false)
      stand(25 + Math.round(rng() * 15), RIDGE_PT)
      walk('north-slope', true, true)
      jobEnds.push(cur)
    }
    if (job === 'water_carry') {
      const r = `${hh}-water`
      startAt(p.workStart)
      walk(r, false, false)
      stand(8 + Math.round(rng() * 4), WATER_PT, true)
      stand(12 + Math.round(rng() * 6), WATER_PT)
      walk(r, true, true)
      jobEnds.push(cur)
      if (workday) {
        startAt(15.5)
        walk(r, false, false)
        stand(6 + Math.round(rng() * 4), WATER_PT, true)
        stand(12 + Math.round(rng() * 6), WATER_PT)
        walk(r, true, true)
        jobEnds.push(cur)
      }
    }
    if (job === 'cart_town' && workday) {
      const toMarket = `${hh}-market`
      startAt(p.workStart)
      walk(toMarket, false, false)
      stand(12 + Math.round(rng() * 6), MARKET_PT)
      const shuttles = harvest ? p.harvestTrips : 2
      for (let i = 0; i < shuttles; i++) {
        walk('market-aricha', false, true, 1, true)
        stand(8 + Math.round(rng() * 5), ARICHA_PT)
        if (i === 1 && withWater) stand(8 + Math.round(rng() * 5), WATER_PT, true)
        walk('market-aricha', true, false, 1, true)
        if (i < shuttles - 1) stand(15 + Math.round(rng() * 8), MARKET_PT)
      }
      if (has('fall')) {
        // Kito waits for the last payment, then heads home and falls at 14:14, 1.2 km out.
        const fallMin = scen.find((s) => s.kind === 'fall')!.fromMin!
        const d = fallDistanceKm(toMarket)
        const kmPerMin = p.speedEmpty / 60
        const legStart = fallMin - Math.round(d / kmPerMin)
        if (cur < legStart) stand(legStart - cur, MARKET_PT)
        legs.push({ start: cur, end: fallMin, kind: 'walk', routeId: toMarket, reverse: true, kmPerMin: d / (fallMin - cur) })
        fallAt = pointAt(toMarket, d, true)
        falls.push(fallMin)
        cur = fallMin
      } else {
        walk(toMarket, true, false)
      }
      jobEnds.push(cur)
    }
    if (job === 'riding' && workday) {
      const r = `${hh}-market`
      startAt(8)
      walk(r, false, false, 1, true)
      stand(60 + Math.round(rng() * 60), MARKET_PT)
      walk(r, true, false, 1, true)
      if (has('longWork')) {
        // A second ride straight away, out until early afternoon without water.
        walk(r, false, false, 1, true)
        stand(75, MARKET_PT)
        walk(r, true, false, 1, true)
      }
      jobEnds.push(cur)
      if (!has('longWork') && (dow === 3 || dow === 6)) {
        startAt(15)
        walk(r, false, false, 1, true)
        stand(40 + Math.round(rng() * 30), MARKET_PT)
        walk(r, true, false, 1, true)
        jobEnds.push(cur)
      }
    }
  }

  // Water at home, when the animal is home and free.
  const busy = (s: number, e: number) => legs.some((l) => l.start < e && l.end > s) || falls.some((f) => f < e)
  const homeWater = (s: number, len: number) => {
    if (!busy(s, s + len)) legs.push({ start: s, end: s + len, kind: 'water', at: home })
  }
  homeWater(hm(6, 12) + Math.round(rng() * 6), 8)
  if (withWater) {
    const lastMorningEnd = jobEnds.filter((e) => e < hm(15)).reduce((x, y) => Math.max(x, y), 0)
    homeWater(Math.max(hm(13), lastMorningEnd + 10), 8)
  }
  homeWater(hm(18) + Math.round(rng() * 10), 8)
  homeWater(hm(21) + Math.round(rng() * 10), 5)
  legs.sort((x, y) => x.start - y.start)

  // Lying.
  const lie: [number, number][] = []
  const nb = p.nightBouts[0] + Math.floor(rng() * (p.nightBouts[1] - p.nightBouts[0] + 1))
  const total = p.nightLieMin[0] + rng() * (p.nightLieMin[1] - p.nightLieMin[0])
  const lens = Array.from({ length: nb }, () => Math.round((total / nb) * (0.75 + 0.5 * rng())))
  const early = Math.ceil(nb * 0.6)
  const place = (w0: number, w1: number, ls: number[]) => {
    let t = w0 + Math.round(rng() * 40)
    for (const len of ls) {
      if (t + len > w1) break
      lie.push([t, t + len])
      t += len + 45 + Math.round(rng() * 60)
    }
  }
  place(hm(0, 20), hm(5, 30), lens.slice(0, early))
  place(hm(21, 15), hm(23, 55), lens.slice(early))
  if (rng() < p.dayLieProb) {
    const s = hm(11) + Math.round(rng() * 300)
    lie.push([s, s + 15 + Math.round(rng() * 15)])
  }
  for (const e of jobEnds) {
    if (rng() < p.postWorkLieProb) {
      const s = e + 5 + Math.round(rng() * 20)
      lie.push([s, s + 10 + Math.round(rng() * 15)])
    }
  }
  for (const s of scen) for (const b of s.extraLie ?? []) lie.push([b[0], b[1]])
  if (fallAt) lie.push([falls[0], hm(24)])

  // Rolling. Horses often roll after work, donkeys roll in dust some afternoons. Never close to
  // a lying bout, so one hour never shows three up-and-downs on a normal day.
  const rolls: { min: number; inBout: boolean }[] = []
  const clearOfLying = (t: number) => lie.every(([s, e]) => t < s - 30 || t > e + 30)
  if (a.species !== 'donkey' && jobEnds.length && rng() < 0.5 && !fallAt) {
    const t = jobEnds[0] + 40 + Math.round(rng() * 30)
    if (clearOfLying(t) && !busy(t, t + 2)) rolls.push({ min: t, inBout: false })
  } else if (a.species === 'donkey' && rng() < 0.25) {
    const t = hm(15) + Math.round(rng() * 90)
    if (clearOfLying(t) && !busy(t, t + 2)) rolls.push({ min: t, inBout: false })
  }
  if (has('colic')) {
    rolls.push({ min: hm(18, 16), inBout: true }, { min: hm(18, 28), inBout: true })
  }

  // Missing data: now and then the tag drops a few hours (never in the last 2 days or on a scenario day).
  const gaps: [number, number][] = []
  if (daysAgo >= 2 && scen.length === 0 && rng() < 0.05) {
    const s = Math.floor(rng() * 20) * 60 + Math.round(rng() * 30)
    gaps.push([s, Math.min(hm(24), s + 60 + Math.round(rng() * 180))])
  }

  return { dayStart, daysAgo, legs, lie, rolls, falls, fallAt, gaps, scen }
}

// ---------- Hourly budgets ----------

const codes = new Uint8Array(1440)

function emptyMinutes(): Record<Activity, number> {
  return { stand: 0, walk: 0, trot: 0, eat: 0, roll: 0, lie: 0, unknown: 0 }
}

function budgetsForDay(m: HerdMember, plan: DayPlan, nowMin: number, fromMin: number): HourBudget[] {
  const a = m.animal
  const p = m.profile
  const rng = createRng(`h:${a.id}:${Math.round(plan.dayStart / DAY)}`)
  codes.fill(FREE)
  for (const [s, e] of plan.gaps) codes.fill(MISSING, s, e)
  for (const l of plan.legs) {
    const c = l.kind === 'walk' ? WALK : l.kind === 'water' ? WATER : STAND
    for (let i = Math.max(0, l.start); i < Math.min(1440, l.end); i++) if (codes[i] === FREE) codes[i] = c
  }
  // Lying only fills free minutes. Keep the bouts that actually landed.
  const bouts: [number, number][] = []
  for (const [s, e] of plan.lie) {
    let marked = 0
    for (let i = Math.max(0, s); i < Math.min(1440, e); i++) {
      if (codes[i] === FREE) {
        codes[i] = LIE
        marked++
      }
    }
    if (marked >= 3) bouts.push([s, e])
  }
  if (fromMin > 0) codes.fill(MISSING, 0, fromMin)
  if (nowMin < 1440) codes.fill(FUTURE, nowMin, 1440)

  const quiet = plan.scen.filter((s) => s.kind === 'quiet' || s.kind === 'colic')
  const dayEat = 1 + 0.04 * gaussian(rng)
  const dayWalk = 1 + 0.08 * gaussian(rng)
  const out: HourBudget[] = []
  const lastHour = Math.ceil(nowMin / 60)
  for (let h = Math.floor(fromMin / 60); h < Math.min(24, lastHour); h++) {
    let walkW = 0
    let standW = 0
    let water = 0
    let lie = 0
    let missing = 0
    let free = 0
    let future = 0
    for (let i = h * 60; i < h * 60 + 60; i++) {
      const c = codes[i]
      if (c === FREE) free++
      else if (c === WALK) walkW++
      else if (c === STAND) standW++
      else if (c === WATER) water++
      else if (c === LIE) lie++
      else if (c === MISSING) missing++
      else future++
    }
    const hourStart = plan.dayStart + h * HOUR
    // Small dropouts inside the hour.
    if (rng() < 0.25 && free > 3) {
      const d = 1 + Math.floor(rng() * 3)
      free -= d
      missing += d
    }
    const covered = 60 - missing - future
    const minutes = emptyMinutes()
    let rollingBouts = 0
    let upDowns = 0
    let lyingBouts = 0
    let falls = 0
    const inHour = (t: number) => t >= h * 60 && t < h * 60 + 60 && t < nowMin
    for (const r of plan.rolls) {
      if (!inHour(r.min)) continue
      rollingBouts++
      minutes.roll += 1
      if (r.inBout) {
        lie -= 1
      } else if (free >= 2) {
        free -= 2
        lie += 1
        upDowns++
      }
    }
    for (const [s, e] of bouts) {
      if (inHour(s)) lyingBouts++
      if (e < 1440 && inHour(e)) upDowns++
    }
    for (const f of plan.falls) if (inHour(f)) falls++

    // Free time: eating, grazing steps and standing.
    const night = h < 5 || h >= 21
    let eatS = night ? p.eatNight : p.eatDay
    if (h === 5 || h === 6) eatS += 0.08
    if (h >= 17 && h <= 19) eatS += 0.06
    let walkS = night ? p.walkDay * 0.4 : p.walkDay
    eatS *= dayEat * (1 + p.noise * gaussian(rng))
    walkS *= dayWalk * (1 + p.noise * 1.5 * gaussian(rng))
    for (const s of quiet) {
      const from = s.fromMin ?? 0
      const to = s.toMin ?? 1440
      const overlap = Math.max(0, Math.min(to, h * 60 + 60) - Math.max(from, h * 60)) / 60
      if (overlap > 0) {
        eatS *= 1 - overlap * (1 - (s.eat ?? 1))
        walkS *= 1 - overlap * (1 - (s.walk ?? 1))
      }
    }
    eatS = Math.min(0.92, Math.max(0, eatS))
    walkS = Math.min(0.5, Math.max(0, walkS))
    if (eatS + walkS > 0.95) eatS = 0.95 - walkS
    const eat = Math.round(free * eatS)
    const walkF = Math.min(free - eat, Math.round(free * walkS))
    const trotF = a.species !== 'donkey' && !night && rng() < 0.05 && free - eat - walkF > 1 ? 1 : 0
    const unknown = free - eat - walkF - trotF > 2 && rng() < 0.4 ? 1 : 0
    const standF = free - eat - walkF - trotF - unknown
    const trotW = Math.round(walkW * p.trotShare)

    minutes.eat = eat
    minutes.walk = walkW - trotW + walkF
    minutes.trot = trotW + trotF
    minutes.stand = standW + water + standF
    minutes.lie = Math.max(0, lie)
    minutes.unknown = unknown

    // Distance and climb along the route legs in this hour, plus grazing steps.
    let km = (walkF * FREE_WALK_KMH) / 60
    let climb = walkF * FREE_CLIMB_PER_MIN
    for (const l of plan.legs) {
      if (l.kind !== 'walk' || l.end <= h * 60 || l.start >= h * 60 + 60) continue
      const s = Math.max(l.start, h * 60)
      const e = Math.min(l.end, h * 60 + 60, nowMin)
      if (e <= s) continue
      const d0 = (s - l.start) * l.kmPerMin!
      const d1 = (e - l.start) * l.kmPerMin!
      km += d1 - d0
      climb += climbBetween(l.routeId!, d0, d1, l.reverse)
    }

    const weather = weatherAt(hourStart)
    const odbaRaw =
      covered > 0
        ? (minutes.stand * 0.04 +
            minutes.walk * 0.2 +
            minutes.trot * 0.45 +
            minutes.eat * 0.09 +
            minutes.roll * 0.6 +
            minutes.lie * 0.015 +
            minutes.unknown * 0.1 +
            walkW * 0.04) /
          covered
        : 0
    out.push({
      animalId: a.id,
      hourStart,
      coverage: Math.round((covered / 60) * 1000) / 1000,
      minutes,
      lyingBouts,
      upDowns,
      rollingBouts,
      falls,
      odba: Math.round(odbaRaw * (1 + 0.05 * gaussian(rng)) * 1000) / 1000,
      distanceKm: Math.round(km * 100) / 100,
      climbM: Math.round(climb),
      workMin: walkW + standW,
      tempC: Math.round((weather.tempC + 0.6 + 0.3 * gaussian(rng) + (walkW / 60) * 1.2) * 10) / 10,
      rh: weather.rh,
      waterStopMin: water,
    })
  }
  return out
}

// ---------- Memoised public API ----------

interface AnimalData {
  plans: Map<number, DayPlan>
  budgets: HourBudget[]
}

const cache = new Map<string, AnimalData>()

function dayStartFor(daysAgo: number): number {
  return localDayStart(DEMO_NOW) - daysAgo * DAY
}

function build(m: HerdMember): AnimalData {
  const plans = new Map<number, DayPlan>()
  const budgets: HourBudget[] = []
  const tagSince = m.animal.tagSince
  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo--) {
    const dayStart = dayStartFor(daysAgo)
    if (dayStart + DAY <= tagSince) continue
    const plan = planDay(m, dayStart, daysAgo)
    plans.set(daysAgo, plan)
    const nowMin = daysAgo === 0 ? Math.round((DEMO_NOW - dayStart) / MINUTE) : 1440
    const fromMin = tagSince > dayStart ? Math.ceil((tagSince - dayStart) / MINUTE) : 0
    for (const b of budgetsForDay(m, plan, nowMin, fromMin)) budgets.push(b)
  }
  return { plans, budgets }
}

function data(animalId: string): AnimalData {
  let d = cache.get(animalId)
  if (!d) {
    d = build(herdMember(animalId))
    cache.set(animalId, d)
  }
  return d
}

/** The 12 animals of the demo herd. */
export function getHerd() {
  return HERD.map((m) => m.animal)
}

/** Hourly time budgets for 180 days up to the demo clock, oldest first. Memoised. */
export function getBudgets(animalId: string): HourBudget[] {
  return data(animalId).budgets
}

/** Clears the memo. Tests use it to time a cold run. */
export function clearSimulationCache(): void {
  cache.clear()
  fixCache.clear()
}

// ---------- Position fixes ----------

const fixCache = new Map<string, Fix[]>()

function jitter(p: RoutePoint, metres: number, rng: () => number): Fix {
  const dLat = ((rng() * 2 - 1) * metres) / 110540
  const dLon = ((rng() * 2 - 1) * metres) / (111320 * Math.cos((p.lat * Math.PI) / 180))
  return { t: 0, lat: Number((p.lat + dLat).toFixed(6)), lon: Number((p.lon + dLon).toFixed(6)), eleM: Math.round(p.eleM) }
}

function dayFixes(m: HerdMember, plan: DayPlan): Fix[] {
  const key = `${m.animal.id}:${plan.daysAgo}`
  const hit = fixCache.get(key)
  if (hit) return hit
  const rng = createRng(`fix:${key}`)
  const home = homePoint(m.animal.household)
  const nowMin = plan.daysAgo === 0 ? (DEMO_NOW - plan.dayStart) / MINUTE : 1440
  const startMin = Math.max(0, (m.animal.tagSince - plan.dayStart) / MINUTE)
  const fixes: Fix[] = []
  const push = (min: number, f: Fix) => {
    if (min < startMin || min > nowMin) return
    f.t = plan.dayStart + Math.round(min * MINUTE)
    fixes.push(f)
  }
  let here = home
  let t = 0
  const stay = (until: number) => {
    const atHome = here === home
    while (t < until) {
      push(t, jitter(here, atHome ? 50 : 6, rng))
      t += atHome ? 20 + rng() * 10 : 3 + rng() * 2
    }
    t = until
  }
  for (const l of plan.legs) {
    if (l.start > t) stay(l.start)
    if (l.kind === 'walk') {
      t = l.start
      while (t < l.end) {
        const pt = pointAt(l.routeId!, (t - l.start) * l.kmPerMin!, l.reverse)
        push(t, jitter(pt, 4, rng))
        t += 1 + rng()
      }
      t = l.end
      here = pointAt(l.routeId!, (l.end - l.start) * l.kmPerMin!, l.reverse)
      // Back at the start of a route means back home.
      if (distanceKm(here, home) < 0.05) here = home
    } else {
      here = l.at ?? here
      if (here !== home && distanceKm(here, home) < 0.05) here = home
      stay(l.end)
    }
    if (plan.fallAt && t >= plan.falls[0]) break
  }
  if (plan.fallAt) {
    // After the fall the tag keeps reporting from the same spot.
    for (let s = plan.falls[0]; s <= nowMin; s += 2) push(s, jitter(plan.fallAt, 2, rng))
  } else {
    stay(nowMin)
  }
  fixes.sort((x, y) => x.t - y.t)
  fixCache.set(key, fixes)
  return fixes
}

/** Position fixes between from and to (epoch ms). Only today and the 7 days before have fixes. */
export function getFixes(animalId: string, from: number, to: number): Fix[] {
  const m = herdMember(animalId)
  const d = data(animalId)
  const out: Fix[] = []
  for (let daysAgo = FIX_DAYS - 1; daysAgo >= 0; daysAgo--) {
    const plan = d.plans.get(daysAgo)
    if (!plan) continue
    if (plan.dayStart + DAY <= from || plan.dayStart > to) continue
    for (const f of dayFixes(m, plan)) if (f.t >= from && f.t <= to) out.push(f)
  }
  return out
}

// ---------- Logbook ----------

const LOG_REASONS: Record<Scenario['kind'], Omit<Reason, 'params'>[]> = {
  quiet: [
    { kind: 'activity', direction: 'down', textKey: 'simulation.log.quiet' },
    { kind: 'lying', direction: 'up', textKey: 'simulation.log.moreLying' },
  ],
  colic: [
    { kind: 'upDowns', textKey: 'simulation.log.upDowns' },
    { kind: 'rolling', textKey: 'simulation.log.rolling' },
  ],
  noWater: [
    { kind: 'noRest', textKey: 'simulation.log.noWater' },
    { kind: 'waterDebt', direction: 'up', textKey: 'simulation.log.heat' },
  ],
  longWork: [{ kind: 'noRest', textKey: 'simulation.log.longWork' }],
  fall: [{ kind: 'fall', textKey: 'simulation.log.fall' }],
}

/**
 * The logbook as the owner saw it: scripted changes with the owner's feedback, newest first.
 * The same events are in the hourly data, so alerts.detectChanges finds them too.
 */
export function getDetectedChanges(animalId: string): DetectedChange[] {
  const m = herdMember(animalId)
  return SCENARIOS.filter((s) => s.animalId === animalId && s.logbook)
    .map((s) => ({
      id: `${s.animalId}-${s.daysAgo}-${s.kind}`,
      animalId,
      at: dayStartFor(s.daysAgo) + s.logbook!.atMin * MINUTE,
      state: s.logbook!.state,
      reasons: LOG_REASONS[s.kind].map((r) => ({ ...r, params: { name: m.animal.name } })),
      resolved: s.logbook!.resolved,
      feedback: s.logbook!.feedback,
    }))
    .sort((x, y) => y.at - x.at)
}

/** The animal's homestead with its elevation. */
export function homeOfAnimal(animalId: string): RoutePoint {
  return homePoint(herdMember(animalId).animal.household)
}
