// Window features for the activity classifier. Pure functions, no DOM.
// The same code builds the training table (scripts/build-features.ts) and runs in the app,
// so training and runtime features cannot drift apart.
//
// Input: a 2 s window at 25 Hz (50 samples), acceleration in g, any sensor orientation.
// Every feature uses only the magnitude, the window's own gravity estimate, or the
// component along that gravity estimate, so it does not depend on how the collar sits.
// Accelerometer only, so a phone or a cheap tag can compute it.

import type { ImuWindow } from '../shared/types.ts'

/** Standard gravity, m/s^2. Divide m/s^2 by this to get g. */
export const STANDARD_GRAVITY = 9.80665
export const SOURCE_HZ = 100
export const TARGET_HZ = 25
export const WINDOW_SECONDS = 2
export const WINDOW_SAMPLES = TARGET_HZ * WINDOW_SECONDS

/** Frequency bands of the magnitude spectrum, Hz, [low, high). The last band includes Nyquist. */
export const BANDS: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 3],
  [3, 6],
  [6, 12.5],
]

export const FEATURE_NAMES = [
  'mag_mean',
  'mag_std',
  'mag_min',
  'mag_max',
  'mag_range',
  'mag_p10',
  'mag_p50',
  'mag_p90',
  'mag_skew',
  'mag_kurt',
  'mag_mad',
  'mag_mcr',
  'odba',
  'vedba',
  'vert_std',
  'vert_range',
  'horiz_mean',
  'dom_freq',
  'dom_power',
  'band_0_1',
  'band_1_3',
  'band_3_6',
  'band_6_12',
] as const
export type FeatureName = (typeof FEATURE_NAMES)[number]
export const FEATURE_COUNT = FEATURE_NAMES.length

/** Downsample by averaging blocks of `factor` samples (100 Hz to 25 Hz with factor 4). */
export function resample(x: ArrayLike<number>, factor = SOURCE_HZ / TARGET_HZ): Float32Array {
  if (!Number.isInteger(factor) || factor < 1) throw new Error(`factor must be a positive integer, got ${factor}`)
  const n = Math.floor(x.length / factor)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let s = 0
    for (let j = 0; j < factor; j++) s += x[i * factor + j]
    out[i] = s / factor
  }
  return out
}

/** Euclidean norm per sample. */
export function magnitude(ax: ArrayLike<number>, ay: ArrayLike<number>, az: ArrayLike<number>): Float64Array {
  const n = ax.length
  const m = new Float64Array(n)
  for (let i = 0; i < n; i++) m[i] = Math.sqrt(ax[i] * ax[i] + ay[i] * ay[i] + az[i] * az[i])
  return m
}

function mean(x: ArrayLike<number>): number {
  let s = 0
  for (let i = 0; i < x.length; i++) s += x[i]
  return x.length > 0 ? s / x.length : 0
}

/** Linear-interpolated percentile of sorted data, as numpy's default. p in [0, 1]. */
export function percentileSorted(sorted: ArrayLike<number>, p: number): number {
  const n = sorted.length
  if (n === 0) return 0
  const pos = p * (n - 1)
  const lo = Math.floor(pos)
  const hi = Math.min(lo + 1, n - 1)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

const trigCache = new Map<number, { cos: Float64Array; sin: Float64Array }>()

function trig(n: number) {
  let t = trigCache.get(n)
  if (!t) {
    const cos = new Float64Array(n)
    const sin = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      cos[i] = Math.cos((2 * Math.PI * i) / n)
      sin[i] = Math.sin((2 * Math.PI * i) / n)
    }
    t = { cos, sin }
    trigCache.set(n, t)
  }
  return t
}

/**
 * One-sided power spectrum of x after removing its mean: |X_k|^2 / n for k = 0..floor(n/2).
 * A direct DFT; n is 50, so this is cheap and exact for any length.
 */
export function powerSpectrum(x: ArrayLike<number>): Float64Array {
  const n = x.length
  const mu = mean(x)
  const { cos, sin } = trig(n)
  const half = Math.floor(n / 2)
  const p = new Float64Array(half + 1)
  for (let k = 0; k <= half; k++) {
    let re = 0
    let im = 0
    for (let i = 0; i < n; i++) {
      const v = x[i] - mu
      const idx = (k * i) % n
      re += v * cos[idx]
      im -= v * sin[idx]
    }
    p[k] = (re * re + im * im) / n
  }
  return p
}

