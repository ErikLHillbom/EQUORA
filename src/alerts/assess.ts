// The rules that pick one of the five states for an animal (SPEC 5).
//
// Order:
// 1. URGENT, absolute rules that do not need a baseline: a possible fall in the last 2 hours
//    without a return to normal movement; repeated getting up and down or rolling; lying still
//    far longer than the animal's own longest normal bout; for donkeys and mules, activity and
//    eating both far below normal for 3 hours.
// 2. NOT SURE: baseline under 3 days, coverage under 60% in the last 24 hours, no data for over
//    2 hours, or too many minutes the classifier could not label.
// 3. CHECK: two behaviour signals beyond |z| 2 in the direction of concern (activity down, eating
//    down, lying up), or activity or eating alone beyond |z| 3, or a CUSUM alarm on activity.
//    Lying alone is never enough: one lying bout after work is common (Bukhari et al. 2022).
// 4. WATER: water debt of 3% of body weight or more, or over 4 hours of work without a water stop.
// 5. NORMAL.

import type { Animal, Assessment, Baseline, HourBudget, Pose, Reason } from '../shared/types'
import { HOUR, MINUTE, formatTime, localDayStart, localHour } from '../shared/lib/clock'
import {
  BASELINE_DAYS,
  MIN_BASELINE_DAYS,
  budgetsBetween,
  computeBaseline,
  coveredMinutes,
  freeMinutes,
  indexAt,
  learningProgress,
  signalValue,
  zScore,
  type LearningProgress,
} from '../baseline'
import {
  COMFORT,
  COMFORT_MIN_TEMP_C,
  HOT_WORK_WITHOUT_WATER_H,
  MAX_WORK_WITHOUT_WATER_H,
  WATER_BANDS,
  comfortIndex,
  deficitPct,
  waterStateAt,
  type WaterState,
} from '../forecast/water'
import { PROFILES, RULES } from './profiles'

export type BehaviourSignal = 'activity' | 'lying' | 'eating'
const BEHAVIOUR: BehaviourSignal[] = ['activity', 'lying', 'eating']

export interface AssessContext {
  animal: Animal
  budgets: HourBudget[]
  /** Local midnight of the day the baselines are for. */
  day: number
  baselines: Record<BehaviourSignal, Baseline>
  daysOfData: number
  /** Longest normal lying run in the 14 days before this day, minutes. */
  longestLieMin: number
  learning: LearningProgress
}

/** Baselines and other per-day facts. Valid for any time on the day of `now`. */
export function contextFor(animal: Animal, budgets: HourBudget[], now: number): AssessContext {
  const day = localDayStart(now)
  const baselines = {
    activity: computeBaseline(budgets, 'activity', now),
    lying: computeBaseline(budgets, 'lying', now),
    eating: computeBaseline(budgets, 'eating', now),
  }
  const window = budgetsBetween(budgets, day - BASELINE_DAYS * 24 * HOUR, day)
  return {
    animal,
    budgets,
    day,
    baselines,
    daysOfData: baselines.activity.daysOfData,
    longestLieMin: longestLyingRun(window),
    learning: learningProgress(animal, budgets, now),
  }
}

const mostlyLying = (b: HourBudget) => b.coverage > 0 && b.minutes.lie >= 0.8 * coveredMinutes(b)

/**
 * Longest lying run in a stretch of hours, minutes. Hours that are almost all lying join the
 * runs on either side. Inside other hours a bout is estimated as lying minutes per bout.
 */
export function longestLyingRun(hours: HourBudget[]): number {
  let best = 0
  let cur = 0
  for (const b of hours) {
    if (b.coverage < 0.5) {
      cur = 0
      continue
    }
    if (mostlyLying(b)) {
      cur += b.minutes.lie
      continue
    }
    const edge = b.minutes.lie / Math.max(1, b.lyingBouts + b.upDowns)
    best = Math.max(best, cur + edge, b.lyingBouts === 0 && b.upDowns === 0 ? 0 : edge)
    cur = b.lyingBouts > b.upDowns ? edge : 0
  }
  return Math.max(best, cur)
}

/** Minutes the animal has been lying without getting up, counted back from the latest hour. */
export function currentLyingRun(recent: HourBudget[]): number {
  let total = 0
  for (let i = recent.length - 1; i >= 0; i--) {
    const b = recent[i]
    if (b.coverage <= 0) break
    if (mostlyLying(b)) {
      total += b.minutes.lie
      continue
    }
    // A bout that started in this hour and has not ended yet.
    if (b.lyingBouts > b.upDowns) total += b.minutes.lie / Math.max(1, b.lyingBouts)
    break
  }
  return total
}

