// Posture line drawings for PostureDrawing (DESIGN 7, source 2). Our own simplified lines, with
// proportions and leg positions read from Muybridge's plates (public domain, see docs/decisions.md).
// viewBox 0 0 120 80, ground line at y 72, profile facing right. Horse and donkey, five poses each.
// Mule uses the donkey set. Lying is calm sternal lying: legs folded under, head up.
//
// Each animal is a few pen strokes. A stroke is a smooth centre line through hand-placed points,
// with seeded jitter and a slow wobble, drawn as a filled ribbon whose width swells in the middle
// like a soft pencil pressed harder. The same seed gives the same line on every render.
import type { Pose } from '../types'
import { createRng } from '../lib/random'
import type { Pt } from './geometry'

// ---------- Small vector helpers ----------

const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]]
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k]
const len = (a: Pt) => Math.hypot(a[0], a[1])
const unit = (a: Pt): Pt => mul(a, 1 / (len(a) || 1))
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const rad = (d: number) => (d * Math.PI) / 180
/** Direction of a limb segment: degrees from straight down, positive leans the lower end forward (right). */
const limbDir = (deg: number): Pt => [Math.sin(rad(deg)), Math.cos(rad(deg))]
/** Direction from an angle above the horizontal, facing right. */
const upDir = (deg: number): Pt => [Math.cos(rad(deg)), -Math.sin(rad(deg))]
/** Left-hand normal in screen space: for a segment pointing down it points forward (right). */
const fwdNormal = (d: Pt): Pt => [d[1], -d[0]]

/** A point in a local frame: s along the axis, t across it (positive t to the axis's right in screen space). */
const local = (origin: Pt, axis: Pt, s: number, t: number): Pt => {
  const across: Pt = [-axis[1], axis[0]]
  return [origin[0] + axis[0] * s + across[0] * t, origin[1] + axis[1] * s + across[1] * t]
}

// ---------- Figure model ----------

interface Stroke {
  pts: Pt[]
  /** Base nib width in viewBox units. */
  w?: number
  /** Width multiplier per point (interpolated). */
  ws?: number[]
  /** Hatching and small details: left out of the stale outline. */
  fine?: boolean
}

interface Figure {
  strokes: Stroke[]
  /** Closed dark shapes: mane, tail tip, hooves. */
  masses: Pt[][]
  /** Short straight pencil strokes. */
  hatch: [Pt, Pt][]
}

const GROUND = 72
/** The animal is drawn a little larger than its coordinates, scaled about the ground, so it fills the card. */
const SCALE = 1.1

// ---------- Legs ----------

interface LegPose {
  /** Segment angles from vertical: upper (forearm or gaskin), cannon, pastern. */
  a: [number, number, number]
  /** Hoof on the ground: the cannon stretches or shrinks so the sole lands on the ground line. */
  planted: boolean
}

interface LegBuild {
  top: Pt
  pose: LegPose
  /** Segment lengths: upper, cannon, pastern. */
  lens: [number, number, number]
  /** Leg widths: top, knee or hock, cannon, fetlock. */
  wTop: number
  wJoint: number
  wCannon: number
  wFetlock: number
  hind: boolean
  hoofH: number
  hoofW: number
  /** Toe run per unit of hoof height (lower is a more upright hoof). */
  toe: number
}

interface LegOut {
  stroke: Stroke
  hoof: Pt[]
  chain: Pt[]
  normals: Pt[]
}