/** Features of one window, in FEATURE_NAMES order. Acceleration in g. */
export function extractFeatures(win: ImuWindow): Float32Array {
  const { ax, ay, az, hz } = win
  const n = ax.length
  if (ay.length !== n || az.length !== n) throw new Error('axes differ in length')
  if (n < 4) throw new Error(`window too short: ${n} samples`)
  const out = new Float32Array(FEATURE_COUNT)

  // Magnitude statistics.
  const m = magnitude(ax, ay, az)
  const mu = mean(m)
  let m2 = 0
  let m3 = 0
  let m4 = 0
  let mad = 0
  for (let i = 0; i < n; i++) {
    const d = m[i] - mu
    m2 += d * d
    m3 += d * d * d
    m4 += d * d * d * d
    mad += Math.abs(d)
  }
  m2 /= n
  m3 /= n
  m4 /= n
  const std = Math.sqrt(m2)
  // Below this spread the shape statistics are noise; report 0 (a still sensor).
  const flat = std < 1e-6
  const skew = flat ? 0 : m3 / (m2 * Math.sqrt(m2))
  const kurt = flat ? 0 : m4 / (m2 * m2) - 3
  const sorted = Float64Array.from(m).sort()
  let crossings = 0
  for (let i = 1; i < n; i++) {
    if ((m[i - 1] - mu) * (m[i] - mu) < 0) crossings++
  }

  // Gravity from the window mean; dynamic acceleration is the rest.
  const gx = mean(ax)
  const gy = mean(ay)
  const gz = mean(az)
  const gn = Math.sqrt(gx * gx + gy * gy + gz * gz)
  const ux = gn > 1e-9 ? gx / gn : 0
  const uy = gn > 1e-9 ? gy / gn : 0
  const uz = gn > 1e-9 ? gz / gn : 0
  let odba = 0
  let vedba = 0
  let horiz = 0
  const vert = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const dx = ax[i] - gx
    const dy = ay[i] - gy
    const dz = az[i] - gz
    odba += Math.abs(dx) + Math.abs(dy) + Math.abs(dz)
    const dyn2 = dx * dx + dy * dy + dz * dz
    vedba += Math.sqrt(dyn2)
    const v = dx * ux + dy * uy + dz * uz
    vert[i] = v
    horiz += Math.sqrt(Math.max(0, dyn2 - v * v))
  }
  const vmu = mean(vert)
  let vvar = 0
  let vmin = Infinity
  let vmax = -Infinity
  for (let i = 0; i < n; i++) {
    vvar += (vert[i] - vmu) ** 2
    if (vert[i] < vmin) vmin = vert[i]
    if (vert[i] > vmax) vmax = vert[i]
  }

  // Spectrum of the magnitude.
  const p = powerSpectrum(m)
  let domK = 1
  for (let k = 2; k < p.length; k++) if (p[k] > p[domK]) domK = k
  const bands = BANDS.map(([lo, hi], b) => {
    let s = 0
    for (let k = 1; k < p.length; k++) {
      const f = (k * hz) / n
      if (f >= lo && (f < hi || (b === BANDS.length - 1 && f <= hi))) s += p[k]
    }
    return s
  })

  const values = [
    mu,
    std,
    sorted[0],
    sorted[n - 1],
    sorted[n - 1] - sorted[0],
    percentileSorted(sorted, 0.1),
    percentileSorted(sorted, 0.5),
    percentileSorted(sorted, 0.9),
    skew,
    kurt,
    mad / n,
    (crossings * hz) / (n - 1),
    odba / n,
    vedba / n,
    Math.sqrt(vvar / n),
    vmax - vmin,
    horiz / n,
    (domK * hz) / n,
    p[domK],
    ...bands,
  ]
  for (let i = 0; i < FEATURE_COUNT; i++) out[i] = values[i]
  return out
}

/** Feature vector as a name to value record, for debugging and the Tag screen readout. */
export function namedFeatures(features: Float32Array): Record<FeatureName, number> {
  const r = {} as Record<FeatureName, number>
  FEATURE_NAMES.forEach((name, i) => {
    r[name] = features[i]
  })
  return r
}