interface WindowStat {
  z: number
  obs: number
  med: number
  hours: number
}

function zAt(ctx: AssessContext, b: HourBudget, s: BehaviourSignal): number {
  return zScore(ctx.baselines[s].byHour[localHour(b.hourStart)], signalValue(b, s))
}

/** Free hours with data in the last `lookbackH` hours, newest last, at most `max`. */
function freeHours(recent: HourBudget[], now: number, lookbackH: number, max: number): HourBudget[] {
  const out = recent.filter((b) => b.hourStart >= now - lookbackH * HOUR && b.coverage >= 0.25 && freeMinutes(b) >= 15)
  return out.slice(-max)
}

function windowStat(ctx: AssessContext, hours: HourBudget[], s: BehaviourSignal): WindowStat {
  let w = 0
  let zs = 0
  let obs = 0
  let med = 0
  let n = 0
  for (const b of hours) {
    const z = zAt(ctx, b, s)
    if (!Number.isFinite(z)) continue
    const f = freeMinutes(b)
    w += f
    zs += Math.max(-10, Math.min(10, z)) * f
    obs += signalValue(b, s) * f
    med += ctx.baselines[s].byHour[localHour(b.hourStart)].median * f
    n++
  }
  if (w === 0) return { z: NaN, obs: NaN, med: NaN, hours: 0 }
  return { z: zs / w, obs: obs / w, med: med / w, hours: n }
}

/** One-sided lower CUSUM on activity z over free hours. Returns the final sum and run length. */
export function activityCusum(ctx: AssessContext, hours: HourBudget[]): { s: number; hours: number } {
  let s = 0
  let run = 0
  for (const b of hours) {
    const z = zAt(ctx, b, 'activity')
    if (!Number.isFinite(z)) continue
    s = Math.max(0, s - Math.max(-RULES.cusumClip, Math.min(RULES.cusumClip, z)) - RULES.cusumK)
    run = s > 0 ? run + 1 : 0
  }
  return { s, hours: run }
}

function poseOf(last: HourBudget | undefined, lyingNow: boolean): Pose {
  if (!last) return 'standing'
  if (last.falls > 0 || lyingNow) return 'lying'
  const m = last.minutes
  const options: [Pose, number][] = [
    ['lying', m.lie + m.roll],
    ['grazing', m.eat],
    ['trotting', m.trot],
    ['walking', m.walk],
    ['standing', m.stand + m.unknown],
  ]
  options.sort((a, b) => b[1] - a[1])
  return options[0][0]
}

const pct = (obs: number, med: number) => Math.round((obs / med - 1) * 100)
const round1 = (x: number) => Math.round(x * 10) / 10

function reason(kind: Reason['kind'], textKey: string, params: Reason['params'], direction?: 'up' | 'down'): Reason {
  return direction ? { kind, direction, textKey, params } : { kind, textKey, params }
}