function leg(b: LegBuild): LegOut {
  const [a0, a1, a2] = b.pose.a
  const d0 = limbDir(a0)
  const d1 = limbDir(a1)
  const d2 = limbDir(a2)
  let [l0, l1, l2] = b.lens
  if (b.pose.planted) {
    // Solve the cannon length so the sole sits on the ground line.
    const need = GROUND - b.hoofH - b.top[1] - l0 * d0[1] - l2 * d2[1]
    l1 = Math.max(l1 * 0.6, need / Math.max(d1[1], 0.2))
  }
  const p0 = b.top
  const p1 = add(p0, mul(d0, l0))
  const p2 = add(p1, mul(d1, l1))
  const p3 = add(p2, mul(d2, l2))
  const n0 = fwdNormal(d0)
  const n1 = fwdNormal(unit(add(d0, d1)))
  const n2 = fwdNormal(unit(add(d1, d2)))
  const n3 = fwdNormal(d2)
  const nc = fwdNormal(d1)
  // Centre points with half widths, top to bottom. Knee bumps forward on a foreleg, hock juts back on a hind leg.
  const mid0 = lerp(p0, p1, 0.5)
  const above = lerp(p0, p1, 0.85)
  const below = lerp(p1, p2, 0.22)
  const midC = lerp(p1, p2, 0.65)
  const rows: { c: Pt; n: Pt; f: number; k: number }[] = [
    { c: p0, n: n0, f: b.wTop / 2, k: b.wTop / 2 },
    { c: mid0, n: n0, f: (b.wTop * 0.78) / 2, k: (b.wTop * 0.72) / 2 },
    { c: above, n: n0, f: (b.wJoint * 1.05) / 2, k: (b.wJoint * (b.hind ? 1.0 : 0.95)) / 2 },
    { c: p1, n: n1, f: (b.wJoint * (b.hind ? 0.85 : 1.15)) / 2, k: (b.wJoint * (b.hind ? 1.35 : 0.95)) / 2 },
    { c: below, n: nc, f: b.wCannon / 2, k: b.wCannon / 2 },
    { c: midC, n: nc, f: b.wCannon / 2, k: b.wCannon / 2 },
    { c: p2, n: n2, f: (b.wFetlock * 0.45), k: (b.wFetlock * 0.62) },
    { c: p3, n: n3, f: b.wCannon * 0.5, k: b.wCannon * 0.5 },
  ]
  const inset = 0.55
  const front = rows.map((r) => add(r.c, mul(r.n, Math.max(0.35, r.f - inset))))
  const back = rows.map((r) => sub(r.c, mul(r.n, Math.max(0.35, r.k - inset)))).reverse()
  const ws = [...rows.map((_, i) => (i < 3 ? 1 : 0.82)), ...rows.map((_, i) => (i < 3 ? 1 : 0.82)).reverse()]
  // The hoof: a small dark wedge, the toe forward along the pastern's front.
  const u = b.pose.planted ? ([0, 1] as Pt) : unit(add(mul(d2, 0.7), mul(d1, 0.3)))
  const f = fwdNormal(u)
  const hw = b.hoofW / 2
  const A = add(p3, mul(f, hw))
  const B = sub(p3, mul(f, hw * 0.95))
  let C = add(B, mul(u, b.hoofH * 0.95))
  let D = add(add(A, mul(u, b.hoofH)), mul(f, b.hoofH * b.toe))
  if (b.pose.planted) {
    C = [C[0], GROUND]
    D = [D[0], GROUND]
  }
  return { stroke: { pts: [...front, ...back], ws }, hoof: [A, D, C, B], chain: [p0, p1, p2, p3], normals: [n0, n1, n2, n3] }
}

/** A few slanted pencil strokes across the upper part of a far leg. */
function legHatch(l: LegOut, count: number, w: number): [Pt, Pt][] {
  const out: [Pt, Pt][] = []
  const [p0, p1] = l.chain
  const n = l.normals[0]
  for (let i = 0; i < count; i++) {
    const t = 0.18 + (i / Math.max(1, count - 1)) * 0.62
    const c = lerp(p0, p1, t)
    const half = (w * (1 - t * 0.35)) / 2 - 0.9
    const a = add(add(c, mul(n, -half)), [0, 0.9])
    const b2 = add(add(c, mul(n, half)), [0, -0.9])
    out.push([a, b2])
  }
  return out
}

// ---------- Poses ----------

type LegSet = { nearFore: LegPose; farFore: LegPose; nearHind: LegPose; farHind: LegPose }

const P = (a0: number, a1: number, a2: number, planted = true): LegPose => ({ a: [a0, a1, a2], planted })

/** Leg angles per pose, read from Muybridge's walk and trot plates and simplified. */
const LEGS: Record<Exclude<Pose, 'lying'>, LegSet> = {
  standing: { nearFore: P(1, 0, 30), farFore: P(-3, -1, 28), nearHind: P(-28, -3, 28), farHind: P(-22, 2, 28) },
  // Near fore swinging forward, knee bent about 35 degrees. Far hind pushing off behind. Three hooves down.
  walking: { nearFore: P(24, -11, -32, false), farFore: P(-7, -5, 24), nearHind: P(-14, 7, 30), farHind: P(-42, -20, 18) },
  // Diagonal pair (near fore, far hind) lifted, the other diagonal under the body.
  trotting: { nearFore: P(34, -38, -55, false), farFore: P(-9, -7, 22), nearHind: P(-20, 10, 30), farHind: P(-4, -26, -44, false) },
  // One fore a little ahead of the other, the usual stance at grass.
  grazing: { nearFore: P(7, 4, 30), farFore: P(-6, -3, 28), nearHind: P(-26, -2, 28), farHind: P(-30, -6, 26) },
}

