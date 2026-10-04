// MapLibre style for the offline paper map (DESIGN 9 "Map").
// Ink on warm paper, hillshade in graphite, 3D terrain. No colour here: blue, green, ochre and
// red belong to the five states and are drawn by the markers, never by the base map.
import { layers, namedFlavor, type Flavor } from '@protomaps/basemaps'
import type { LayerSpecification, StyleSpecification } from 'maplibre-gl'

/** File names inside public/maps/. offline.ts registers them under the same keys. */
export const MAP_FILES = {
  basemap: 'yirgacheffe.pmtiles',
  dem: 'dem.pmtiles',
} as const

/** Demo area: Yirgacheffe town centre, Gedeo zone, Ethiopia. [lon, lat]. */
export const DEMO_CENTER: [number, number] = [38.205, 6.162]
/** The extract covers this box only. Use it as maxBounds. [[west, south], [east, north]]. */
export const DEMO_BOUNDS: [[number, number], [number, number]] = [
  [38.11, 6.07],
  [38.29, 6.25],
]
export const DEMO_MAX_ZOOM = 15
export const DEM_MAX_ZOOM = 12

export const MAP_ATTRIBUTION = '© OpenStreetMap contributors, Protomaps, Mapterhorn, Copernicus'

/** Paper and ink values for the map. Paper family of DESIGN 4, nothing else. */
export const MAP_INK = {
  paper: '#F5F0E6',
  land: '#EFE6D2',
  landDark: '#EAE0CA',
  landDarker: '#E6DBC2',
  built: '#E9DFC9',
  building: '#D5C7A9',
  water: '#B9C3B5',
  waterLine: '#8F9C8D',
  ink: '#1F1C17',
  road: '#3B3A36',
  roadMinor: '#6B665C',
  roadFaint: '#8A8478',
  graphite: '#57524A',
  boundary: '#9A9384',
  shadow: '#3B3A36',
  highlight: '#FBF7EE',
  accent: '#6B665C',
} as const

export const TERRAIN_EXAGGERATION = 1.4
export const HILLSHADE_EXAGGERATION = 0.35

const FONT_REGULAR = 'Noto Sans Regular'
const FONT_MEDIUM = 'Noto Sans Medium'

function paperFlavor(): Flavor {
  const c = MAP_INK
  return {
    ...namedFlavor('light'),
    background: c.land,
    earth: c.land,
    park_a: c.landDark,
    park_b: c.landDarker,
    wood_a: c.landDark,
    wood_b: c.landDarker,
    scrub_a: c.landDark,
    scrub_b: c.landDark,
    hospital: c.built,
    industrial: c.built,
    school: c.built,
    pedestrian: c.built,
    zoo: c.landDark,
    military: c.built,
    glacier: c.paper,
    sand: c.built,
    beach: c.built,
    aerodrome: c.built,
    runway: c.landDarker,
    water: c.water,
    pier: c.built,
    buildings: c.building,

    tunnel_other_casing: c.land,
    tunnel_minor_casing: c.land,
    tunnel_link_casing: c.land,
    tunnel_major_casing: c.land,
    tunnel_highway_casing: c.land,
    tunnel_other: c.roadFaint,
    tunnel_minor: c.roadFaint,
    tunnel_link: c.roadMinor,
    tunnel_major: c.roadMinor,
    tunnel_highway: c.roadMinor,

    minor_service_casing: c.land,
    minor_casing: c.land,
    link_casing: c.land,
    major_casing_late: c.land,
    highway_casing_late: c.land,
    major_casing_early: c.land,
    highway_casing_early: c.land,
    other: c.roadFaint,
    minor_service: c.roadFaint,
    minor_a: c.roadMinor,
    minor_b: c.roadMinor,
    link: c.road,
    major: c.road,
    highway: c.ink,
    railway: c.graphite,
    boundaries: c.boundary,

    bridges_other_casing: c.land,
    bridges_minor_casing: c.land,
    bridges_link_casing: c.land,
    bridges_major_casing: c.land,
    bridges_highway_casing: c.land,
    bridges_other: c.roadFaint,
    bridges_minor: c.roadMinor,
    bridges_link: c.road,
    bridges_major: c.road,
    bridges_highway: c.ink,

    roads_label_minor: c.graphite,
    roads_label_minor_halo: c.paper,
    roads_label_major: c.graphite,
    roads_label_major_halo: c.paper,
    ocean_label: c.graphite,
    subplace_label: c.graphite,
    subplace_label_halo: c.paper,
    city_label: c.ink,
    city_label_halo: c.paper,
    state_label: c.graphite,
    state_label_halo: c.paper,
    country_label: c.graphite,
    address_label: c.graphite,
    address_label_halo: c.paper,

    regular: FONT_REGULAR,
    bold: FONT_MEDIUM,
    // We ship no italic face. Water labels use the regular one.
    italic: FONT_REGULAR,
    pois: undefined,
    landcover: {
      barren: c.land,
      farmland: c.land,
      forest: c.landDark,
      glacier: c.paper,
      grassland: c.land,
      scrub: c.landDark,
      urban_area: c.built,
    },
  }
}

// Layers that need a sprite (we ship none) or add clutter the health worker does not need.
const DROPPED_LAYERS = new Set(['roads_oneway', 'roads_shields', 'pois', 'address_label'])

