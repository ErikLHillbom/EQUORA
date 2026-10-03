// Real places in the Yirgacheffe demo box (bbox 38.11,6.07,38.29,6.25). Coordinates come from
// OpenStreetMap (ODbL) where a feature is tagged, and are marked approximate where it is not.
// Checked against Overpass on 2026-10-03.
//
// This file has no runtime imports so scripts/build-routes.ts can read it under Node.

import type { Place } from '../shared/types.ts'

export const DEMO_BBOX = { west: 38.11, south: 6.07, east: 38.29, north: 6.25 } as const

/** Yirgacheffe town centre (OSM node 1150967112, place=town, 6.1620 N 38.2029 E). */
export const TOWN_CENTRE = { lat: 6.162, lon: 38.205 } as const

export interface HomePlace extends Place {
  kind: 'home'
  /** Household id used by the herd. */
  household: string
}

/**
 * Aricha washing station. OSM has no feature named Aricha in the box. This is an unnamed coffee
 * processing site (OSM way 917803753, landuse=industrial, industrial=coffee) next to the river,
 * 1.5 km north-east of the town centre. APPROXIMATE: the real Aricha station may sit elsewhere in
 * the kebele, but it is a washing station on a river less than 5 km from town.
 */
export const ARICHA: Place = {
  id: 'aricha',
  nameKey: 'simulation.place.aricha',
  lat: 6.1713,
  lon: 38.2149,
  kind: 'washing_station',
}

/**
 * Water point where animals drink: the river bank below the washing station (nearest vertex of
 * OSM way 467889976, waterway=river). The access point itself is APPROXIMATE.
 */
export const ARICHA_WATER: Place = {
  id: 'aricha-water',
  nameKey: 'simulation.place.arichaWater',
  lat: 6.1689,
  lon: 38.2157,
  kind: 'water',
}

/** Market. OSM has no marketplace tag in town. APPROXIMATE: on the main road near the centre. */
export const MARKET: Place = {
  id: 'market',
  nameKey: 'simulation.place.market',
  lat: 6.1598,
  lon: 38.2031,
  kind: 'market',
}

/** Animal health post. APPROXIMATE: placed in town, no OSM feature. Used for "call help". */
export const CLINIC: Place = {
  id: 'clinic',
  nameKey: 'simulation.place.clinic',
  lat: 6.1632,
  lon: 38.2012,
  kind: 'clinic',
}

/**
 * Homesteads on the slopes around town. The kebele names are real OSM localities (GeoDatabase
 * import); each home is placed on a track near that locality. The homes themselves are invented.
 */
export const HOMES: HomePlace[] = [
  // North slope, near Domorso (OSM node 1150887316).
  { id: 'home-domorso', nameKey: 'simulation.place.homeDomorso', lat: 6.1868, lon: 38.1996, kind: 'home', household: 'domorso' },
  // South, towards Konga (OSM node 1150972581 and 1150923029).
  { id: 'home-konga', nameKey: 'simulation.place.homeKonga', lat: 6.1352, lon: 38.2018, kind: 'home', household: 'konga' },
  // West slope, on the road towards Haru (OSM node 1150909930).
  { id: 'home-haru', nameKey: 'simulation.place.homeHaru', lat: 6.1586, lon: 38.1745, kind: 'home', household: 'haru' },
  // North-east, below Benk'O (OSM node 1150895460).
  { id: 'home-benko', nameKey: 'simulation.place.homeBenko', lat: 6.1985, lon: 38.2165, kind: 'home', household: 'benko' },
  // East, on the track towards Adido (OSM node 1150902165).
  { id: 'home-adido', nameKey: 'simulation.place.homeAdido', lat: 6.1527, lon: 38.2338, kind: 'home', household: 'adido' },
]

/** The far end of the northern slope route: the ridge below Benk'O (OSM node 1150895460). */
export const NORTH_RIDGE = { lat: 6.2085, lon: 38.2101 } as const

export const PLACES: Place[] = [ARICHA, ARICHA_WATER, MARKET, CLINIC, ...HOMES]

export function placeById(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id)
}

export function homeOf(household: string): HomePlace {
  const home = HOMES.find((h) => h.household === household)
  if (!home) throw new Error(`No home for household ${household}`)
  return home
}

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Compass bearing from a to b in degrees, 0 = north. */
export function bearingDeg(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const y = Math.sin(dLon) * Math.cos(la2)
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}