interface PoseFrame {
  /** Body shift. */
  dy: number
  /** Neck angle above horizontal (negative points down). */
  neck: number
  /** Head axis angle below horizontal, poll to muzzle. */
  head: number
}

// ---------- Species ----------

interface Species {
  seed: string
  /** Topline from withers back to the tail root. */
  back: Pt[]
  /** Buttock and back of the thigh, from under the tail root down to the gaskin. */
  buttock: Pt[]
  /** Belly from behind the elbow to the stifle. */
  belly: Pt[]
  /** Point of shoulder and chest, down to the top of the near foreleg. */
  chest: Pt[]
  withers: Pt
  neckBase: Pt
  neckLen: number
  crestBulge: number
  underBulge: number
  headLen: number
  /** Head outline in head space: s along poll to muzzle (0..1 of headLen), t across toward the jaw. */
  head: [number, number][]
  /** Ears in head space, one stroke. */
  ears: [number, number][]
  earWidth: number
  tailRoot: Pt
  frames: Record<Pose, PoseFrame>
  legs: {
    foreTop: Pt
    farForeTop: Pt
    hindTop: Pt
    farHindTop: Pt
    fore: Omit<LegBuild, 'top' | 'pose' | 'hind'>
    hindLeg: Omit<LegBuild, 'top' | 'pose' | 'hind'>
  }
  /** Folded legs for calm sternal lying, in final (lowered) coordinates. */
  lying: { fore: Pt[]; hind: Pt[]; hindHoof: Pt[] }
  mane(crest: Pt[], up: (p: Pt) => Pt): { strokes: Stroke[]; masses: Pt[][] }
  tail(root: Pt, pose: Pose): { strokes: Stroke[]; masses: Pt[][] }
  extras(f: Frames, pose: Pose): Stroke[]
}

interface Frames {
  b: (p: Pt) => Pt
  poll: Pt
  throat: Pt
  headAxis: Pt
  crest: Pt[]
}

function bodyFrames(sp: Species, pose: Pose): Frames {
  const fr = sp.frames[pose]
  const b = (p: Pt): Pt => [p[0], p[1] + fr.dy]
  const base = b(sp.neckBase)
  const nd = upDir(fr.neck)
  const poll = add(base, mul(nd, sp.neckLen))
  const headAxis: Pt = [Math.cos(rad(fr.head)), Math.sin(rad(fr.head))]
  const hs = (s: number, t: number) => local(poll, headAxis, s * sp.headLen, t)
  const throat = hs(sp.head[sp.head.length - 1][0], sp.head[sp.head.length - 1][1])
  // Crest: withers to poll, bowed outward.
  const w = b(sp.withers)
  const upN: Pt = [nd[1], -nd[0]]
  const crest: Pt[] = [w, add(lerp(w, poll, 0.35), mul(upN, sp.crestBulge * 0.8)), add(lerp(w, poll, 0.7), mul(upN, sp.crestBulge)), poll]
  return { b, poll, throat, headAxis, crest }
}

