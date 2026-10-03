import { describe, expect, it } from 'vitest'
import { createRng, gaussian } from '../shared/lib/random.ts'
import type { ImuWindow } from '../shared/types.ts'
import {
  extractFeatures,
  FEATURE_COUNT,
  FEATURE_NAMES,
  namedFeatures,
  percentileSorted,
  powerSpectrum,
  resample,
  TARGET_HZ,
  WINDOW_SAMPLES,
} from './features.ts'

function win(ax: ArrayLike<number>, ay: ArrayLike<number>, az: ArrayLike<number>): ImuWindow {
  return { start: 0, hz: TARGET_HZ, ax: Float32Array.from(ax), ay: Float32Array.from(ay), az: Float32Array.from(az) }
}

function noisyWindow(seed: string): ImuWindow {
  const rng = createRng(seed)
  const ax: number[] = []
  const ay: number[] = []
  const az: number[] = []
  for (let i = 0; i < WINDOW_SAMPLES; i++) {
    const t = i / TARGET_HZ
    ax.push(0.2 + 0.3 * Math.sin(2 * Math.PI * 1.6 * t) + 0.05 * gaussian(rng))
    ay.push(-0.1 + 0.1 * Math.cos(2 * Math.PI * 3.2 * t) + 0.05 * gaussian(rng))
    az.push(0.95 + 0.25 * Math.sin(2 * Math.PI * 1.6 * t + 0.4) + 0.05 * gaussian(rng))
  }
  return win(ax, ay, az)
}

/** Rotation matrix from Euler angles (radians). */
function rotation(a: number, b: number, c: number): number[][] {
  const [ca, sa, cb, sb, cc, sc] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b), Math.cos(c), Math.sin(c)]
  const rz = [
    [ca, -sa, 0],
    [sa, ca, 0],
    [0, 0, 1],
  ]
  const ry = [
    [cb, 0, sb],
    [0, 1, 0],
    [-sb, 0, cb],
  ]
  const rx = [
    [1, 0, 0],
    [0, cc, -sc],
    [0, sc, cc],
  ]
  const mul = (p: number[][], q: number[][]) =>
    p.map((row) => [0, 1, 2].map((j) => row.reduce((s, v, k) => s + v * q[k][j], 0)))
  return mul(mul(rz, ry), rx)
}

function rotate(w: ImuWindow, r: number[][]): ImuWindow {
  const n = w.ax.length
  const ax = new Float32Array(n)
  const ay = new Float32Array(n)
  const az = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const v = [w.ax[i], w.ay[i], w.az[i]]
    ax[i] = r[0][0] * v[0] + r[0][1] * v[1] + r[0][2] * v[2]
    ay[i] = r[1][0] * v[0] + r[1][1] * v[1] + r[1][2] * v[2]
    az[i] = r[2][0] * v[0] + r[2][1] * v[1] + r[2][2] * v[2]
  }
  return { ...w, ax, ay, az }
}

describe('resample', () => {
  it('averages blocks of four', () => {
    expect(Array.from(resample([1, 2, 3, 4, 10, 10, 10, 10, 99]))).toEqual([2.5, 10])
  })

  it('turns 2 s at 100 Hz into 50 samples', () => {
    expect(resample(new Float32Array(200)).length).toBe(WINDOW_SAMPLES)
  })

  it('rejects a non-integer factor', () => {
    expect(() => resample([1, 2, 3], 1.5)).toThrow()
  })
})

describe('percentileSorted', () => {
  it('interpolates like numpy', () => {
    const s = [1, 2, 3, 4, 5]
    expect(percentileSorted(s, 0.5)).toBe(3)
    expect(percentileSorted(s, 0.1)).toBeCloseTo(1.4)
    expect(percentileSorted(s, 0.9)).toBeCloseTo(4.6)
  })
})

describe('powerSpectrum', () => {
  it('puts a pure tone in its bin', () => {
    const x = Array.from({ length: 50 }, (_, i) => Math.sin((2 * Math.PI * 5 * i) / 50))
    const p = powerSpectrum(x)
    expect(p.length).toBe(26)
    let best = 0
    for (let k = 1; k < p.length; k++) if (p[k] > p[best]) best = k
    expect(best).toBe(5)
    // |X_5|^2 / n = (n / 2)^2 / n = 12.5
    expect(p[5]).toBeCloseTo(12.5, 6)
  })
})

describe('extractFeatures', () => {
  it('has one value per name, and the names are unique', () => {
    expect(extractFeatures(noisyWindow('a')).length).toBe(FEATURE_COUNT)
    expect(new Set(FEATURE_NAMES).size).toBe(FEATURE_COUNT)
  })

  it('reads a still sensor as 1 g with no dynamic energy', () => {
    const f = namedFeatures(extractFeatures(win(new Array(50).fill(0), new Array(50).fill(0), new Array(50).fill(1))))
    expect(f.mag_mean).toBeCloseTo(1, 6)
    expect(f.mag_std).toBe(0)
    expect(f.mag_skew).toBe(0)
    expect(f.mag_kurt).toBe(0)
    expect(f.odba).toBe(0)
    expect(f.vedba).toBe(0)
    expect(f.vert_std).toBe(0)
    expect(f.band_1_3).toBe(0)
    expect(f.mag_mcr).toBe(0)
  })

  it('finds the step frequency of a 2 Hz bounce along gravity', () => {
    const n = 50
    const az = Array.from({ length: n }, (_, i) => 1 + 0.3 * Math.sin((2 * Math.PI * 2 * i) / TARGET_HZ))
    const f = namedFeatures(extractFeatures(win(new Array(n).fill(0), new Array(n).fill(0), az)))
    expect(f.dom_freq).toBe(2)
    expect(f.band_1_3).toBeGreaterThan(10 * (f.band_0_1 + f.band_3_6 + f.band_6_12))
    expect(f.vert_range).toBeCloseTo(0.6, 2)
    expect(f.horiz_mean).toBeCloseTo(0, 5)
    // Two crossings per cycle, 2 cycles per second.
    expect(f.mag_mcr).toBeCloseTo(4, 0)
  })

  it('gives the same features whatever the collar orientation, except ODBA', () => {
    const w = noisyWindow('rot')
    const base = extractFeatures(w)
    for (const angles of [
      [0.3, 1.1, -0.7],
      [Math.PI, 0.2, 2.5],
      [-1.4, -0.9, 0.1],
    ]) {
      const rotated = extractFeatures(rotate(w, rotation(angles[0], angles[1], angles[2])))
      FEATURE_NAMES.forEach((name, i) => {
        if (name === 'odba') return
        const scale = Math.max(1, Math.abs(base[i]))
        expect(Math.abs(rotated[i] - base[i]) / scale, name).toBeLessThan(1e-4)
      })
    }
  })

  it('rejects axes of different length', () => {
    expect(() => extractFeatures(win([1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3]))).toThrow()
  })
})