/** Evaluate the rules at `now` with a prepared context and water state. */
export function evaluate(ctx: AssessContext, now: number, water: WaterState): Assessment {
  const { animal, budgets } = ctx
  const name = animal.name
  const profile = PROFILES[animal.species]
  const end = indexAt(budgets, now) // hours that started before now
  const recent = budgets.slice(Math.max(0, end - 26), end)
  const withData = recent.filter((b) => b.coverage > 0)
  const last = withData[withData.length - 1]
  const lastUpdate = last ? Math.min(now, last.hourStart + Math.round(last.coverage * 60) * MINUTE) : 0
  const learning = ctx.learning.learning ? { day: ctx.learning.day, of: ctx.learning.of } : undefined
  const lyingRun = currentLyingRun(recent)
  const lyingNow = lyingRun > 0 && !!last && last.minutes.lie > 0
  const base = { animalId: animal.id, at: now, learning, pose: poseOf(last, lyingNow), lastUpdate }

  // ---------- 1. URGENT ----------
  const urgent: Reason[] = []
  const lastTwo = recent.filter((b) => b.hourStart + HOUR > now - RULES.fallWindowH * HOUR)
  for (let i = lastTwo.length - 1; i >= 0; i--) {
    const b = lastTwo[i]
    if (b.falls <= 0) continue
    const fallAt = b.hourStart + Math.max(0, Math.round(coveredMinutes(b) - b.minutes.lie)) * MINUTE
    const after = lastTwo.slice(i + 1)
    const returned = after.some((h) => h.minutes.walk + h.minutes.trot >= 10 && h.minutes.lie < 0.5 * coveredMinutes(h))
    if (!returned) {
      urgent.push(
        reason('fall', 'alerts.reason.fall', {
          name,
          time: formatTime(fallAt),
          minutes: Math.max(0, Math.round((now - fallAt) / MINUTE)),
          at: fallAt,
        }),
      )
    }
    break
  }
  for (const b of lastTwo) {
    if (b.upDowns >= RULES.upDownsUrgent) {
      urgent.push(reason('upDowns', 'alerts.reason.upDowns', { name, count: b.upDowns, time: formatTime(b.hourStart) }))
    }
    if (b.rollingBouts >= RULES.rollingUrgent) {
      urgent.push(reason('rolling', 'alerts.reason.rolling', { name, count: b.rollingBouts, time: formatTime(b.hourStart) }))
    }
  }
  if (ctx.longestLieMin > 0) {
    const limit = Math.max(RULES.longLyingFactor * ctx.longestLieMin, ctx.longestLieMin + RULES.longLyingExtraMin)
    if (lyingRun > limit) {
      urgent.push(
        reason('longLying', 'alerts.reason.longLying', {
          name,
          minutes: Math.round(lyingRun),
          longest: Math.round(ctx.longestLieMin),
        }),
      )
    }
  }
  const enoughBaseline = ctx.daysOfData >= MIN_BASELINE_DAYS
  if (enoughBaseline && profile.dullActZ !== null && profile.dullEatZ !== null) {
    // Every one of the last 3 free hours must show both drops: "for 3 hours or more".
    const dullHours = freeHours(recent, now, RULES.dullHours + 2, RULES.dullHours)
    const actZ = profile.dullActZ
    const eatZ = profile.dullEatZ
    const allDull =
      dullHours.length >= RULES.dullHours &&
      dullHours.every((b) => zAt(ctx, b, 'activity') < actZ && zAt(ctx, b, 'eating') < eatZ)
    if (allDull) {
      const act = windowStat(ctx, dullHours, 'activity')
      const eat = windowStat(ctx, dullHours, 'eating')
      {
        urgent.push(
          reason('activity', 'alerts.reason.dullNotEating', {
            name,
            hours: dullHours.length,
            activityPct: -pct(act.obs, act.med),
            eatingPct: -pct(eat.obs, eat.med),
          }, 'down'),
        )
      }
    }
  }
  if (urgent.length) return { ...base, state: 'urgent', reasons: urgent }

  // ---------- 2. NOT SURE ----------
  const notSure: Reason[] = []
  if (!enoughBaseline) {
    notSure.push(
      reason('shortBaseline', 'alerts.reason.shortBaseline', {
        name,
        day: ctx.learning.day,
        of: ctx.learning.of,
        days: ctx.daysOfData,
      }),
    )
  }
  const staleH = (now - lastUpdate) / HOUR
  if (!last || staleH > RULES.staleAfterH) {
    notSure.push(reason('stale', 'alerts.reason.stale', { name, hours: last ? round1(staleH) : 24 }))
  }
  const dayHours = recent.filter((b) => b.hourStart + HOUR > now - 24 * HOUR)
  // Hours with no record at all count as missing too.
  const coverage24 = Math.min(1, dayHours.reduce((s, b) => s + coveredMinutes(b), 0) / (24 * 60))
  if (coverage24 < RULES.minCoverage24h && notSure.every((r) => r.kind !== 'stale')) {
    notSure.push(reason('lowConfidence', 'alerts.reason.lowCoverage', { name, pct: Math.round(coverage24 * 100) }))
  }
  const last3 = recent.filter((b) => b.hourStart + HOUR > now - 3 * HOUR)
  const cov3 = last3.reduce((s, b) => s + coveredMinutes(b), 0)
  const unk3 = last3.reduce((s, b) => s + b.minutes.unknown, 0)
  if (cov3 > 30 && unk3 / cov3 > RULES.maxUnknownShare) {
    notSure.push(reason('lowConfidence', 'alerts.reason.lowConfidence', { name, pct: Math.round((unk3 / cov3) * 100) }))
  }
  if (notSure.length) return { ...base, state: 'not_sure', reasons: notSure }

  // ---------- 3. CHECK ----------
  const check: Reason[] = []
  const win = freeHours(recent, now, RULES.windowLookbackH, RULES.windowMaxHours)
  const stats = {} as Record<BehaviourSignal, WindowStat>
  for (const s of BEHAVIOUR) stats[s] = windowStat(ctx, win, s)
  if (win.length >= RULES.windowMinHours) {
    const actDown = stats.activity.z <= -profile.departZ
    const eatDown = stats.eating.z <= -profile.departZ
    const lieUp = stats.lying.z >= profile.departZ
    const strong = stats.activity.z <= -profile.strongZ || stats.eating.z <= -profile.strongZ
    const count = [actDown, eatDown, lieUp].filter(Boolean).length
    if ((count >= 2 && (actDown || eatDown)) || strong) {
      if (actDown || stats.activity.z <= -profile.strongZ) {
        check.push(
          reason('activity', 'alerts.reason.activityDown', { name, pct: -pct(stats.activity.obs, stats.activity.med), hours: win.length }, 'down'),
        )
      }
      if (eatDown) {
        check.push(reason('eating', 'alerts.reason.eatingDown', { name, pct: -pct(stats.eating.obs, stats.eating.med), hours: win.length }, 'down'))
      }
      if (lieUp) check.push(lyingReason(ctx, recent, win, stats.lying, now))
    }
  }
  const cusumHours = freeHours(recent, now, RULES.cusumLookbackH, RULES.cusumLookbackH)
  const cusum = activityCusum(ctx, cusumHours)
  if (enoughBaseline && cusum.s >= RULES.cusumH && check.length === 0) {
    check.push(reason('activity', 'alerts.reason.cusum', { name, hours: cusum.hours }, 'down'))
  }
  if (animal.species !== 'donkey') {
    for (const b of lastTwo) {
      if (b.upDowns >= 2 && b.rollingBouts >= 1) {
        check.push(reason('rolling', 'alerts.reason.restless', { name, time: formatTime(b.hourStart) }))
        break
      }
    }
  }

  // ---------- 4. WATER ----------
  const waterReasons: Reason[] = []
  const deficit = deficitPct(water, animal)
  const workH = water.workSinceWaterMin / 60
  const lastB = last ?? budgets[end - 1]
  // The comfort index is a warm-weather rule. On cool, humid highland mornings (20 C, 85% RH)
  // it passes 150 while no horse is heat stressed, so it only counts from 25 C. ASSUMPTION.
  const ci = lastB && lastB.tempC >= COMFORT_MIN_TEMP_C ? comfortIndex(lastB.tempC, lastB.rh) : 0
  const workingNow = !!lastB && lastB.workMin >= 0.4 * coveredMinutes(lastB)
  if (deficit >= WATER_BANDS.offer) {
    const key = deficit >= WATER_BANDS.urgent ? 'alerts.reason.waterDebtHigh' : 'alerts.reason.waterDebt'
    waterReasons.push(reason('waterDebt', key, { name, pct: round1(deficit) }, 'up'))
  }
  if (workH >= MAX_WORK_WITHOUT_WATER_H) {
    const params: Reason['params'] = { name, hours: round1(workH) }
    if (water.lastDrink) params.since = formatTime(water.lastDrink)
    waterReasons.push(reason('noRest', water.lastDrink ? 'alerts.reason.noRestSince' : 'alerts.reason.noRest', params))
  }
  // Heat makes it worse: past the "reduce work" comfort index, 3 hours of work without water is enough.
  const hot = ci >= COMFORT.reduce && workingNow && workH >= HOT_WORK_WITHOUT_WATER_H
  const waterTrigger = waterReasons.length > 0 || hot
  if (waterTrigger && ci >= COMFORT.normal && lastB) {
    waterReasons.push(
      reason('heat', animal.species === 'horse' ? 'alerts.reason.heat' : 'alerts.reason.heatDonkey', {
        name,
        temp: Math.round(lastB.tempC),
        index: Math.round(ci),
      }),
    )
  }

  if (check.length) return { ...base, state: 'check', reasons: [...check, ...waterReasons] }
  if (waterTrigger) return { ...base, state: 'water', reasons: waterReasons }
  return { ...base, state: 'normal', reasons: [reason('activity', 'alerts.reason.normal', { name })] }
}

function lyingReason(ctx: AssessContext, recent: HourBudget[], win: HourBudget[], stat: WindowStat, now: number): Reason {
  const name = ctx.animal.name
  const workedBefore = recent.some((b) => b.hourStart >= now - (RULES.windowLookbackH + 3) * HOUR && b.workMin >= 30)
  if (stat.med >= 3) {
    return reason(
      'lying',
      workedBefore ? 'alerts.reason.lyingUpAfterWork' : 'alerts.reason.lyingUp',
      { name, ratio: round1(stat.obs / stat.med), hours: win.length },
      'up',
    )
  }
  const minutes = Math.round(win.reduce((s, b) => s + b.minutes.lie, 0))
  return reason('lying', 'alerts.reason.lyingMinutes', { name, minutes, hours: win.length }, 'up')
}

/** The state of one animal now. */
export function assess(animal: Animal, budgets: HourBudget[], now: number): Assessment {
  return evaluate(contextFor(animal, budgets, now), now, waterStateAt(animal, budgets, now))
}