function figure(sp: Species, pose: Pose): Figure {
  const fr = bodyFrames(sp, pose)
  const { b } = fr
  const strokes: Stroke[] = []
  const masses: Pt[][] = []
  const hatch: [Pt, Pt][] = []
  const hs = (s: number, t: number) => local(fr.poll, fr.headAxis, s * sp.headLen, t)

  // 1. Crest and topline in one pass: poll, crest, withers, back, croup, tail root.
  strokes.push({ pts: [...fr.crest].reverse().concat(sp.back.slice(1).map(b)), ws: [0.9, 1, 1, 1, 1, 1, 1, 0.9] })
  // 2. Head: forehead, nose, muzzle, chin, jaw, throat.
  strokes.push({ pts: sp.head.map(([s, t]) => hs(s, t)) })
  // 3. Ears.
  strokes.push({ pts: sp.ears.map(([s, t]) => hs(s, t)), w: sp.earWidth })
  // 4. Throat, underside of the neck, point of shoulder, chest.
  const chest = sp.chest.map(b)
  const neckMid = lerp(fr.throat, chest[0], 0.5)
  const nd = unit(sub(chest[0], fr.throat))
  const under = add(neckMid, mul([nd[1], -nd[0]], sp.underBulge))
  strokes.push({ pts: [fr.throat, under, ...chest] })
  // 5. Belly. 6. Buttock and back of thigh.
  strokes.push({ pts: (pose === 'lying' ? sp.belly.slice(0, 3) : sp.belly).map(b) })
  strokes.push({ pts: sp.buttock.map(b) })
  // Mane and tail.
  const mane = sp.mane(fr.crest, (p) => p)
  strokes.push(...mane.strokes)
  masses.push(...mane.masses)
  const tail = sp.tail(b(sp.tailRoot), pose)
  strokes.push(...tail.strokes)
  masses.push(...tail.masses)
  strokes.push(...sp.extras(fr, pose))

  // Legs.
  const L = sp.legs
  if (pose === 'lying') {
    // Folded under: the near fore's knee in front of the chest, the near hind's stifle on the flank,
    // the hind hoof just showing. Drawn in place, not from leg angles.
    strokes.push({ pts: sp.lying.fore }, { pts: sp.lying.hind })
    masses.push(sp.lying.hindHoof)
  } else {
    const set = LEGS[pose]
    const ff = leg({ ...L.fore, top: b(L.farForeTop), pose: set.farFore, hind: false })
    const fh = leg({ ...L.hindLeg, top: b(L.farHindTop), pose: set.farHind, hind: true })
    const nf = leg({ ...L.fore, top: b(L.foreTop), pose: set.nearFore, hind: false })
    const nh = leg({ ...L.hindLeg, top: b(L.hindTop), pose: set.nearHind, hind: true })
    strokes.unshift(ff.stroke, fh.stroke)
    strokes.push(nf.stroke, nh.stroke)
    masses.push(ff.hoof, fh.hoof, nf.hoof, nh.hoof)
    hatch.push(...legHatch(ff, 3, L.fore.wTop), ...legHatch(fh, 3, L.hindLeg.wTop))
  }

  // Belly shadow: a few short parallel strokes inside the belly line, behind the elbow.
  const belly = sp.belly.map(b)
  for (let i = 0; i < 4; i++) {
    const c = lerp(belly[0], belly[1], 0.25 + i * 0.24)
    hatch.push([add(c, [-0.4, -1]), add(c, [1, -3.3])])
  }

  // Lying: nothing reaches below the ground line.
  const clamp = (p: Pt): Pt => (pose === 'lying' ? [p[0], Math.min(p[1], GROUND - 0.6)] : p)
  // Scale the whole animal up a little about the ground, so it fills the card.
  const sc = (p: Pt): Pt => {
    const q = clamp(p)
    return [60 + (q[0] - 62) * SCALE, GROUND + (q[1] - GROUND) * SCALE]
  }
  const out: Figure = {
    strokes: strokes.map((s) => ({ ...s, pts: s.pts.map(sc) })),
    masses: masses.map((m) => m.map(sc)),
    hatch: hatch.map(([a, c]) => [sc(a), sc(c)] as [Pt, Pt]),
  }

  // Ground: one short stroke. Grass ticks at the muzzle when grazing.
  const g = GROUND + 0.7
  out.strokes.push({ pts: [[12, g + 0.2], [40, g - 0.15], [72, g + 0.15], [108, g - 0.1]], w: 1.15 })
  if (pose === 'grazing') {
    const m = sc(hs(1, 0.5))
    for (const [dx, h, lean] of [[2.2, 4.4, -0.6], [4.8, 5.6, 0.5], [7.2, 3.6, 1.3]] as const) {
      const x = m[0] + dx
      out.strokes.push({ pts: [[x, g - 0.3], [x + lean * 0.5, g - h * 0.55], [x + lean, g - h]], w: 1.3 })
    }
  }
  return out
}


// ---------- Horse: small, lean Ethiopian working horse ----------

