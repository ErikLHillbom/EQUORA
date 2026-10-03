// Small geometry helpers for hand-drawn SVG: smooth curves through points, thick limbs, seeds.
import { createRng, hashString } from '../lib/random'

export type Pt = readonly [number, number]

const r1 = (n: number) => Math.round(n * 10) / 10

/** Catmull-Rom spline through the points, as cubic Bezier path data. */
export function catmullRom(points: readonly Pt[], closed = false, tension = 1): string {
  const n = points.length
  if (n < 2) return ''
  const get = (i: number): Pt => {
    if (closed) return points[((i % n) + n) % n]
    return points[Math.max(0, Math.min(n - 1, i))]
  }
  let d = `M${r1(points[0][0])} ${r1(points[0][1])}`
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1)
    const p1 = get(i)
    const p2 = get(i + 1)
    const p3 = get(i + 2)
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension
    d += `C${r1(c1x)} ${r1(c1y)} ${r1(c2x)} ${r1(c2y)} ${r1(p2[0])} ${r1(p2[1])}`
  }
  return closed ? `${d}Z` : d
}

/** A thick tapered polyline (a leg, a tail) as a closed filled path with a round end. */
export function limb(points: readonly Pt[], widths: readonly number[]): string {
  const n = points.length
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i < n; i++) {
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(n - 1, i + 1)]
    let dx = next[0] - prev[0]
    let dy = next[1] - prev[1]
    const len = Math.hypot(dx, dy) || 1
    dx /= len
    dy /= len
    const w = (widths[i] ?? widths[widths.length - 1]) / 2
    left.push([points[i][0] - dy * w, points[i][1] + dx * w])
    right.push([points[i][0] + dy * w, points[i][1] - dx * w])
  }
  const endW = (widths[n - 1] ?? 2) / 2
  let d = `M${r1(left[0][0])} ${r1(left[0][1])}`
  for (let i = 1; i < n; i++) d += `L${r1(left[i][0])} ${r1(left[i][1])}`
  d += `A${r1(endW)} ${r1(endW)} 0 0 0 ${r1(right[n - 1][0])} ${r1(right[n - 1][1])}`
  for (let i = n - 2; i >= 0; i--) d += `L${r1(right[i][0])} ${r1(right[i][1])}`
  return `${d}Z`
}

/** A wobbly closed loop around a box that runs past its start, like a pencil circle. */
export function pencilLoop(seed: string, w = 100, h = 100, points = 26, sweepDeg = 380): string {
  const rng = createRng(`pencil:${seed}`)
  const cx = w / 2
  const cy = h / 2
  const start = (-100 + rng() * 40) * (Math.PI / 180)
  const sweep = sweepDeg * (Math.PI / 180)
  const pts: Pt[] = []
  for (let i = 0; i < points; i++) {
    const f = i / (points - 1)
    const a = start + f * sweep
    // The second lap drifts outward a little so the overshoot reads as a second pass.
    const drift = 1 + f * 0.035
    const jr = 1 + (rng() - 0.5) * 0.045
    pts.push([cx + Math.cos(a) * (w / 2) * jr * drift, cy + Math.sin(a) * (h / 2) * jr * drift])
  }
  return catmullRom(pts, false)
}

/** One wobbly cubic, like a pen stroke under a word. */
export function pencilStroke(seed: string, w = 100, y = 4): string {
  const rng = createRng(`under:${seed}`)
  const j = () => (rng() - 0.5) * 3
  return `M${r1(1 + rng())} ${r1(y + j())}C${r1(w * 0.3)} ${r1(y + j())} ${r1(w * 0.66)} ${r1(y + j())} ${r1(w - 1 - rng())} ${r1(y - 1 + j())}`
}

/** A safe id fragment for SVG url(#...) references. */
export function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '')
}

/** feTurbulence seed from an id, so a stamp never re-inks between renders. */
export function noiseSeed(id: string): number {
  return (hashString(id) % 997) + 1
}
