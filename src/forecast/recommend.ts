// What to do next, as plain sentences with a time and a place. The tag never names a disease:
// it says look, check and call help. A person makes the call.

import type { Animal, Assessment, Fix, Place, Reason, Recommendation, SignalForecast, WaterProjection } from '../shared/types'
import { HOUR, MINUTE, formatTime } from '../shared/lib/clock'
import { t, type Lang } from '../i18n'
import { WATER_BANDS, type WhatIfPlan } from './water'

export interface ForecastBundle {
  /** Water projection under what the animal is doing now. */
  water?: WaterProjection
  /** Water projections under each what-if plan. */
  whatIf?: Partial<Record<WhatIfPlan, WaterProjection>>
  signals?: SignalForecast[]
}

export interface RecommendContext {
  now: number
  /** Most recent position fix. */
  lastFix?: Fix
  /** Since when the animal has not moved more than about 25 m. */
  stillSince?: number
  /** First time in the coming hours the air drops below the comfort-index temperature. */
  coolAt?: number
}

const COMPASS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const
const COMPASS_EN: Record<(typeof COMPASS)[number], string> = {
  n: 'north',
  ne: 'north-east',
  e: 'east',
  se: 'south-east',
  s: 'south',
  sw: 'south-west',
  w: 'west',
  nw: 'north-west',
}

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