const HORSE: Species = {
  seed: 'horse',
  withers: [70, 33],
  back: [[70, 33], [61, 35.6], [50, 35.6], [40, 33.8], [33.5, 35.4]],
  buttock: [[32.4, 37], [29.2, 41.5], [29.4, 47.5], [32, 52.2], [33.6, 55]],
  belly: [[68.6, 51.6], [61, 53.8], [52, 54], [45, 51.6], [41.6, 48.4]],
  chest: [[76.6, 44], [77.6, 47.8], [76.4, 51]],
  neckBase: [73, 38],
  neckLen: 22.5,
  crestBulge: 1.7,
  underBulge: -0.4,
  headLen: 15,
  head: [
    [0.04, -0.8], [0.35, -1.2], [0.72, -1.15], [0.97, -0.3], [1.03, 1.5], [0.97, 3.2], [0.85, 3.6],
    [0.6, 3.9], [0.32, 5.6], [0.14, 5.8], [0.02, 4.3],
  ],
  ears: [[-0.03, -0.3], [-0.2, -3.6], [-0.03, -0.1], [0.04, 0.6], [-0.1, -2.6], [0.08, 0.3]],
  earWidth: 1.6,
  tailRoot: [33.5, 35.6],
  frames: {
    standing: { dy: 0, neck: 47, head: 57 },
    walking: { dy: 0, neck: 42, head: 55 },
    trotting: { dy: -1.4, neck: 40, head: 52 },
    grazing: { dy: 0, neck: -48, head: 97 },
    lying: { dy: 17.4, neck: 46, head: 58 },
  },
  legs: {
    foreTop: [73.4, 50.2],
    farForeTop: [68.6, 51.4],
    hindTop: [38.4, 49.4],
    farHindTop: [43, 51.2],
    fore: { lens: [10.6, 7.4, 2.8], wTop: 5.6, wJoint: 3.3, wCannon: 2.5, wFetlock: 3, hoofH: 1.9, hoofW: 2.9, toe: 0.55 },
    hindLeg: { lens: [10.4, 8.8, 2.8], wTop: 6.4, wJoint: 3.4, wCannon: 2.6, wFetlock: 3, hoofH: 1.9, hoofW: 2.9, toe: 0.55 },
  },
  lying: {
    fore: [[76.8, 66.4], [80.8, 68.4], [82, 70.6], [79.8, 71.8], [74.4, 71.6]],
    hind: [[41.6, 60], [47.4, 61.8], [51, 65.6], [50.4, 70.8]],
    hindHoof: [[51.8, 69.4], [54.6, 69.6], [55.4, 72], [51.4, 72]],
  },
  mane(crest) {
    // A dark band under the crest, ragged on its lower edge. Plus a short forelock.
    const pts: Pt[] = []
    const inner: Pt[] = []
    for (let i = 0; i <= 6; i++) {
      const t = i / 6
      const a = i < 3 ? lerp(crest[0], crest[1], t * 2) : i < 6 ? lerp(crest[1], crest[2], (t - 0.5) * 2) : crest[2]
      pts.push(a)
    }
    const top = [...pts, crest[3]]
    for (let i = top.length - 1; i >= 0; i--) {
      const p = top[i]
      const q = top[Math.min(top.length - 1, i + 1)]
      const r = top[Math.max(0, i - 1)]
      const d = unit(sub(q, r))
      const nrm: Pt = [-d[1], d[0]]
      const depth = i === 0 || i === top.length - 1 ? 0.8 : 2.4 + (i % 2) * 1.4
      inner.push(add(p, mul(nrm, depth)))
    }
    const outer = top.map((p, i) => {
      const q = top[Math.min(top.length - 1, i + 1)]
      const r = top[Math.max(0, i - 1)]
      const d = unit(sub(q, r))
      return add(p, mul([d[1], -d[0]], 0.7))
    })
    return { strokes: [], masses: [[...outer, ...inner]] }
  },
  tail(root, pose) {
    if (pose === 'lying') {
      const pts: Pt[] = [root, [root[0] - 3.4, root[1] + 3.6], [root[0] - 5.4, root[1] + 9], [root[0] - 9, GROUND - 1.2], [root[0] - 15, GROUND - 0.6]]
      return {
        strokes: [{ pts, w: 2.4 }],
        masses: [[[root[0] - 6.6, GROUND - 4], [root[0] - 9, GROUND - 1.6], [root[0] - 16.5, GROUND - 0.4], [root[0] - 11, GROUND - 2.6]]],
      }
    }
    const sw = pose === 'trotting' ? -2.2 : pose === 'walking' ? -1 : 0
    const pts: Pt[] = [root, [root[0] - 3.2, root[1] + 2.6 + sw * 0.3], [root[0] - 5 + sw, root[1] + 8], [root[0] - 5.4 + sw * 1.4, root[1] + 15]]
    const tip = pts[3]
    return {
      strokes: [{ pts, w: 2.6 }],
      masses: [[[tip[0] - 1.6, tip[1] - 5], [tip[0] + 1.4, tip[1] - 4], [tip[0] + 1.6 + sw * 0.4, tip[1] + 6], [tip[0] - 0.2 + sw * 0.6, tip[1] + 9.4], [tip[0] - 1.8 + sw * 0.6, tip[1] + 7]]],
    }
  },
  extras() {
    return []
  },
}

