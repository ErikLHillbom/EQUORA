// The sensing chain for one tag: 2 s windows in, activity, posture and events out.
// The Tag screen runs it on phone motion or on the replay fixtures.

import { ACTIVITIES, type Activity, type Classification, type ImuWindow } from '../shared/types.ts'
import { extractFeatures } from './features.ts'
import type { ActivityModel } from './model.ts'
import {
  type FallConfig,
  FallDetector,
  type LyingConfig,
  LyingDetector,
  type Posture,
  type RollingConfig,
  RollingDetector,
  type SensingEvent,
} from './rules.ts'

export interface PipelineCounters {
  windowsProcessed: number
  /** Windows below the model's confidence threshold (NOT SURE). */
  notSure: number
  minutes: Record<Activity, number>
  lyingBouts: number
  /** Lie-down then stand-up transitions. */
  upDowns: number
  rollingBouts: number
  falls: number
}

export interface PipelineOutput {
  at: number
  features: Float32Array
  classification: Classification
  /** What this window counts as: the classifier label, or 'lie' and 'roll' from the rules, or 'unknown'. */
  activity: Activity
  posture: Posture
  /** True while the rolling rule sees repeated swings. Experimental. */
  rolling: boolean
  events: SensingEvent[]
  counters: PipelineCounters
}

export interface PipelineOptions {
  lying?: Partial<LyingConfig>
  rolling?: Partial<RollingConfig>
  fall?: Partial<FallConfig>
}

export interface Pipeline {
  push(win: ImuWindow): PipelineOutput
  counters(): PipelineCounters
  reset(): void
}

function emptyCounters(): PipelineCounters {
  return {
    windowsProcessed: 0,
    notSure: 0,
    minutes: Object.fromEntries(ACTIVITIES.map((a) => [a, 0])) as Record<Activity, number>,
    lyingBouts: 0,
    upDowns: 0,
    rollingBouts: 0,
    falls: 0,
  }
}

function copy(c: PipelineCounters): PipelineCounters {
  return { ...c, minutes: { ...c.minutes } }
}

/** Activity for one window. Rules first, because the classifier never saw lying or enough rolling. */
export function decideActivity(c: Classification, posture: Posture, rolling: boolean): Activity {
  if (rolling) return 'roll'
  if (posture === 'lying') return 'lie'
  if (!c.confident) return 'unknown'
  return c.label
}

export function createPipeline(model: ActivityModel, options: PipelineOptions = {}): Pipeline {
  let lying = new LyingDetector(options.lying)
  let roll = new RollingDetector(options.rolling)
  let fall = new FallDetector(options.fall)
  let counters = emptyCounters()
  // Recent windows, so a lying bout confirmed late can claim the minutes it started with.
  let history: { start: number; activity: Activity; minutes: number }[] = []
  const historyMs = ((options.lying?.sustainSeconds ?? 60) + 30) * 1000

  return {
    push(win) {
      const features = extractFeatures(win)
      const classification = model.classify(features)
      const r = roll.update(win)
      const l = lying.update(win, classification.confident ? classification.label : undefined)
      const f = fall.update(win)
      const events = [...l.events, ...r.events, ...f.events]
      const activity = decideActivity(classification, l.posture, r.rolling)
      const minutes = win.ax.length / win.hz / 60

      counters.windowsProcessed++
      if (!classification.confident) counters.notSure++
      counters.minutes[activity] += minutes
      for (const e of events) {
        if (e.kind === 'lieDown') {
          counters.lyingBouts++
          // Move the minutes since the bout started into 'lie'.
          for (const h of history) {
            if (h.start >= e.at && h.activity !== 'lie' && h.activity !== 'roll') {
              counters.minutes[h.activity] -= h.minutes
              counters.minutes.lie += h.minutes
              h.activity = 'lie'
            }
          }
        }
        if (e.kind === 'getUp') counters.upDowns++
        if (e.kind === 'roll') counters.rollingBouts++
        if (e.kind === 'fall') counters.falls++
      }
      history.push({ start: win.start, activity, minutes })
      history = history.filter((h) => win.start - h.start <= historyMs)

      return {
        at: win.start,
        features,
        classification,
        activity,
        posture: l.posture,
        rolling: r.rolling,
        events,
        counters: copy(counters),
      }
    },
    counters: () => copy(counters),
    reset() {
      lying = new LyingDetector(options.lying)
      roll = new RollingDetector(options.rolling)
      fall = new FallDetector(options.fall)
      counters = emptyCounters()
      history = []
    },
  }
}