/** Thin ink line widths per road class, in px by zoom. No casings anywhere. */
function roadWidth(id: string): unknown[] | number | undefined {
  const w = (z11: number, z13: number, z15: number, z18: number) => [
    'interpolate',
    ['exponential', 1.5],
    ['zoom'],
    11,
    z11,
    13,
    z13,
    15,
    z15,
    18,
    z18,
  ]
  if (/highway/.test(id)) return w(0.8, 1.1, 1.6, 3)
  if (/major|link/.test(id)) return w(0.6, 0.9, 1.3, 2.4)
  if (/minor_service|other|pier/.test(id)) return w(0, 0.2, 0.5, 1.2)
  if (/minor/.test(id)) return w(0.2, 0.45, 0.8, 1.6)
  if (/rail/.test(id)) return w(0.4, 0.6, 0.8, 1.2)
  return undefined
}

function inkLayers(lang: 'en' | 'am'): LayerSpecification[] {
  // The labels ask for a Devanagari face for Devanagari names. We ship only Noto Sans.
  const base = JSON.parse(
    JSON.stringify(layers('protomaps', paperFlavor(), { lang })).replace(
      /Noto Sans Devanagari Regular v1/g,
      FONT_REGULAR,
    ),
  ) as LayerSpecification[]
  const out: LayerSpecification[] = []
  for (const layer of base) {
    if (DROPPED_LAYERS.has(layer.id)) continue
    if (layer.id.includes('casing')) continue
    if (layer.type === 'line' && layer.id.startsWith('roads_') && !/runway|taxiway/.test(layer.id)) {
      const width = roadWidth(layer.id)
      const paint = { ...layer.paint } as Record<string, unknown>
      if (width !== undefined) paint['line-width'] = width
      paint['line-opacity'] = /tunnel/.test(layer.id) ? 0.5 : 0.9
      out.push({ ...layer, paint } as LayerSpecification)
      continue
    }
    if (layer.id === 'buildings') {
      out.push({ ...layer, paint: { 'fill-color': MAP_INK.building, 'fill-opacity': 0.55 } } as LayerSpecification)
      continue
    }
    if (layer.id === 'water_stream' || layer.id === 'water_river') {
      const paint = { ...layer.paint, 'line-color': MAP_INK.waterLine } as Record<string, unknown>
      out.push({ ...layer, paint } as LayerSpecification)
      continue
    }
    if (layer.type === 'symbol') {
      const paint = { ...layer.paint } as Record<string, unknown>
      paint['text-halo-width'] = 1.6
      paint['text-halo-blur'] = 0.4
      // No sprite: drop town dots and any other icon.
      const layout = { ...layer.layout } as Record<string, unknown>
      for (const key of Object.keys(layout)) if (key.startsWith('icon-')) delete layout[key]
      out.push({ ...layer, layout, paint } as LayerSpecification)
      continue
    }
    out.push(layer)
  }

  // Hillshade sits on the land and water fills, under roads and labels.
  const hillshade: LayerSpecification = {
    id: 'hillshade',
    type: 'hillshade',
    source: 'hillshade',
    paint: {
      'hillshade-shadow-color': MAP_INK.shadow,
      'hillshade-highlight-color': MAP_INK.highlight,
      'hillshade-accent-color': MAP_INK.accent,
      'hillshade-exaggeration': HILLSHADE_EXAGGERATION,
      'hillshade-illumination-direction': 315,
      'hillshade-illumination-anchor': 'viewport',
    },
  }
  const after = Math.max(
    out.findIndex((l) => l.id === 'landuse_pier'),
    out.findIndex((l) => l.id === 'water_river'),
  )
  out.splice(after + 1, 0, hillshade)
  return out
}

export interface MapStyleOptions {
  /** Label language. Amharic falls back to English, then to the local name. */
  lang?: 'en' | 'am'
  /**
   * Absolute URL of the app root, ending in "/". Glyph requests run in a web worker, so the
   * glyph URL must be absolute. Defaults to the page origin plus Vite's BASE_URL.
   */
  baseUrl?: string
  /** Turn 3D terrain off, e.g. on slow phones. The hillshade stays. */
  terrain?: boolean
}

function defaultBaseUrl(): string {
  const base = import.meta.env.BASE_URL ?? '/'
  if (typeof window === 'undefined') return `http://localhost${base}`
  return new URL(base, window.location.href).href
}

/**
 * The offline paper map style. Call `ensureMapSources()` from offline.ts before giving this
 * style to a map, so the pmtiles:// sources resolve from the saved files.
 */
export function buildMapStyle(options: MapStyleOptions = {}): StyleSpecification {
  const { lang = 'en', terrain = true } = options
  const baseUrl = options.baseUrl ?? defaultBaseUrl()
  const dem = {
    type: 'raster-dem' as const,
    url: `pmtiles://${MAP_FILES.dem}`,
    tileSize: 512,
    encoding: 'terrarium' as const,
    maxzoom: DEM_MAX_ZOOM,
  }
  return {
    version: 8,
    name: 'Equora paper',
    center: DEMO_CENTER,
    zoom: 13,
    glyphs: `${baseUrl}maps/fonts/{fontstack}/{range}.pbf`,
    sources: {
      protomaps: {
        type: 'vector',
        url: `pmtiles://${MAP_FILES.basemap}`,
        attribution: MAP_ATTRIBUTION,
      },
      // Two DEM sources on the same file, as in the MapLibre 3D terrain example: one feeds the
      // terrain mesh, the other the hillshade layer.
      terrain: { ...dem },
      hillshade: { ...dem },
    },
    ...(terrain ? { terrain: { source: 'terrain', exaggeration: TERRAIN_EXAGGERATION } } : {}),
    sky: {
      'sky-color': MAP_INK.paper,
      'horizon-color': MAP_INK.paper,
      'fog-color': MAP_INK.land,
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.6,
      'fog-ground-blend': 0.75,
      'atmosphere-blend': 0,
    },
    layers: inkLayers(lang),
  }
}
