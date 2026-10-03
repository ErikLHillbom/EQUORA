// Screen-space label placement. Animals that stand in the same yard must all stay visible and
// tappable, so their markers move apart and a thin leader line points back to the real spot.

export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

export interface Candidate {
  /** Offset of the marker from its point, px. */
  dx: number
  dy: number
  /** The marker's box at this offset, relative to the point. */
  box: Box
  /** The name tab sits left of the stamp instead of right. */
  flip?: boolean
}

export interface PlaceItem {
  id: string
  /** Projected point on screen, px. */
  x: number
  y: number
  /** Positions to try, best first. */
  candidates: readonly Candidate[]
  /** Required items always get a place (the least crowded one). Optional ones may be hidden. */
  required: boolean
  /**
   * Space this item keeps free around its own point, relative to the point. Items placed before
   * it avoid this box, so a moved marker never lands on another animal's real spot.
   */
  reserve?: Box
}

export interface Placement {
  /** Index into the item's candidates, or -1 when an optional item is hidden. */
  index: number
  dx: number
  dy: number
  flip: boolean
  /** The placed box on screen. Undefined when hidden. */
  box?: Box
}

/**
 * Boxes may touch by this many px and still count as apart. Animals in one yard sit a few px
 * from each other, and stacked rows must still fit.
 */
const SLACK = 4
/** A box partly off screen costs this much per px outside, more than an overlap. */
const OFFSCREEN_WEIGHT = 4

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left) - SLACK
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) - SLACK
  return w > 0 && h > 0 ? w * h : 0
}

function outside(a: Box, v: Box): number {
  const inner = { left: a.left + SLACK, top: a.top + SLACK, right: a.right - SLACK, bottom: a.bottom - SLACK }
  const area = (inner.right - inner.left) * (inner.bottom - inner.top)
  const w = Math.max(0, Math.min(inner.right, v.right) - Math.max(inner.left, v.left))
  const h = Math.max(0, Math.min(inner.bottom, v.bottom) - Math.max(inner.top, v.top))
  return area - w * h
}

function shift(b: Box, x: number, y: number): Box {
  return { left: b.left + x, top: b.top + y, right: b.right + x, bottom: b.bottom + y }
}

/**
 * Places items in the given order (most important first). Each takes its first candidate that
 * touches nothing placed before it and stays inside the viewport. A required item with no free
 * candidate takes the cheapest one; an optional one is hidden.
 */
export function declutter(items: readonly PlaceItem[], obstacles: readonly Box[] = [], viewport?: Box): Map<string, Placement> {
  const placed: Box[] = [...obstacles]
  const out = new Map<string, Placement>()
  const reserves = items.map((it) => (it.reserve ? shift(it.reserve, it.x, it.y) : undefined))
  items.forEach((item, k) => {
    let best = -1
    let bestCost = Infinity
    for (let i = 0; i < item.candidates.length; i++) {
      const box = shift(item.candidates[i].box, item.x, item.y)
      let cost = viewport ? outside(box, viewport) * OFFSCREEN_WEIGHT : 0
      for (const p of placed) cost += overlap(box, p)
      for (let j = k + 1; j < items.length; j++) {
        const r = reserves[j]
        // An item standing on the same spot shares it: the first one keeps it.
        const own = reserves[k]
        if (r && !(own && overlap(own, r) > 0)) cost += overlap(box, r)
      }
      if (cost === 0) {
        best = i
        bestCost = 0
        break
      }
      if (item.required && cost < bestCost) {
        best = i
        bestCost = cost
      }
    }
    if (best < 0) {
      out.set(item.id, { index: -1, dx: 0, dy: 0, flip: false })
      return
    }
    const c = item.candidates[best]
    const box = shift(c.box, item.x, item.y)
    placed.push(box)
    out.set(item.id, { index: best, dx: c.dx, dy: c.dy, flip: !!c.flip, box })
  })
  return out
}

/** The stamp's own square at the point: what an animal keeps free for itself. */
export const STAMP_RESERVE: Box = { left: -16, top: -16, right: 16, bottom: 16 }

/** Row height of an animal marker: the 48 px tap target plus a small gap. */
export const MARKER_STEP = 50
/** Half the tap target: the stamp's centre sits this far in from the marker's edge and top. */
export const MARKER_HALF = 24

/**
 * Where an animal marker may go: on its point, then stacked above or below it, then to the
 * sides. At each spot the name tab may sit right (first) or left of the stamp. `width` is the
 * marker's full width, stamp and name tab together.
 */
export function animalCandidates(width: number): Candidate[] {
  const s = MARKER_STEP
  const side = Math.round(width * 0.6)
  const offsets: [number, number][] = [
    [0, 0],
    [0, -s],
    [0, s],
    [side, -s],
    [-side, -s],
    [side, s],
    [-side, s],
    [0, -2 * s],
    [0, 2 * s],
    [side, -2 * s],
    [-side, 2 * s],
    [0, -3 * s],
    [0, 3 * s],
  ]
  const h = MARKER_HALF
  return offsets.flatMap(([dx, dy]) => [
    { dx, dy, box: { left: dx - h, top: dy - h, right: dx - h + width, bottom: dy + h } },
    { dx, dy, flip: true, box: { left: dx + h - width, top: dy - h, right: dx + h, bottom: dy + h } },
  ])
}

/**
 * Where a place label may go around its symbol (half size r px): right, left, below, above.
 * The offset is the label's top-left corner relative to the point.
 */
export function placeLabelCandidates(width: number, height: number, r = 10): Candidate[] {
  const gap = 3
  const offsets: [number, number][] = [
    [r + gap, -height / 2],
    [-r - gap - width, -height / 2],
    [-width / 2, r + gap],
    [-width / 2, -r - gap - height],
  ]
  return offsets.map(([dx, dy]) => ({ dx, dy, box: { left: dx, top: dy, right: dx + width, bottom: dy + height } }))
}
