// Hand-written rules for what the classifier cannot learn. All of them are Experimental in the UI:
// Horsing Around has no lying label and only 37 rolling windows, so none of these rules is
// validated on labelled animal data. They are tested on synthetic signals only.
//
// Each detector takes 2 s windows (acceleration in g, any collar orientation) in time order.

import type { ClassifierLabel, ImuWindow } from '../shared/types.ts'

export type Posture = 'standing' | 'lying' | 'unknown'
export type SensingEventKind = 'lieDown' | 'getUp' | 'roll' | 'fall'

export interface SensingEvent {
  kind: SensingEventKind
  /** Epoch ms. For lieDown, the start of the lying bout. */
  at: number
  detail: Record<string, number>
}

type Vec = [number, number, number]

// ---------- Window helpers ----------

/** Mean acceleration of samples [from, to): the low-passed gravity vector. */
export function meanVector(win: ImuWindow, from = 0, to = win.ax.length): Vec {
  let x = 0
  let y = 0
  let z = 0
  for (let i = from; i < to; i++) {
    x += win.ax[i]
    y += win.ay[i]
    z += win.az[i]
  }
  const n = Math.max(1, to - from)
  return [x / n, y / n, z / n]
}

export function unit(v: Vec): Vec {
  const n = Math.hypot(v[0], v[1], v[2])
  return n > 1e-9 ? [v[0] / n, v[1] / n, v[2] / n] : [0, 0, 0]
}

/** Angle between two vectors, degrees. */
export function angleDeg(a: Vec, b: Vec): number {
  const ua = unit(a)
  const ub = unit(b)
  const dot = Math.max(-1, Math.min(1, ua[0] * ub[0] + ua[1] * ub[1] + ua[2] * ub[2]))
  return (Math.acos(dot) * 180) / Math.PI
}

/** Vectorial dynamic body acceleration: mean norm of acceleration minus the window mean, g. */
export function vedba(win: ImuWindow): number {
  const [gx, gy, gz] = meanVector(win)
  let s = 0
  for (let i = 0; i < win.ax.length; i++) s += Math.hypot(win.ax[i] - gx, win.ay[i] - gy, win.az[i] - gz)
  return s / Math.max(1, win.ax.length)
}

/** Largest acceleration magnitude in the window and its sample index. */
export function peakMagnitude(win: ImuWindow): { value: number; index: number } {
  let value = 0
  let index = 0
  for (let i = 0; i < win.ax.length; i++) {
    const m = Math.hypot(win.ax[i], win.ay[i], win.az[i])
    if (m > value) {
      value = m
      index = i
    }
  }
  return { value, index }
}

function windowMs(win: ImuWindow): number {
  return (win.ax.length / win.hz) * 1000
}

// ---------- Lying ----------

export interface LyingConfig {
  /** Weight of each new upright window in the reference gravity direction. */
  referenceRate: number
  /** Upright windows needed before the detector reports a posture. */
  referenceWindows: number
  /** Dynamic energy range that counts as upright and moving when there is no classifier label, g. */
  movingMin: number
  movingMax: number
  /** Deviation from the reference gravity direction that counts as lying, degrees. */
  angleDeg: number
  /** Deviation must fall below angleDeg minus this to count as up again, degrees. */
  hysteresisDeg: number
  /** Dynamic energy below this counts as still, g. */
  stillMax: number
  /** Time the deviation and stillness must last before a lying bout starts, s. */
  sustainSeconds: number
}

export const LYING_DEFAULTS: LyingConfig = {
  referenceRate: 0.05,
  referenceWindows: 15,
  movingMin: 0.05,
  movingMax: 0.8,
  angleDeg: 50,
  hysteresisDeg: 15,
  stillMax: 0.04,
  sustainSeconds: 60,
}

export interface LyingResult {
  posture: Posture
  /** Deviation of this window's gravity direction from the upright reference, degrees. */
  deviationDeg: number | null
  events: SensingEvent[]
}

/**
 * Learns the animal's upright gravity direction while it walks or trots, then reports lying when
 * the low-passed gravity direction stays far from it, with very little movement, for a sustained
 * time. A single lying bout is never an alarm by itself (SPEC 5); this only reports posture.
 */
