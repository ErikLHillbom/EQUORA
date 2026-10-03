// Builds src/simulation/routes.json: the walking routes of the demo herd over real terrain.
//
// 1. Fetches roads, tracks and paths in the demo box from the Overpass API (OpenStreetMap, ODbL).
// 2. Finds the shortest path on that network between each home and the places the animals go to,
//    with main roads weighted as longer so the animals prefer tracks.
// 3. Simplifies each path (Douglas-Peucker, 6 m) and fetches the elevation of every vertex from the
//    Open-Meteo elevation API (Copernicus DEM GLO-90, up to 100 points per call).
//
// If Overpass fails, each route falls back to hand-placed waypoints on a straight line, and the
// JSON says so in "network".
//
// Usage: npx tsx scripts/build-routes.ts [--cache path/to/overpass.json]
// With --cache, a saved Overpass response is reused, and saved there after a successful fetch.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ARICHA,
  ARICHA_WATER,
  DEMO_BBOX,
  HOMES,
  MARKET,
  NORTH_RIDGE,
} from '../src/simulation/places.ts'

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const ELEVATION = 'https://api.open-meteo.com/v1/elevation'
const USER_AGENT = 'EquidSentinel/0.1 (hackathon build script)'

export interface LatLon {
  lat: number
  lon: number
}

interface OsmWay {
  type: 'way'
  id: number
  nodes: number[]
  geometry: LatLon[]
  tags: Record<string, string>
}

export interface RouteSpec {
  id: string
  from: string
  to: string
  purpose: 'aricha' | 'water' | 'market' | 'slope' | 'town'
  a: LatLon
  b: LatLon
}

export interface RouteOut {
  id: string
  from: string
  to: string
  purpose: RouteSpec['purpose']
  lengthKm: number
  climbM: number
  /** [lon, lat, elevation m] per vertex. */
  coords: [number, number, number][]
}

// Main roads count as longer than they are: a donkey with a load takes the track if it can.
const COST: Record<string, number> = {
  trunk: 1.8,
  trunk_link: 1.8,
  primary: 1.6,
  secondary: 1.4,
  tertiary: 1.2,
}

export function haversineM(a: LatLon, b: LatLon): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Douglas-Peucker on a local flat projection. Tolerance in metres. */
export function simplify(points: LatLon[], toleranceM: number): LatLon[] {
  if (points.length < 3) return points.slice()
  const lat0 = (points[0].lat * Math.PI) / 180
  const xy = points.map((p) => [p.lon * 111320 * Math.cos(lat0), p.lat * 110540])
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length) {
    const [s, e] = stack.pop()!
    const [x1, y1] = xy[s]
    const [x2, y2] = xy[e]
    const dx = x2 - x1
    const dy = y2 - y1
    const len2 = dx * dx + dy * dy
    let maxD = -1
    let idx = -1
    for (let i = s + 1; i < e; i++) {
      const [x, y] = xy[i]
      let t = len2 === 0 ? 0 : ((x - x1) * dx + (y - y1) * dy) / len2
      t = Math.max(0, Math.min(1, t))
      const d = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
      if (d > maxD) {
        maxD = d
        idx = i
      }
    }
    if (maxD > toleranceM && idx > 0) {
      keep[idx] = 1
      stack.push([s, idx], [idx, e])
    }
  }
  return points.filter((_, i) => keep[i] === 1)
}

/** Straight line from a to b with a vertex every `stepM` metres. The fallback route. */
export function straightLine(a: LatLon, b: LatLon, stepM = 150): LatLon[] {
  const n = Math.max(1, Math.ceil(haversineM(a, b) / stepM))
  const out: LatLon[] = []
  for (let i = 0; i <= n; i++) {
    out.push({ lat: a.lat + ((b.lat - a.lat) * i) / n, lon: a.lon + ((b.lon - a.lon) * i) / n })
  }
  return out
}

export class Network {
  private coords = new Map<number, LatLon>()
  private adj = new Map<number, { to: number; w: number }[]>()

  constructor(ways: OsmWay[]) {
    for (const way of ways) {
      const factor = COST[way.tags.highway ?? ''] ?? 1
      for (let i = 0; i < way.nodes.length; i++) {
        this.coords.set(way.nodes[i], way.geometry[i])
        if (i === 0) continue
        const a = way.nodes[i - 1]
        const b = way.nodes[i]
        const w = haversineM(way.geometry[i - 1], way.geometry[i]) * factor
        this.link(a, b, w)
        this.link(b, a, w)
      }
    }
  }