// ---------- Donkey: big head, long upright ears, straight back, cord tail with an end tuft ----------

const DONKEY: Species = {
  seed: 'donkey',
  withers: [68, 37.4],
  back: [[68, 37.4], [58, 37.4], [48, 37.2], [39, 36.6], [33.6, 37.8]],
  buttock: [[32.8, 39], [30.2, 43.4], [30.4, 49.6], [33, 54.2], [34.6, 56.6]],
  belly: [[67.2, 54.8], [60, 57.2], [51, 57.2], [44.6, 54.6], [42.2, 51.6]],
  chest: [[74, 47.4], [74.8, 51.2], [73.6, 54.2]],
  neckBase: [71, 42],
  neckLen: 17,
  crestBulge: 0.6,
  underBulge: 0.4,
  headLen: 18.5,
  head: [
    [0.04, -1.2], [0.36, -1.6], [0.72, -1.4], [0.96, -0.6], [1.03, 1.6], [0.98, 3.6], [0.86, 4.3],
    [0.62, 4.8], [0.34, 7.2], [0.14, 7.4], [0.02, 5.4],
  ],
  // Two long upright ears with rounded tips: up the front edge, round the tip, down the back, then the far ear.
  ears: [
    [-0.02, -0.9], [-0.22, -2.4], [-0.52, -3.6], [-0.66, -3.5], [-0.62, -1.9], [-0.18, 0.4],
    [-0.12, 1.4], [-0.38, 0.2], [-0.62, -0.3], [-0.72, 0.4], [-0.48, 1.9], [-0.04, 2.4],
  ],
  earWidth: 2,
  tailRoot: [33.6, 37.9],
  frames: {
    standing: { dy: 0, neck: 34, head: 58 },
    walking: { dy: 0, neck: 30, head: 56 },
    trotting: { dy: -1.2, neck: 28, head: 52 },
    grazing: { dy: 0, neck: -38, head: 97 },
    lying: { dy: 14.4, neck: 36, head: 60 },
  },
  legs: {
    foreTop: [70.8, 53.4],
    farForeTop: [66.4, 54.6],
    hindTop: [38.8, 52.4],
    farHindTop: [43.2, 54.2],
    fore: { lens: [8.8, 6.6, 2.2], wTop: 5, wJoint: 2.7, wCannon: 2.1, wFetlock: 2.4, hoofH: 2.2, hoofW: 2.3, toe: 0.32 },
    hindLeg: { lens: [9, 7.4, 2.2], wTop: 5.8, wJoint: 2.9, wCannon: 2.2, wFetlock: 2.4, hoofH: 2.2, hoofW: 2.3, toe: 0.32 },
  },
  lying: {
    fore: [[74.4, 66.2], [78.2, 68.2], [79.2, 70.6], [77.2, 71.8], [72.4, 71.6]],
    hind: [[42, 59.6], [47, 61.2], [50.2, 65], [49.6, 70.8]],
    hindHoof: [[50.8, 69.2], [53, 69.3], [53.6, 72], [50.6, 72]],
  },
  mane(crest) {
    // Short upright mane: ticks standing off the crest.
    const strokes: Stroke[] = []
    for (let i = 1; i <= 8; i++) {
      const t = i / 9
      const seg = t < 0.5 ? 0 : t < 0.85 ? 1 : 2
      const a = crest[seg]
      const c = crest[seg + 1]
      const lt = seg === 0 ? t / 0.5 : seg === 1 ? (t - 0.5) / 0.35 : (t - 0.85) / 0.15
      const p = lerp(a, c, lt)
      const d = unit(sub(c, a))
      const up: Pt = [d[1], -d[0]]
      const h = 2.2 + (i % 3) * 0.35
      strokes.push({ pts: [add(p, mul(up, 0.4)), add(add(p, mul(up, h)), mul(d, -0.3))], w: 1.5, fine: false })
    }
    return { strokes, masses: [] }
  },
  tail(root, pose) {
    if (pose === 'lying') {
      const pts: Pt[] = [root, [root[0] - 2.4, root[1] + 4], [root[0] - 3.8, root[1] + 10], [root[0] - 7, GROUND - 1.1], [root[0] - 11, GROUND - 0.9]]
      const e = pts[4]
      return {
        strokes: [{ pts, w: 1.5 }],
        masses: [[[e[0] + 0.6, e[1] - 1.2], [e[0] - 2, e[1] - 1.4], [e[0] - 5.6, e[1] - 0.3], [e[0] - 2, e[1] + 0.4]]],
      }
    }
    const sw = pose === 'trotting' ? -1.6 : pose === 'walking' ? -0.6 : 0
    const pts: Pt[] = [root, [root[0] - 1.8, root[1] + 3], [root[0] - 2.4 + sw * 0.5, root[1] + 9], [root[0] - 2.2 + sw, root[1] + 16.5]]
    const e = pts[3]
    return {
      strokes: [{ pts, w: 1.5 }],
      masses: [[[e[0] - 0.5, e[1] - 1.4], [e[0] + 1, e[1] + 0.6], [e[0] + 1.1, e[1] + 3.6], [e[0] - 0.1 + sw * 0.2, e[1] + 6.2], [e[0] - 1.3, e[1] + 3.6], [e[0] - 1.2, e[1] + 0.4]]],
    }
  },
  extras(f) {
    // Dorsal stripe along the back and the cross over the shoulder, one thin line each.
    const b = f.b
    return [
      { pts: [b([67, 38.7]), b([56, 38.9]), b([45, 38.6]), b([36, 38.6])], w: 0.85, fine: true },
      { pts: [b([67.4, 38.8]), b([69.6, 42.6]), b([71.4, 46.6])], w: 0.85, fine: true },
    ]
  },
}

