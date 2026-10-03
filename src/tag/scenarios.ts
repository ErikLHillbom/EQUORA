// Motion streams the Tag screen plays through the real pipeline.
//
// Standing, walking, trotting, eating and rolling windows are real collar recordings of one horse
// the shipped model never saw (Horsing Around, see public/replay/manifest.json). Horsing Around has
// no lying and no falls, so lying, lying down, getting up and the fall are synthetic windows built
// around that horse's own upright gravity direction. Every scenario except "normal" is labelled
// simulated on screen (SPEC 10).
import { replaySequence, synthWindow, type Replay } from '../sensing'
import { CLASSIFIER_LABELS, type ClassifierLabel, type ImuWindow } from '../shared/types'

export type ScenarioId = 'normal' | 'water' | 'dull' | 'colic' | 'fall'
export const SCENARIOS: readonly ScenarioId[] = ['normal', 'water', 'dull', 'colic', 'fall']

/** Which herd animal each scenario runs on, by name. The herd lives in src/simulation. */
export const SCENARIO_ANIMAL: Record<ScenarioId, string> = {
  normal: 'Mulu',
  water: 'Chaltu',
  dull: 'Bari',
  colic: 'Saba',
  fall: 'Kito',
}

/** True when part of the stream is synthetic, not recorded. */
export const SCENARIO_SIMULATED: Record<ScenarioId, boolean> = {
  normal: false,
  water: false,
  dull: true,
  colic: true,
  fall: true,
}

export interface StreamWindow {
  window: ImuWindow
  /** Where the window came from, shown in the pipeline readout. */
  source: 'recorded' | 'synthetic'
  /** For recorded windows, the dataset's own label. */
  truth?: ClassifierLabel
}

type Segment =
  | { real: ClassifierLabel; count: number }
  | { lieDown: true }
  | { lie: number }
  | { getUp: true }
  | { fall: true }

type Vec = [number, number, number]

const WINDOW_MS = 2000

function unit(v: Vec): Vec {
  const n = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / n, v[1] / n, v[2] / n]
}

/** The horse's upright gravity direction: mean of its recorded walking windows. */
export function uprightGravity(replay: Replay): Vec {
  const clip = replay.clips.find((c) => c.label === 'walk') ?? replay.clips[0]
  let x = 0
  let y = 0
  let z = 0
  let n = 0
  for (const w of clip.windows) {
    for (let i = 0; i < w.ax.length; i++) {
      x += w.ax[i]
      y += w.ay[i]
      z += w.az[i]
      n++
    }
  }
  return unit([x / n, y / n, z / n])
}

/** Rotate `v` by `deg` towards a fixed perpendicular direction. */
export function tilt(v: Vec, deg: number): Vec {
  const helper: Vec = Math.abs(v[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
  const p = unit([
    v[1] * helper[2] - v[2] * helper[1],
    v[2] * helper[0] - v[0] * helper[2],
    v[0] * helper[1] - v[1] * helper[0],
  ])
  const a = (deg * Math.PI) / 180
  return unit([v[0] * Math.cos(a) + p[0] * Math.sin(a), v[1] * Math.cos(a) + p[1] * Math.sin(a), v[2] * Math.cos(a) + p[2] * Math.sin(a)])
}

const LYING_TILT_DEG = 70

const SEGMENTS: Record<ScenarioId, Segment[]> = {
  // A calm working morning: walk to the field, graze, stand, walk back, graze.
  normal: [
    { real: 'walk', count: 30 },
    { real: 'eat', count: 60 },
    { real: 'stand', count: 20 },
    { real: 'walk', count: 30 },
    { real: 'eat', count: 30 },
  ],
  // Carrying coffee cherries uphill: long walking and some trotting, no rest stop.
  water: [
    { real: 'walk', count: 60 },
    { real: 'trot', count: 20 },
    { real: 'walk', count: 60 },
    { real: 'trot', count: 20 },
    { real: 'walk', count: 40 },
  ],
  // Streams that lie down start with walking, so the tag has learned the upright direction.
  // A dull donkey: little movement, long lying, almost no eating.
  dull: [
    { real: 'walk', count: 20 },
    { real: 'stand', count: 40 },
    { lieDown: true },
    { lie: 60 },
    { getUp: true },
    { real: 'stand', count: 40 },
    { real: 'eat', count: 6 },
    { real: 'stand', count: 30 },
  ],
  // Colic signs in a horse: down, roll, up, again and again within a quarter of an hour.
  colic: [
    { real: 'walk', count: 20 },
    { real: 'eat', count: 20 },
    { real: 'stand', count: 10 },
    ...[0, 1, 2].flatMap((): Segment[] => [
      { lieDown: true },
      { lie: 32 },
      { real: 'roll', count: 13 },
      { lie: 8 },
      { getUp: true },
      { real: 'stand', count: 12 },
    ]),
  ],
  // A fall while walking on the slope, then no movement.
  fall: [{ real: 'walk', count: 40 }, { fall: true }, { lie: 45 }],
}

/** Build the window stream for a scenario. Start times are consecutive from `start`. */
export function buildScenario(replay: Replay, id: ScenarioId, start: number): StreamWindow[] {
  const up = uprightGravity(replay)
  const down = tilt(up, LYING_TILT_DEG)
  const cursor = new Map<ClassifierLabel, number>(CLASSIFIER_LABELS.map((l) => [l, 0]))
  const out: StreamWindow[] = []
  let t = start
  const push = (w: Omit<StreamWindow, 'window'> & { window: ImuWindow }) => {
    out.push({ ...w, window: { ...w.window, start: t } })
    t += WINDOW_MS
  }
  const synth = (opts: Parameters<typeof synthWindow>[0]) => synthWindow({ ...opts, start: t, seed: `${id}:${out.length}` })

  for (const seg of SEGMENTS[id]) {
    if ('real' in seg) {
      const clip = replaySequence(replay, [seg.real])
      if (clip.length === 0) continue
      for (let i = 0; i < seg.count; i++) {
        // Loop through the clip, continuing where the last segment of this label stopped.
        const k = cursor.get(seg.real)!
        cursor.set(seg.real, k + 1)
        push({ window: clip[k % clip.length].window, source: 'recorded', truth: seg.real })
      }
    } else if ('lieDown' in seg) {
      push({ window: synth({ start: t, gravity: up, gravityTo: down, bounce: 0.15, freq: 1, noise: 0.03 }), source: 'synthetic' })
    } else if ('getUp' in seg) {
      push({ window: synth({ start: t, gravity: down, gravityTo: up, bounce: 0.2, freq: 1.2, noise: 0.03 }), source: 'synthetic' })
    } else if ('lie' in seg) {
      for (let i = 0; i < seg.lie; i++) {
        push({ window: synth({ start: t, gravity: down, noise: 0.004 }), source: 'synthetic' })
      }
    } else if ('fall' in seg) {
      push({
        window: synth({ start: t, gravity: up, gravityTo: tilt(up, 85), spike: { index: 20, g: 4.2 }, noise: 0.05 }),
        source: 'synthetic',
      })
    }
  }
  return out
}

/** Minutes of animal time a stream covers. */
export function streamMinutes(stream: readonly StreamWindow[]): number {
  return (stream.length * WINDOW_MS) / 60000
}