  get size(): number {
    return this.coords.size
  }

  private link(a: number, b: number, w: number) {
    const list = this.adj.get(a)
    if (list) list.push({ to: b, w })
    else this.adj.set(a, [{ to: b, w }])
  }

  nearest(p: LatLon): { id: number; distM: number } {
    let best = -1
    let bestD = Infinity
    for (const [id, c] of this.coords) {
      const d = haversineM(p, c)
      if (d < bestD) {
        bestD = d
        best = id
      }
    }
    return { id: best, distM: bestD }
  }

  /** Dijkstra with a binary heap. Returns the node coordinates along the path, or null. */
  path(from: number, to: number): LatLon[] | null {
    const dist = new Map<number, number>([[from, 0]])
    const prev = new Map<number, number>()
    const heap: [number, number][] = [[0, from]]
    const push = (item: [number, number]) => {
      heap.push(item)
      let i = heap.length - 1
      while (i > 0) {
        const p = (i - 1) >> 1
        if (heap[p][0] <= heap[i][0]) break
        ;[heap[p], heap[i]] = [heap[i], heap[p]]
        i = p
      }
    }
    const pop = (): [number, number] => {
      const top = heap[0]
      const last = heap.pop()!
      if (heap.length) {
        heap[0] = last
        let i = 0
        for (;;) {
          const l = 2 * i + 1
          const r = l + 1
          let m = i
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r
          if (m === i) break
          ;[heap[m], heap[i]] = [heap[i], heap[m]]
          i = m
        }
      }
      return top
    }
    while (heap.length) {
      const [d, u] = pop()
      if (u === to) break
      if (d > (dist.get(u) ?? Infinity)) continue
      for (const { to: v, w } of this.adj.get(u) ?? []) {
        const nd = d + w
        if (nd < (dist.get(v) ?? Infinity)) {
          dist.set(v, nd)
          prev.set(v, u)
          push([nd, v])
        }
      }
    }
    if (!dist.has(to)) return null
    const ids: number[] = [to]
    while (ids[ids.length - 1] !== from) ids.push(prev.get(ids[ids.length - 1])!)
    return ids.reverse().map((id) => this.coords.get(id)!)
  }
}

export function routeSpecs(): RouteSpec[] {
  const specs: RouteSpec[] = []
  for (const h of HOMES) {
    specs.push({ id: `${h.household}-aricha`, from: h.id, to: ARICHA.id, purpose: 'aricha', a: h, b: ARICHA })
    specs.push({ id: `${h.household}-water`, from: h.id, to: ARICHA_WATER.id, purpose: 'water', a: h, b: ARICHA_WATER })
    specs.push({ id: `${h.household}-market`, from: h.id, to: MARKET.id, purpose: 'market', a: h, b: MARKET })
  }
  const domorso = HOMES.find((h) => h.household === 'domorso')!
  // Cart work in town: cherries from the collection point at the market to the station.
  specs.push({ id: 'market-aricha', from: MARKET.id, to: ARICHA.id, purpose: 'town', a: MARKET, b: ARICHA })
  specs.push({ id: 'north-slope', from: domorso.id, to: 'north-ridge', purpose: 'slope', a: domorso, b: NORTH_RIDGE })
  return specs
}

function cachePath(): string | null {
  const i = process.argv.indexOf('--cache')
  return i > 0 ? (process.argv[i + 1] ?? null) : null
}

function parseWays(json: { elements: OsmWay[] }): OsmWay[] {
  return json.elements.filter(
    (e) => e.type === 'way' && e.tags?.highway && e.geometry?.length === e.nodes?.length,
  )
}

async function fetchNetwork(): Promise<OsmWay[] | null> {
  const cache = cachePath()
  if (cache && existsSync(cache)) {
    const ways = parseWays(JSON.parse(readFileSync(cache, 'utf8')))
    console.log(`Overpass cache ${cache}: ${ways.length} ways`)
    return ways
  }
  const { south, west, north, east } = DEMO_BBOX
  const query = `[out:json][timeout:120];way["highway"](${south},${west},${north},${east});out geom;`
  // Public Overpass servers are often busy: try each twice with a pause.
  for (const url of [...OVERPASS, ...OVERPASS]) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      const ways = parseWays(JSON.parse(text) as { elements: OsmWay[] })
      if (cache) writeFileSync(cache, text)
      console.log(`Overpass ${url}: ${ways.length} ways`)
      return ways
    } catch (err) {
      console.warn(`Overpass ${url} failed: ${(err as Error).message}`)
      await new Promise((r) => setTimeout(r, 10000))
    }
  }
  return null
}

