// Walking routes built by scripts/build-routes.ts from OpenStreetMap paths and Open-Meteo elevation.

import routesJson from './routes.json'

export type RoutePurpose = 'aricha' | 'water' | 'market' | 'slope' | 'town'

export interface Route {
  id: string
  from: string
  to: string
  purpose: RoutePurpose
  lengthKm: number
  climbM: number
  /** [lon, lat, elevation m] per vertex. */
  coords: [number, number, number][]
}

export interface RoutePoint {
  lat: number
  lon: number
  eleM: number
}

interface PreparedRoute {
  route: Route
  /** Cumulative distance in km at each vertex. */
  cumKm: number[]
  /** Cumulative climb (m) at each vertex walking forward, and walking backward from the end. */
  cumUp: number[]
  cumDown: number[]
}

const data = routesJson as unknown as { routes: Route[]; source: string; network: string }
export const ROUTES: Route[] = data.routes
export const ROUTE_SOURCE: string = data.source
/** 'osm' when the paths come from OpenStreetMap, 'hand-placed' when the script fell back. */
export const ROUTE_NETWORK: string = data.network

function segKm(a: [number, number, number], b: [number, number, number]): number {
  const R = 6371
  const dLat = ((b[1] - a[1]) * Math.PI) / 180
  const dLon = ((b[0] - a[0]) * Math.PI) / 180
  const la1 = (a[1] * Math.PI) / 180
  const la2 = (b[1] * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

const prepared = new Map<string, PreparedRoute>()
for (const route of ROUTES) {
  const cumKm = [0]
  const cumUp = [0]
  const cumDown = [0]
  for (let i = 1; i < route.coords.length; i++) {
    const a = route.coords[i - 1]
    const b = route.coords[i]
    cumKm.push(cumKm[i - 1] + segKm(a, b))
    cumUp.push(cumUp[i - 1] + Math.max(0, b[2] - a[2]))
    cumDown.push(cumDown[i - 1] + Math.max(0, a[2] - b[2]))
  }
  prepared.set(route.id, { route, cumKm, cumUp, cumDown })
}

export function getRoute(id: string): Route {
  const p = prepared.get(id)
  if (!p) throw new Error(`Unknown route ${id}`)
  return p.route
}

export function routeLengthKm(id: string): number {
  const p = prepared.get(id)!
  return p.cumKm[p.cumKm.length - 1]
}

/** Index of the segment containing distance d (km from the start). */
function segmentAt(cum: number[], d: number): number {
  let lo = 0
  let hi = cum.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (cum[mid] <= d) lo = mid
    else hi = mid
  }
  return lo
}

/** Position at distance km along the route. With reverse, distance counts from the far end. */
export function pointAt(id: string, km: number, reverse = false): RoutePoint {
  const p = prepared.get(id)!
  const total = p.cumKm[p.cumKm.length - 1]
  const d = Math.max(0, Math.min(total, reverse ? total - km : km))
  const i = segmentAt(p.cumKm, d)
  const j = Math.min(i + 1, p.route.coords.length - 1)
  const a = p.route.coords[i]
  const b = p.route.coords[j]
  const len = p.cumKm[j] - p.cumKm[i]
  const f = len > 0 ? (d - p.cumKm[i]) / len : 0
  return { lon: a[0] + (b[0] - a[0]) * f, lat: a[1] + (b[1] - a[1]) * f, eleM: a[2] + (b[2] - a[2]) * f }
}

function interp(cum: number[], cumKm: number[], d: number): number {
  const i = segmentAt(cumKm, d)
  const j = Math.min(i + 1, cum.length - 1)
  const len = cumKm[j] - cumKm[i]
  const f = len > 0 ? (d - cumKm[i]) / len : 0
  return cum[i] + (cum[j] - cum[i]) * f
}

/** Metres climbed walking from km0 to km1 along the route (in the walking direction). */
export function climbBetween(id: string, km0: number, km1: number, reverse = false): number {
  const p = prepared.get(id)!
  const total = p.cumKm[p.cumKm.length - 1]
  const a = Math.max(0, Math.min(total, km0))
  const b = Math.max(0, Math.min(total, km1))
  if (!reverse) return Math.max(0, interp(p.cumUp, p.cumKm, b) - interp(p.cumUp, p.cumKm, a))
  // Walking backward, the climb is the forward descent between the mirrored points.
  return Math.max(0, interp(p.cumDown, p.cumKm, total - a) - interp(p.cumDown, p.cumKm, total - b))
}