export class LyingDetector {
  private readonly cfg: LyingConfig
  private reference: Vec | null = null
  private referenceCount = 0
  private posture: Posture = 'unknown'
  private candidateSince: number | null = null
  private upCount = 0

  constructor(cfg: Partial<LyingConfig> = {}) {
    this.cfg = { ...LYING_DEFAULTS, ...cfg }
  }

  get referenceReady(): boolean {
    return this.referenceCount >= this.cfg.referenceWindows
  }

  update(win: ImuWindow, label?: ClassifierLabel): LyingResult {
    const g = unit(meanVector(win))
    const energy = vedba(win)
    const events: SensingEvent[] = []
    const moving = label ? label === 'walk' || label === 'trot' : energy >= this.cfg.movingMin && energy <= this.cfg.movingMax

    const deviation = this.reference ? angleDeg(g, this.reference) : null
    // Learn the upright reference only while moving and not already far from it.
    if (moving && this.posture !== 'lying' && (deviation === null || deviation < this.cfg.angleDeg)) {
      if (!this.reference) this.reference = g
      else {
        const r = this.cfg.referenceRate
        this.reference = unit([
          this.reference[0] * (1 - r) + g[0] * r,
          this.reference[1] * (1 - r) + g[1] * r,
          this.reference[2] * (1 - r) + g[2] * r,
        ])
      }
      this.referenceCount++
    }
    if (!this.referenceReady || deviation === null) {
      return { posture: 'unknown', deviationDeg: deviation, events }
    }
    if (this.posture === 'unknown') this.posture = 'standing'

    if (this.posture === 'standing') {
      if (deviation >= this.cfg.angleDeg && energy <= this.cfg.stillMax) {
        this.candidateSince ??= win.start
        if (win.start + windowMs(win) - this.candidateSince >= this.cfg.sustainSeconds * 1000) {
          this.posture = 'lying'
          this.upCount = 0
          events.push({ kind: 'lieDown', at: this.candidateSince, detail: { deviationDeg: Math.round(deviation) } })
        }
      } else if (deviation < this.cfg.angleDeg) {
        this.candidateSince = null
      }
      // A deviated but moving window (shifting, rolling) keeps the candidate open without resetting it.
    } else if (this.posture === 'lying') {
      const upright = deviation < this.cfg.angleDeg - this.cfg.hysteresisDeg
      this.upCount = upright ? this.upCount + 1 : 0
      if (this.upCount >= 2) {
        this.posture = 'standing'
        this.candidateSince = null
        events.push({ kind: 'getUp', at: win.start, detail: { deviationDeg: Math.round(deviation) } })
      }
    }
    return { posture: this.posture, deviationDeg: deviation, events }
  }
}

// ---------- Rolling ----------

export interface RollingConfig {
  /** Orientation change that counts as a swing, degrees. */
  swingDeg: number
  /** Dynamic energy a swing window needs, g. */
  energyMin: number
  /** Swing windows needed inside the look-back period. */
  swings: number
  lookbackSeconds: number
  /** No new roll event for this long after one, s. */
  refractorySeconds: number
}

export const ROLLING_DEFAULTS: RollingConfig = {
  swingDeg: 45,
  energyMin: 0.25,
  swings: 3,
  lookbackSeconds: 20,
  refractorySeconds: 30,
}

export interface RollingResult {
  /** True while repeated swings are seen; backs up the rare roll class. */
  rolling: boolean
  swingDeg: number
  events: SensingEvent[]
}

/** Repeated large orientation swings with high energy: the animal rolling over. */
export class RollingDetector {
  private readonly cfg: RollingConfig
  private prev: Vec | null = null
  private swingTimes: number[] = []
  private lastEvent = -Infinity

  constructor(cfg: Partial<RollingConfig> = {}) {
    this.cfg = { ...ROLLING_DEFAULTS, ...cfg }
  }

