// PLACEHOLDER silhouettes for PostureDrawing (DESIGN 7, source 3). Replace with our own drawings later.
// viewBox 0 0 120 80, ground line at y 72, profile facing right.
// Horse and donkey, five poses each. Mule uses the donkey set. Lying is calm sternal lying.
import type { Pose } from '../types'
import { catmullRom, limb, type Pt } from './geometry'

type Limb = { pts: Pt[]; w: number[] }

interface Figure {
  body: Pt[]
  neck: Pt[]
  head: Pt[]
  ears: Pt[][]
  mane?: Pt[]
  tail: Limb[]
  farLegs: Limb[]
  nearLegs: Limb[]
}

const shift = (pts: Pt[], dx: number, dy: number): Pt[] => pts.map(([x, y]) => [x + dx, y + dy] as const)
const L = (pts: Pt[], w: number[]): Limb => ({ pts, w })

// ---------- Horse ----------

const H_BODY: Pt[] = [
  [76, 29], [66, 31], [55, 32], [44, 30], [35, 28], [29, 31], [26, 37], [27, 44], [31, 49], [38, 51],
  [48, 52], [60, 53], [71, 52], [79, 50], [84, 45], [86, 38], [83, 31],
]
const H_NECK: Pt[] = [[72, 34], [78, 26], [85, 18], [91, 11], [97, 12], [98, 20], [95, 27], [90, 35], [87, 43], [78, 43]]
const H_HEAD: Pt[] = [[91, 9], [97, 8], [103, 13], [108, 20], [112, 26], [112, 30], [109, 32], [104, 31], [99, 27], [94, 22], [91, 15]]
const H_EARS: Pt[][] = [
  [[92, 11], [92, 3.5], [95.5, 9]],
  [[94.5, 10], [96.5, 3], [98, 9.5]],
]
const H_TAIL = [L([[29, 32], [24, 40], [23, 50], [24, 60]], [4, 5, 5, 3])]

const H_GRAZE_NECK: Pt[] = [[72, 34], [80, 30], [88, 35], [95, 45], [100, 55], [95, 58], [90, 52], [85, 46], [78, 44]]
const H_GRAZE_HEAD: Pt[] = [[93, 51], [99, 49], [103, 54], [104, 60], [103.5, 66], [102, 70.5], [97.5, 70.5], [95.5, 65], [94, 58]]
const H_GRAZE_EARS: Pt[][] = [[[97, 51], [103, 46.5], [100.5, 53]]]

function horse(pose: Pose): Figure {
  const base: Figure = {
    body: H_BODY,
    neck: H_NECK,
    head: H_HEAD,
    ears: H_EARS,
    tail: H_TAIL,
    farLegs: [L([[77, 46], [77, 60], [77, 70]], [6, 4, 4.2]), L([[33, 44], [38, 58], [35, 70]], [9, 4, 4.2])],
    nearLegs: [L([[81, 46], [82, 60], [82, 70]], [7, 4.2, 4.6]), L([[38, 44], [42, 57], [40, 70]], [10, 4.2, 4.6])],
  }
  switch (pose) {
    case 'standing':
      return base
    case 'walking':
      return {
        ...base,
        farLegs: [L([[77, 46], [75, 59], [71, 70]], [6, 4, 4.2]), L([[33, 44], [40, 57], [44, 69]], [9, 4, 4.2])],
        nearLegs: [L([[81, 46], [85, 59], [88, 70]], [7, 4.2, 4.6]), L([[38, 44], [39, 58], [32, 70]], [10, 4.2, 4.6])],
      }
    case 'trotting':
      return {
        ...shiftFigure(base, 0, -2),
        farLegs: [L([[77, 44], [75, 57], [72, 69]], [6, 4, 4.2]), L([[33, 42], [43, 53], [39, 62]], [9, 4, 4.2])],
        nearLegs: [L([[81, 44], [89, 52], [86, 61]], [7, 4.2, 4.6]), L([[38, 42], [37, 56], [30, 69]], [10, 4.2, 4.6])],
      }
    case 'grazing':
      return { ...base, neck: H_GRAZE_NECK, head: H_GRAZE_HEAD, ears: H_GRAZE_EARS }
    case 'lying':
      return lying(base, 16)
  }
}

// ---------- Donkey: straight back, long upright ears, short upright mane, tufted tail ----------

const D_BODY: Pt[] = [
  [76, 31], [66, 31.5], [55, 31.5], [44, 31], [36, 30.5], [30, 32], [27, 38], [28, 45], [32, 50], [39, 52],
  [49, 53.5], [61, 54], [72, 53], [79, 51], [84, 46], [86, 39], [83, 33],
]
const D_NECK: Pt[] = [[72, 35], [77, 28], [83, 21], [89, 15], [96, 16], [97, 24], [94, 31], [90, 38], [87, 45], [78, 45]]
const D_HEAD: Pt[] = [[88, 12], [96, 11], [103, 16], [109, 23], [113, 30], [112, 35], [107, 37], [101, 34], [95, 28], [90, 21]]
const D_EARS: Pt[][] = [
  [[89, 14], [86.5, -1], [93, 12]],
  [[92, 13], [93, -2], [96.5, 13]],
]
const D_MANE: Pt[] = [
  [74, 32], [73.5, 28.5], [76.5, 29], [77, 25.5], [80, 26], [80.5, 22.5], [83.5, 23], [84.5, 19.5], [87, 20],
  [88, 16.5], [90.5, 17], [91, 15], [84, 22], [78, 29],
]
const D_TAIL = [L([[30, 34], [27, 42], [26, 50]], [2.6, 2.2, 2]), L([[26, 49], [25, 54], [25.5, 59]], [3, 5.5, 2.5])]