// ---------- Rendering: ribbons, path text ----------

const r1 = (n: number) => Math.round(n * 10) / 10

function num(n: number): string {
  const r = r1(n)
  if (r === 0) return '0'
  const s = String(r)
  if (s.startsWith('0.')) return s.slice(1)
  if (s.startsWith('-0.')) return `-${s.slice(2)}`
  return s
}

/** Join numbers the short way: a minus sign is its own separator. */
function nums(ns: number[]): string {
  let out = ''
  for (const n of ns) {
    const s = num(n)
    out += out && !s.startsWith('-') ? ` ${s}` : s
  }
  return out
}

/** Relative polyline path text from absolute points. Rounds positions first so no drift builds up. */
function poly(pts: Pt[], close: boolean): string {
  if (!pts.length) return ''
  let px = r1(pts[0][0])
  let py = r1(pts[0][1])
  let d = `M${nums([px, py])}l`
  const deltas: number[] = []
  for (let i = 1; i < pts.length; i++) {
    const x = r1(pts[i][0])
    const y = r1(pts[i][1])
    if (x === px && y === py) continue
    deltas.push(x - px, y - py)
    px = x
    py = y
  }
  d += nums(deltas)
  return close ? `${d}z` : d
}

/** Points along a Catmull-Rom curve through the control points, about `step` apart. */
function sample(ctrl: Pt[], step: number, closed = false): Pt[] {
  const n = ctrl.length
  if (n < 2) return ctrl.slice()
  const get = (i: number) => (closed ? ctrl[((i % n) + n) % n] : ctrl[Math.max(0, Math.min(n - 1, i))])
  const out: Pt[] = [ctrl[0]]
  const segs = closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1)
    const p1 = get(i)
    const p2 = get(i + 1)
    const p3 = get(i + 2)
    const k = Math.max(1, Math.ceil(len(sub(p2, p1)) / step))
    for (let j = 1; j <= k; j++) {
      const t = j / k
      const t2 = t * t
      const t3 = t2 * t
      const c = (a: number, b: number, c2: number, d: number) =>
        0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3)
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  return out
}

interface Inked {
  centre: Pt[]
  ribbon: string
}