function bearing(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const y = Math.sin(dLon) * Math.cos(la2)
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

/**
 * "1.2 km north of the market": the nearest landmark everyone knows. The market and the washing
 * station come first; water points within 3 km next; then any place.
 */
export function describePosition(p: { lat: number; lon: number }, places: Place[]) {
  const near = (kinds: Place['kind'][], maxKm: number) =>
    places.filter((x) => kinds.includes(x.kind) && distanceKm(p, x) <= maxKm)
  const pool = [near(['market', 'washing_station'], 3), near(['water'], 3), places].find((l) => l.length > 0)!
  let best = pool[0]
  let bestD = Infinity
  for (const x of pool) {
    const d = distanceKm(p, x)
    if (d < bestD) {
      bestD = d
      best = x
    }
  }
  const dir = COMPASS[Math.round(bearing(best, p) / 45) % 8]
  return {
    km: Math.round(bestD * 10) / 10,
    dir: COMPASS_EN[dir],
    dirKey: `forecast.dir.${dir}`,
    place: t(best.nameKey, {}, 'en'),
    placeKey: best.nameKey,
    at: bestD < 0.15,
  }
}

function nearestOfKind(p: { lat: number; lon: number } | undefined, places: Place[], kind: Place['kind']) {
  const pool = places.filter((x) => x.kind === kind)
  if (!pool.length) return undefined
  if (!p) return { place: pool[0], km: NaN }
  let best = pool[0]
  let bestD = Infinity
  for (const x of pool) {
    const d = distanceKm(p, x)
    if (d < bestD) {
      bestD = d
      best = x
    }
  }
  return { place: best, km: bestD }
}

const floorQuarter = (t0: number) => t0 - (t0 % (15 * MINUTE))
const ceilHour = (t0: number) => t0 - (t0 % HOUR) + HOUR

function crossing(p: WaterProjection | undefined, thr: number): number | undefined {
  return p?.crossings.find((c) => c.thresholdPct === thr)?.t
}

/**
 * The sentence for a recommendation in a language. Params named `xKey` hold string keys: their
 * translation replaces param `x`, so places and directions read right in Amharic too.
 */
export function recommendationText(r: Pick<Recommendation, 'textKey' | 'params'>, lang: Lang = 'en'): string {
  const params: Record<string, string | number> = { ...r.params }
  for (const [k, v] of Object.entries(r.params)) {
    if (k.endsWith('Key') && typeof v === 'string') params[k.slice(0, -3)] = t(v, {}, lang)
  }
  return t(r.textKey, params, lang)
}

function rec(id: string, priority: number, textKey: string, params: Recommendation['params'], because: Reason[]): Recommendation {
  return { id, priority, textKey, params, because }
}

/**
 * Concrete next steps for one animal, most urgent first.
 * `places` are the known places (water points, market, washing station, homes).
 */
export function recommend(
  animal: Animal,
  assessment: Assessment,
  forecasts: ForecastBundle,
  places: Place[],
  ctx: RecommendContext = { now: assessment.at },
): Recommendation[] {
  const name = animal.name
  const now = ctx.now
  const out: Recommendation[] = []
  const reasons = assessment.reasons
  const has = (k: Reason['kind']) => reasons.find((r) => r.kind === k)
  const position = ctx.lastFix ? describePosition(ctx.lastFix, places) : undefined
  const minutesStill = ctx.stillSince !== undefined ? Math.max(0, Math.round((now - ctx.stillSince) / MINUTE)) : undefined
  const id = (s: string) => `${animal.id}-${s}`

  switch (assessment.state) {
    case 'urgent': {
      const fall = has('fall')
      const first = fall ?? reasons[0]
      const down = !!(fall || has('longLying'))
      if (position) {
        const minutes = minutesStill ?? (fall ? Number(fall.params.minutes) : 0)
        const { at, ...where } = position
        const key = at ? 'forecast.rec.goNowAt' : 'forecast.rec.goNow'
        out.push(rec(id('go-now'), 0, down ? `${key}Stand` : key, { name, ...where, minutes }, [first]))
      } else {
        out.push(rec(id('go-now'), 0, down ? 'forecast.rec.goNowNoPositionStand' : 'forecast.rec.goNowNoPosition', { name }, [first]))
      }
      if (down) {
        // The stand check is in the first sentence.
      } else if (has('upDowns') || has('rolling')) {
        out.push(rec(id('restless'), 1, 'forecast.rec.restless', { name }, [first]))
      } else {
        out.push(rec(id('dull'), 1, 'forecast.rec.dullNotEating', { name }, [first]))
      }
      out.push(rec(id('call'), 2, 'forecast.rec.callHelp', { name }, [first]))
      break
    }
    case 'check': {
      const main = reasons[0]
      if (animal.species === 'horse') {
        out.push(rec(id('look'), 10, 'forecast.rec.checkHorse', { name }, [main]))
      } else {
        out.push(rec(id('look'), 10, 'forecast.rec.checkDonkey', { name }, [main]))
      }
      // Look again when the forecast says the animal should be back to its normal.
      out.push(rec(id('again'), 11, 'forecast.rec.lookAgain', { name, time: formatTime(ceilHour(now + HOUR)) }, [main]))
      out.push(rec(id('no-work'), 12, 'forecast.rec.noWorkUntilEating', { name }, [main]))
      break
    }
    case 'water': {
      const debt = has('waterDebt')
      const noRest = has('noRest')
      const main = debt ?? noRest ?? reasons[0]
      const cont = forecasts.whatIf?.continue_work ?? forecasts.water
      const cross5 = crossing(cont, WATER_BANDS.concern)
      const water = nearestOfKind(ctx.lastFix, places, 'water')
      const nearWater = water && Number.isFinite(water.km) && water.km <= 1.5
      if (water && nearWater && cross5 !== undefined) {
        const before = Math.max(floorQuarter(cross5 - 40 * MINUTE), floorQuarter(now + 25 * MINUTE))
        out.push(
          rec(id('water'), 20, 'forecast.rec.waterAt', {
            name,
            place: t(water.place.nameKey, {}, 'en'),
            placeKey: water.place.nameKey,
            before: formatTime(before),
            cross: formatTime(cross5),
          }, [main]),
        )
      } else if (water && nearWater) {
        out.push(
          rec(id('water'), 20, 'forecast.rec.waterSoon', { name, place: t(water.place.nameKey, {}, 'en'), placeKey: water.place.nameKey }, [main]),
        )
      } else if (cross5 !== undefined) {
        out.push(rec(id('water'), 20, 'forecast.rec.waterNow', { name, cross: formatTime(cross5) }, [main]))
      } else {
        out.push(rec(id('water'), 20, 'forecast.rec.waterNowPlain', { name }, [main]))
      }
      if (noRest) out.push(rec(id('rest'), 21, 'forecast.rec.rest', { name, hours: noRest.params.hours }, [noRest]))
      const heat = has('heat')
      if (heat) {
        const params: Recommendation['params'] = { name }
        if (ctx.coolAt) params.time = formatTime(ctx.coolAt)
        out.push(rec(id('heat'), 22, ctx.coolAt ? 'forecast.rec.heatUntil' : 'forecast.rec.heat', params, [heat]))
      }
      break
    }
    case 'not_sure': {
      const main = reasons[0]
      const key =
        main.kind === 'shortBaseline' ? 'forecast.rec.learning' : main.kind === 'stale' ? 'forecast.rec.stale' : 'forecast.rec.lowConfidence'
      const params: Recommendation['params'] = { name }
      if (assessment.learning) {
        params.day = assessment.learning.day
        params.of = assessment.learning.of
      }
      out.push(rec(id('self'), 30, key, params, [main]))
      break
    }
    case 'normal': {
      const proj = forecasts.water
      const cross3 = crossing(proj, WATER_BANDS.offer)
      if (cross3 !== undefined && cross3 - now <= 4 * HOUR) {
        out.push(rec(id('water-plan'), 40, 'forecast.rec.waterPlan', { name, time: formatTime(floorQuarter(cross3)) }, reasons))
      } else {
        out.push(rec(id('nothing'), 41, 'forecast.rec.nothing', { name }, reasons))
      }
      break
    }
  }
  return out.sort((a, b) => a.priority - b.priority)
}