async function fetchElevations(points: LatLon[]): Promise<number[]> {
  const out: number[] = []
  for (let i = 0; i < points.length; i += 100) {
    const chunk = points.slice(i, i + 100)
    const lat = chunk.map((p) => p.lat.toFixed(5)).join(',')
    const lon = chunk.map((p) => p.lon.toFixed(5)).join(',')
    let lastErr: unknown
    if (i > 0) await new Promise((r) => setTimeout(r, 1500))
    // The free API has a per-minute limit; on HTTP 429 wait a minute and try again.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await fetch(`${ELEVATION}?latitude=${lat}&longitude=${lon}`, {
          headers: { 'User-Agent': USER_AGENT },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as { elevation: number[] }
        out.push(...json.elevation)
        lastErr = undefined
        break
      } catch (err) {
        lastErr = err
        console.warn(`Elevation call failed (${(err as Error).message}), waiting 65 s`)
        await new Promise((r) => setTimeout(r, 65000))
      }
    }
    if (lastErr) throw lastErr
  }
  return out
}

async function main() {
  const ways = await fetchNetwork()
  const net = ways ? new Network(ways) : null
  if (net) console.log(`Network: ${net.size} nodes`)

  const specs = routeSpecs()
  const paths: LatLon[][] = []
  const notes: string[] = []
  for (const spec of specs) {
    let pts: LatLon[] | null = null
    if (net) {
      const a = net.nearest(spec.a)
      const b = net.nearest(spec.b)
      const p = net.path(a.id, b.id)
      if (p) pts = [spec.a, ...p, spec.b]
      console.log(`${spec.id}: snap ${a.distM.toFixed(0)} m / ${b.distM.toFixed(0)} m, ${p ? p.length : 'no'} nodes`)
    }
    if (pts) {
      paths.push(simplify(pts, 6))
    } else {
      // Keep every 150 m waypoint so the elevation profile still follows the ground.
      paths.push(straightLine(spec.a, spec.b))
      notes.push(`${spec.id}: hand-placed straight waypoints`)
    }
  }

  // One elevation call per 100 unique vertices for all routes together.
  const all = paths.flat()
  const elev = await fetchElevations(all)
  let k = 0
  const routes: RouteOut[] = specs.map((spec, i) => {
    const coords: [number, number, number][] = paths[i].map((p) => [
      Number(p.lon.toFixed(5)),
      Number(p.lat.toFixed(5)),
      Math.round(elev[k++]),
    ])
    let length = 0
    let climb = 0
    for (let j = 1; j < coords.length; j++) {
      length += haversineM({ lon: coords[j - 1][0], lat: coords[j - 1][1] }, { lon: coords[j][0], lat: coords[j][1] })
      climb += Math.max(0, coords[j][2] - coords[j - 1][2])
    }
    return {
      id: spec.id,
      from: spec.from,
      to: spec.to,
      purpose: spec.purpose,
      lengthKm: Number((length / 1000).toFixed(2)),
      climbM: Math.round(climb),
      coords,
    }
  })

  const out = {
    source:
      'Paths: OpenStreetMap contributors (ODbL) via Overpass API. Elevation: Open-Meteo elevation API (Copernicus DEM GLO-90).',
    network: net ? 'osm' : 'hand-placed',
    notes,
    bbox: [DEMO_BBOX.west, DEMO_BBOX.south, DEMO_BBOX.east, DEMO_BBOX.north],
    generated: new Date().toISOString().slice(0, 10),
    routes,
  }
  const file = join(process.cwd(), 'src/simulation/routes.json')
  const text = JSON.stringify(out)
  writeFileSync(file, text)
  console.log(`Wrote ${file}: ${routes.length} routes, ${(text.length / 1024).toFixed(1)} KB`)
  for (const r of routes) console.log(`  ${r.id}: ${r.lengthKm} km, climb ${r.climbM} m, ${r.coords.length} vertices`)
}

if (process.argv[1]?.endsWith('build-routes.ts')) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
