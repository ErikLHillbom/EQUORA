// Synthetic collar windows for tests and demos of the rules. Not animal data.

import { createRng, gaussian } from '../shared/lib/random.ts'
import type { ImuWindow } from '../shared/types.ts'
import { TARGET_HZ, WINDOW_SAMPLES } from './features.ts'

export interface SynthOptions {
  start: number
  /** Direction of gravity in the sensor frame (any length). */
  gravity?: [number, number, number]
  /** Rotate gravity from `gravity` to this direction across the window (a fast turn). */
  gravityTo?: [number, number, number]
  /** Bounce along gravity, g (walking is about 0.2, trotting about 0.6). */
  bounce?: number
  /** Bounce frequency, Hz. */
  freq?: number
  /** Random noise on each axis, g. */
  noise?: number
  /** Add an impact of this many g at this sample. */
  spike?: { index: number; g: number }
  seed?: string | number
  hz?: number
  samples?: number
}

function norm(v: [number, number, number]): [number, number, number] {
  const n = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / n, v[1] / n, v[2] / n]
}

export function synthWindow(o: SynthOptions): ImuWindow {
  const hz = o.hz ?? TARGET_HZ
  const n = o.samples ?? WINDOW_SAMPLES
  const rng = createRng(o.seed ?? o.start)
  const g0 = norm(o.gravity ?? [0, 0, 1])
  const g1 = norm(o.gravityTo ?? g0)
  const bounce = o.bounce ?? 0
  const freq = o.freq ?? 1.8
  const noise = o.noise ?? 0.005
  const ax = new Float32Array(n)
  const ay = new Float32Array(n)
  const az = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const a = n > 1 ? i / (n - 1) : 0
    const g = norm([g0[0] * (1 - a) + g1[0] * a, g0[1] * (1 - a) + g1[1] * a, g0[2] * (1 - a) + g1[2] * a])
    const s = 1 + bounce * Math.sin((2 * Math.PI * freq * i) / hz)
    ax[i] = g[0] * s + noise * gaussian(rng)
    ay[i] = g[1] * s + noise * gaussian(rng)
    az[i] = g[2] * s + noise * gaussian(rng)
    if (o.spike && o.spike.index === i) {
      ax[i] += g[0] * (o.spike.g - 1)
      ay[i] += g[1] * (o.spike.g - 1)
      az[i] += g[2] * (o.spike.g - 1)
    }
  }
  return { start: o.start, hz, ax, ay, az }
}

/** Consecutive 2 s windows from `start`, each built by `make(index, start)`. */
export function synthSequence(
  count: number,
  start: number,
  make: (i: number, start: number) => Omit<SynthOptions, 'start'>,
): ImuWindow[] {
  const ms = (WINDOW_SAMPLES / TARGET_HZ) * 1000
  return Array.from({ length: count }, (_, i) => synthWindow({ start: start + i * ms, ...make(i, start + i * ms) }))
}