  update(win: ImuWindow): RollingResult {
    const n = win.ax.length
    const half = Math.floor(n / 2)
    const first = meanVector(win, 0, half)
    const second = meanVector(win, half, n)
    const whole = meanVector(win)
    // The larger of the swing inside the window and the swing since the last window.
    const swing = Math.max(angleDeg(first, second), this.prev ? angleDeg(this.prev, whole) : 0)
    this.prev = whole
    const events: SensingEvent[] = []
    const t = win.start
    if (swing >= this.cfg.swingDeg && vedba(win) >= this.cfg.energyMin) this.swingTimes.push(t)
    this.swingTimes = this.swingTimes.filter((s) => t - s < this.cfg.lookbackSeconds * 1000)
    const rolling = this.swingTimes.length >= this.cfg.swings
    if (rolling && t - this.lastEvent >= this.cfg.refractorySeconds * 1000) {
      this.lastEvent = t
      events.push({ kind: 'roll', at: this.swingTimes[0], detail: { swings: this.swingTimes.length } })
    }
    return { rolling, swingDeg: swing, events }
  }
}

// ---------- Fall ----------

export interface FallConfig {
  /** Acceleration magnitude that counts as an impact, g. */
  impactG: number
  /** Orientation change after the impact, degrees. */
  turnDeg: number
  /** The turn must show within this long after the impact, s. */
  turnWithinSeconds: number
  /** Dynamic energy below this counts as still after the fall, g. */
  stillMax: number
  /** Still time needed after the turn, s. */
  stillSeconds: number
}

export const FALL_DEFAULTS: FallConfig = {
  impactG: 3,
  turnDeg: 60,
  turnWithinSeconds: 2,
  stillMax: 0.05,
  stillSeconds: 6,
}

type FallStage =
  | { stage: 'idle' }
  | { stage: 'impact'; at: number; before: Vec; peak: number }
  | { stage: 'turned'; at: number; peak: number; turn: number; stillMs: number }

/** Impact spike, then a fast orientation change, then low activity: a possible fall. */
export class FallDetector {
  private readonly cfg: FallConfig
  private prev: Vec | null = null
  private s: FallStage = { stage: 'idle' }

  constructor(cfg: Partial<FallConfig> = {}) {
    this.cfg = { ...FALL_DEFAULTS, ...cfg }
  }

  update(win: ImuWindow): { events: SensingEvent[] } {
    const events: SensingEvent[] = []
    const n = win.ax.length
    const whole = meanVector(win)
    const peak = peakMagnitude(win)
    const sampleMs = 1000 / win.hz

    if (this.s.stage === 'idle' && peak.value >= this.cfg.impactG) {
      const at = win.start + peak.index * sampleMs
      // Orientation before the impact: the previous window, or the samples before the spike.
      const before = this.prev ?? meanVector(win, 0, Math.max(1, peak.index))
      this.s = { stage: 'impact', at, before, peak: peak.value }
      // The turn can already show in the rest of this window.
      const restFrom = Math.min(n - 1, peak.index + Math.round(win.hz / 4))
      const rest = meanVector(win, restFrom, n)
      const turn = angleDeg(before, rest)
      if (n - restFrom >= win.hz / 2 && turn >= this.cfg.turnDeg) {
        this.s = { stage: 'turned', at, peak: peak.value, turn, stillMs: 0 }
      }
    } else if (this.s.stage === 'impact') {
      const turn = angleDeg(this.s.before, whole)
      if (turn >= this.cfg.turnDeg && win.start - this.s.at <= this.cfg.turnWithinSeconds * 1000) {
        this.s = { stage: 'turned', at: this.s.at, peak: this.s.peak, turn, stillMs: 0 }
      } else {
        this.s = { stage: 'idle' }
      }
    } else if (this.s.stage === 'turned') {
      if (vedba(win) <= this.cfg.stillMax) {
        this.s.stillMs += windowMs(win)
        if (this.s.stillMs >= this.cfg.stillSeconds * 1000) {
          events.push({
            kind: 'fall',
            at: this.s.at,
            detail: { peakG: Math.round(this.s.peak * 10) / 10, turnDeg: Math.round(this.s.turn) },
          })
          this.s = { stage: 'idle' }
        }
      } else {
        // Moving again soon after: it got up or it was not a fall.
        this.s = { stage: 'idle' }
      }
    }
    this.prev = whole
    return { events }
  }
}