const D_GRAZE_NECK: Pt[] = [[72, 35], [80, 31], [88, 36], [94, 45], [98, 54], [93, 57], [89, 52], [85, 47], [78, 46]]
const D_GRAZE_HEAD: Pt[] = [[91, 50], [98, 48], [103, 53], [105, 60], [104, 66], [102.5, 70.5], [97, 70.5], [94.5, 64], [92, 57]]
const D_GRAZE_EARS: Pt[][] = [
  [[96, 50], [106, 41], [99, 53]],
  [[94, 50], [101, 40], [97, 52]],
]
const D_GRAZE_MANE: Pt[] = [
  [74, 33], [76, 29.5], [78.5, 31], [81, 28.5], [83, 31], [86, 30], [87.5, 33], [90, 33], [91, 37], [88, 36], [80, 32],
]

function donkey(pose: Pose): Figure {
  const base: Figure = {
    body: D_BODY,
    neck: D_NECK,
    head: D_HEAD,
    ears: D_EARS,
    mane: D_MANE,
    tail: D_TAIL,
    farLegs: [L([[77, 48], [77, 61], [77, 70]], [6, 3.6, 3.8]), L([[34, 46], [38, 59], [36, 70]], [9, 3.6, 3.8])],
    nearLegs: [L([[81, 48], [81.5, 61], [81.5, 70]], [7, 3.8, 4]), L([[39, 46], [42, 58], [40.5, 70]], [10, 3.8, 4])],
  }
  switch (pose) {
    case 'standing':
      return base
    case 'walking':
      return {
        ...base,
        farLegs: [L([[77, 48], [75, 60], [72, 70]], [6, 3.6, 3.8]), L([[34, 46], [40, 58], [43, 69]], [9, 3.6, 3.8])],
        nearLegs: [L([[81, 48], [84.5, 60], [87, 70]], [7, 3.8, 4]), L([[39, 46], [39, 59], [33, 70]], [10, 3.8, 4])],
      }
    case 'trotting':
      return {
        ...shiftFigure(base, 0, -2),
        farLegs: [L([[77, 46], [75, 58], [72, 69]], [6, 3.6, 3.8]), L([[34, 44], [43, 54], [39, 62]], [9, 3.6, 3.8])],
        nearLegs: [L([[81, 46], [88, 54], [85, 62]], [7, 3.8, 4]), L([[39, 44], [38, 57], [31, 69]], [10, 3.8, 4])],
      }
    case 'grazing':
      return { ...base, neck: D_GRAZE_NECK, head: D_GRAZE_HEAD, ears: D_GRAZE_EARS, mane: D_GRAZE_MANE }
    case 'lying':
      return lying(base, 15)
  }
}

// ---------- Shared ----------

function shiftFigure(f: Figure, dx: number, dy: number): Figure {
  const sl = (l: Limb) => L(shift(l.pts, dx, dy), l.w)
  return {
    body: shift(f.body, dx, dy),
    neck: shift(f.neck, dx, dy),
    head: shift(f.head, dx, dy),
    ears: f.ears.map((e) => shift(e, dx, dy)),
    mane: f.mane && shift(f.mane, dx, dy),
    tail: f.tail.map(sl),
    farLegs: f.farLegs.map(sl),
    nearLegs: f.nearLegs.map(sl),
  }
}

/** Calm sternal lying: body lowered, legs folded under, head up. Never rolling or collapsed. */
function lying(f: Figure, drop: number): Figure {
  const low = shiftFigure(f, 0, drop)
  const neckDrop = drop - 4
  const up = shiftFigure(f, 0, neckDrop)
  return {
    ...low,
    neck: up.neck,
    head: up.head,
    ears: up.ears,
    mane: up.mane,
    tail: [L([[28, 32 + drop], [24, 42 + drop], [21, 49 + drop], [15, 69.5]], [4, 4, 3, 2.4])],
    farLegs: [],
    nearLegs: [
      L([[79, 46 + drop], [90, 50 + drop], [84, 54 + drop]], [7, 4.5, 4.5]),
      L([[38, 42 + drop], [52, 51 + drop], [44, 54 + drop]], [12, 6, 4.5]),
    ],
  }
}

export interface PostureShapes {
  /** Path data for every part, back to front. */
  parts: string[]
}

const cache = new Map<string, PostureShapes>()

export function postureShapes(species: 'horse' | 'donkey', pose: Pose): PostureShapes {
  const key = `${species}:${pose}`
  const hit = cache.get(key)
  if (hit) return hit
  const f = species === 'horse' ? horse(pose) : donkey(pose)
  const parts = [
    ...f.farLegs.map((l) => limb(l.pts, l.w)),
    ...f.tail.map((l) => limb(l.pts, l.w)),
    catmullRom(f.body, true),
    catmullRom(f.neck, true),
    ...(f.mane ? [`M${f.mane.map(([x, y]) => `${x} ${y}`).join('L')}Z`] : []),
    catmullRom(f.head, true),
    ...f.ears.map((e) => catmullRom(e, true, 0.5)),
    ...f.nearLegs.map((l) => limb(l.pts, l.w)),
  ]
  const out = { parts }
  cache.set(key, out)
  return out
}