/** One pen stroke: jittered control points, a slow wobble, a nib that swells under pressure. */
function ink(s: Stroke, rng: () => number): Inked {
  const base = s.w ?? 2.2
  const jit = base > 1.3 ? 0.28 : 0.12
  const ctrl = s.pts.map(([x, y]) => [x + (rng() - 0.5) * jit * 2, y + (rng() - 0.5) * jit * 2] as Pt)
  const raw = sample(ctrl, 1.7)
  const m = raw.length
  // Arc length for the wobble and the pressure curve.
  const acc = [0]
  for (let i = 1; i < m; i++) acc.push(acc[i - 1] + len(sub(raw[i], raw[i - 1])))
  const total = acc[m - 1] || 1
  const ph1 = rng() * Math.PI * 2
  const ph2 = rng() * Math.PI * 2
  const fq = 1 + rng() * 1.2
  const tangents = raw.map((_, i) => unit(sub(raw[Math.min(m - 1, i + 1)], raw[Math.max(0, i - 1)])))
  const centre = raw.map((p, i) => {
    const n: Pt = [-tangents[i][1], tangents[i][0]]
    const wob = Math.sin(acc[i] / 6.5 + ph1) * (base > 1.3 ? 0.16 : 0.08)
    return add(p, mul(n, wob))
  })
  const wsAt = (i: number) => {
    if (!s.ws) return 1
    const t = (i / Math.max(1, m - 1)) * (s.ws.length - 1)
    const a = Math.floor(t)
    const b = Math.min(s.ws.length - 1, a + 1)
    return s.ws[a] + (s.ws[b] - s.ws[a]) * (t - a)
  }
  const half = centre.map((_, i) => {
    const t = acc[i] / total
    const press = 0.56 + 0.44 * Math.pow(Math.sin(Math.PI * t), 0.55)
    const vary = 1 + 0.11 * Math.sin(Math.PI * 2 * fq * t + ph2)
    return (base * wsAt(i) * press * vary) / 2
  })
  const left: Pt[] = []
  const right: Pt[] = []
  centre.forEach((c, i) => {
    const t = tangents[i]
    const n: Pt = [-t[1], t[0]]
    left.push(add(c, mul(n, half[i])))
    right.push(sub(c, mul(n, half[i])))
  })
  right.reverse()
  // Round caps as arcs between the two sides.
  const hEnd = Math.max(0.3, half[m - 1])
  const hStart = Math.max(0.3, half[0])
  const l = poly(left, false)
  const r = right.length ? poly(right, false).replace(/^M[^l]*l/, '') : ''
  const lEnd = left[left.length - 1]
  const rStart = right[0]
  const rEnd = right[right.length - 1]
  const lStart = left[0]
  const capA = `a${nums([hEnd, hEnd])} 0 0 0 ${nums([r1(rStart[0]) - r1(lEnd[0]), r1(rStart[1]) - r1(lEnd[1])])}`
  const capB = `a${nums([hStart, hStart])} 0 0 0 ${nums([r1(lStart[0]) - r1(rEnd[0]), r1(lStart[1]) - r1(rEnd[1])])}`
  // poly() rounds every point, so the relative arc ends land exactly on the rounded neighbours.
  const ribbon = `${l}${capA}l${r}${capB}z`.replace(/l(?=[az])/g, '')
  return { centre, ribbon }
}

function massPath(pts: Pt[], rng: () => number): string {
  const j = pts.map(([x, y]) => [x + (rng() - 0.5) * 0.3, y + (rng() - 0.5) * 0.3] as Pt)
  const ring = sample(j, 1.4, true)
  // Wind every mass the same way as the ribbons, so overlaps add up instead of cutting holes.
  let area = 0
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]
    const c = ring[(i + 1) % ring.length]
    area += a[0] * c[1] - c[0] * a[1]
  }
  return poly(area > 0 ? ring.reverse() : ring, true)
}

export interface PostureShapes {
  /** Filled ink: every stroke as a ribbon, and the dark masses. */
  ink: string
  /** Light pencil hatching, stroked. */
  hatch: string
  /** Stale data: the centre lines only, drawn thin and broken in graphite. */
  outline: string
}

const cache = new Map<string, PostureShapes>()

export function postureShapes(species: 'horse' | 'donkey', pose: Pose): PostureShapes {
  const key = `${species}:${pose}`
  const hit = cache.get(key)
  if (hit) return hit
  const sp = species === 'horse' ? HORSE : DONKEY
  const f = figure(sp, pose)
  const rng = createRng(`posture:${sp.seed}`)
  const inked = f.strokes.map((s) => ({ s, k: ink(s, rng) }))
  const masses = f.masses.map((m) => massPath(m, rng))
  const hrng = createRng(`hatch:${key}`)
  const hatch = f.hatch
    .map(([a, b]) => {
      const j = () => (hrng() - 0.5) * 0.4
      return `M${nums([a[0] + j(), a[1] + j()])}l${nums([r1(b[0] - a[0]) + j(), r1(b[1] - a[1]) + j()])}`
    })
    .join('')
  const outline = [
    ...inked.filter(({ s }) => !s.fine).map(({ k }) => poly(k.centre.filter((_, i) => i % 2 === 0 || i === k.centre.length - 1), false)),
    ...masses,
  ].join('')
  const out: PostureShapes = { ink: inked.map(({ k }) => k.ribbon).join('') + masses.join(''), hatch, outline }
  cache.set(key, out)
  return out
}
