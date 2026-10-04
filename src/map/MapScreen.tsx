// The Map screen (DESIGN 9 "Map"): where each animal is, today's route over the terrain, and a
// paper slip for the animal you tap. Positions are simulated. When the offline tiles or WebGL are
// missing, the same animals stay usable as a plain list.
import { AttributionControl, Map as MapLibreMap, Marker, type GeoJSONSource, type LngLatLike } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router'
import { useT } from '../i18n/LanguageContext'
import { STATE_PRIORITY, type Place } from '../shared/types'
import { EmptyNote, HeaderStrip, Paper, RectStamp } from '../shared/ui'
import { PLACES } from '../simulation'
import { animalCandidates, declutter, placeLabelCandidates, STAMP_RESERVE, type Box, type PlaceItem, type Placement } from './declutter'
import { boundsOf, mapHerd, type MapAnimal } from './facts'
import { AnimalList, MapPanel } from './MapPanel'
import { AnimalMarker, PlaceMarker } from './markers'
import { ensureMapSources } from './offline'
import { buildMapStyle, DEMO_BOUNDS, DEMO_CENTER, DEMO_MAX_ZOOM, HILLSHADE_EXAGGERATION, MAP_INK, TERRAIN_EXAGGERATION } from './style'
import './map.css'

type Status = 'loading' | 'ready' | 'missing'

/** Camera tilt, so the slopes read. */
const PITCH = 57
/** A little flatter for the whole herd, so the animals spread out on screen. */
const OVERVIEW_PITCH = 50
const BEARING = -14
/** Zoom when the camera goes to one animal. */
const FOCUS_ZOOM = 14.4
/** Zoom for the whole herd at 360 px. */
const OVERVIEW_ZOOM = 12.7
/**
 * On a computer the map is large, so the camera tilts further and the relief is drawn a little
 * higher: the valleys and ridges the animals climb read at a glance.
 */
const WIDE = {
  pitch: 62,
  overviewPitch: 56,
  focusZoom: 14.2,
  terrain: 1.8,
  hillshade: 0.5,
} as const
/** Computers: the side panel holds the list and the slip, the nav is in the top bar. */
const WIDE_QUERY = '(min-width: 1024px)'
/** Size of a place symbol, px. */
const PLACE_SYMBOL = 20
/** Places drawn without a label: the town tap sits 80 m from the market. */
const UNLABELLED_PLACES = new Set(['town-tap'])

interface Hosts {
  animals: Record<string, HTMLElement>
  places: Record<string, HTMLElement>
}

interface Layout {
  animals: Map<string, Placement>
  /** Label placement per place. */
  places: Map<string, Placement>
  /** Places whose symbol gives way to a more useful one nearby. */
  hidden: Set<string>
}

const EMPTY_LAYOUT: Layout = { animals: new Map(), places: new Map(), hidden: new Set() }

/** Which place keeps its symbol when two crowd each other: water and help first. */
const PLACE_ORDER: Place['kind'][] = ['water', 'clinic', 'washing_station', 'market', 'home']

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function matches(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches
}

/** True on a computer screen. Follows the window as it is resized. */
function useWide(): boolean {
  const [wide, setWide] = useState(() => matches(WIDE_QUERY))
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(WIDE_QUERY)
    const on = () => setWide(mq.matches)
    on()
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return wide
}

function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function lngLat(item: MapAnimal): [number, number] | undefined {
  return item.lastFix ? [item.lastFix.lon, item.lastFix.lat] : undefined
}

interface LineFeature {
  type: 'Feature'
  properties: { id: string }
  geometry: { type: 'LineString'; coordinates: [number, number][] }
}
interface Lines {
  type: 'FeatureCollection'
  features: LineFeature[]
}

const EMPTY_LINES: Lines = { type: 'FeatureCollection', features: [] }

function routeFeature(item: MapAnimal | undefined): Lines {
  if (!item || item.route.length < 2) return EMPTY_LINES
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: { id: item.animal.id }, geometry: { type: 'LineString', coordinates: item.route } }],
  }
}

/** Faint routes of the whole herd, the selected route as a dashed pencil line. Under the labels. */
function addRouteLayers(map: MapLibreMap, herd: readonly MapAnimal[]) {
  const before = map.getStyle().layers.find((l) => l.type === 'symbol')?.id
  map.addSource('routes-all', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: herd
        .filter((h) => h.route.length > 1)
        .map((h) => ({ type: 'Feature', properties: { id: h.animal.id }, geometry: { type: 'LineString', coordinates: h.route } })),
    },
  })
  map.addSource('route-selected', { type: 'geojson', data: EMPTY_LINES })
  const round = { 'line-join': 'round', 'line-cap': 'round' } as const
  map.addLayer(
    {
      id: 'routes-all',
      type: 'line',
      source: 'routes-all',
      layout: round,
      paint: { 'line-color': MAP_INK.graphite, 'line-width': 1.1, 'line-opacity': 0.3 },
    },
    before,
  )
  map.addLayer(
    {
      id: 'route-selected-casing',
      type: 'line',
      source: 'route-selected',
      layout: round,
      paint: { 'line-color': MAP_INK.highlight, 'line-width': 5.5, 'line-opacity': 0.9 },
    },
    before,
  )
  map.addLayer(
    {
      id: 'route-selected',
      type: 'line',
      source: 'route-selected',
      layout: { 'line-join': 'round', 'line-cap': 'butt' },
      paint: { 'line-color': MAP_INK.ink, 'line-width': 2.2, 'line-dasharray': [2.2, 1.6] },
    },
    before,
  )
}

const NO_PADDING = { top: 0, bottom: 0, left: 0, right: 0 }
/** Room around the herd in the overview: the tools on top, the attribution below. */
const FIT_PADDING = { top: 84, bottom: 34, left: 26, right: 26 }

interface Camera {
  center: [number, number]
  zoom: number
}

/**
 * The closest tilted view that shows every point. fitBounds ignores the tilt, so this searches
 * the zoom with the real camera and centres the points in the free area. Leaves the map there.
 */
function fitPoints(map: MapLibreMap, points: readonly [number, number][], pitch: number): Camera {
  const el = map.getContainer()
  const w = el.clientWidth
  const h = el.clientHeight
  const p = FIT_PADDING
  const screen = () => points.map((pt) => map.project(pt))
  const fits = () => screen().every((s) => s.x >= p.left && s.x <= w - p.right && s.y >= p.top && s.y <= h - p.bottom)
  const c0 = map.getCenter()
  let center: [number, number] = [c0.lng, c0.lat]
  let zoom = map.getZoom()
  for (let pass = 0; pass < 2; pass++) {
    let lo = 10
    let hi = DEMO_MAX_ZOOM
    for (let i = 0; i < 12; i++) {
      const z = (lo + hi) / 2
      map.jumpTo({ center, zoom: z, pitch, bearing: BEARING, padding: NO_PADDING })
      if (fits()) lo = z
      else hi = z
    }
    zoom = lo
    map.jumpTo({ center, zoom, pitch, bearing: BEARING, padding: NO_PADDING })
    const pts = screen()
    const mx = (Math.min(...pts.map((s) => s.x)) + Math.max(...pts.map((s) => s.x))) / 2
    const my = (Math.min(...pts.map((s) => s.y)) + Math.max(...pts.map((s) => s.y))) / 2
    const now = map.project(center)
    const next = map.unproject([now.x + mx - (p.left + w - p.right) / 2, now.y + my - (p.top + h - p.bottom) / 2])
    center = [next.lng, next.lat]
  }
  map.jumpTo({ center, zoom, pitch, bearing: BEARING, padding: NO_PADDING })
  return { center, zoom }
}

/** A folded paper map, for the missing-tiles note. Printed in halftone by EmptyNote. */
function FoldedMap() {
  return (
    <svg viewBox="0 0 72 56" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round">
      <path d="M4 10 24 4l24 6 20-6v42l-20 6-24-6L4 52Z" fill="currentColor" fillOpacity={0.25} />
      <path d="M24 4v42M48 10v42" />
      <path d="M10 36c6-6 10 2 16-4s10-12 16-6 12 2 18-4" strokeDasharray="3 3" />
    </svg>
  )
}

export default function MapScreen() {
  const { t, lang } = useT()
  const herd = useMemo(() => mapHerd(), [])
  const byId = useMemo(() => new Map(herd.map((h) => [h.animal.id, h])), [herd])
  const herdPoints = useMemo(
    () =>
      herd.flatMap((h) => {
        const p = lngLat(h)
        return p ? [p] : []
      }),
    [herd],
  )
  const startCenter = useMemo<[number, number]>(() => {
    const b = boundsOf(herdPoints.map(([lon, lat]) => ({ lon, lat })))
    return b ? [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2] : DEMO_CENTER
  }, [herdPoints])
  const urgentId = herd.find((h) => h.assessment.state === 'urgent')?.animal.id ?? null

  // Selection: ?animal= wins; otherwise the first URGENT animal, until the panel is closed.
  const [params, setParams] = useSearchParams()
  const paramId = params.get('animal')
  const [dismissed, setDismissed] = useState(false)
  const selectedId = paramId && byId.has(paramId) ? paramId : dismissed ? null : urgentId
  const selected = selectedId ? byId.get(selectedId) : undefined

  const [listOpen, setListOpen] = useState(false)
  const [status, setStatus] = useState<Status>(() => (webglAvailable() ? 'loading' : 'missing'))
  const [hosts, setHosts] = useState<Hosts | null>(null)
  const [layout, setLayout] = useState<Layout>(EMPTY_LAYOUT)
  const [top, setTop] = useState(64)
  const wide = useWide()
  const wideRef = useRef(wide)
  useEffect(() => {
    wideRef.current = wide
  }, [wide])

  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  // The same marker hosts as the state, for imperative styling (z-index) outside render.
  const hostsRef = useRef<Hosts | null>(null)
  const relayoutRef = useRef<() => void>(() => {})
  const overviewRef = useRef<Camera>({ center: startCenter, zoom: OVERVIEW_ZOOM })

  const select = useCallback(
    (id: string) => {
      setListOpen(false)
      setParams({ animal: id }, { replace: true })
    },
    [setParams],
  )
  const close = useCallback(() => {
    setDismissed(true)
    setParams({}, { replace: true })
  }, [setParams])

  // The map fills the space between the top bar and the bottom nav.
  useLayoutEffect(() => {
    const measure = () => {
      const el = rootRef.current
      if (el) setTop(Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY)))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [lang, status, wide])

  // Create the map once per language; remove it (and every marker) on unmount.
  useEffect(() => {
    const container = canvasRef.current
    if (!container) return
    let cancelled = false
    let map: MapLibreMap | undefined
    const markers: Marker[] = []
    ensureMapSources()
      .then(() => {
        if (cancelled) return
        setStatus('loading')
        try {
          map = new MapLibreMap({
            container,
            style: buildMapStyle({ lang }),
            center: startCenter,
            zoom: OVERVIEW_ZOOM,
            pitch: wideRef.current ? WIDE.overviewPitch : OVERVIEW_PITCH,
            bearing: BEARING,
            maxBounds: DEMO_BOUNDS,
            maxZoom: DEMO_MAX_ZOOM,
            maxPitch: 70,
            attributionControl: false,
          })
        } catch {
          setStatus('missing')
          return
        }
        const m = map
        mapRef.current = m
        m.addControl(new AttributionControl({ compact: false }), 'bottom-right')

        const animals: Record<string, HTMLElement> = {}
        for (const h of herd) {
          const at = lngLat(h)
          if (!at) continue
          const el = document.createElement('div')
          el.className = 'map-host map-host--animal'
          markers.push(new Marker({ element: el, anchor: 'center', opacityWhenCovered: '0.6' }).setLngLat(at).addTo(m))
          animals[h.animal.id] = el
        }
        const places: Record<string, HTMLElement> = {}
        for (const p of PLACES) {
          const el = document.createElement('div')
          el.className = 'map-host map-host--place'
          el.setAttribute('aria-hidden', 'true')
          markers.push(new Marker({ element: el, anchor: 'center', opacityWhenCovered: '0.4' }).setLngLat([p.lon, p.lat]).addTo(m))
          places[p.id] = el
        }
        hostsRef.current = { animals, places }
        setHosts(hostsRef.current)

        m.on('load', () => {
          if (cancelled) return
          addRouteLayers(m, herd)
          if (herdPoints.length) {
            overviewRef.current = fitPoints(m, herdPoints, wideRef.current ? WIDE.overviewPitch : OVERVIEW_PITCH)
          }
          setStatus('ready')
        })
        m.on('moveend', () => relayoutRef.current())
        m.on('idle', () => {
          container.dataset.idle = 'true'
          relayoutRef.current()
        })
        m.on('movestart', () => {
          delete container.dataset.idle
        })
      })
      .catch(() => {
        if (!cancelled) setStatus('missing')
      })
    return () => {
      cancelled = true
      for (const mk of markers) mk.remove()
      map?.remove()
      mapRef.current = null
      hostsRef.current = null
      setHosts(null)
      setLayout(EMPTY_LAYOUT)
    }
  }, [lang, herd, herdPoints, startCenter])

  // Keep markers apart: the selected animal first, then by state, then places' labels.
  const relayout = useCallback(() => {
    const map = mapRef.current
    const live = hostsRef.current
    if (!map || !hosts || !live) return
    const order = [...herd].sort(
      (a, b) =>
        Number(b.animal.id === selectedId) - Number(a.animal.id === selectedId) ||
        STATE_PRIORITY[b.assessment.state] - STATE_PRIORITY[a.assessment.state],
    )
    const animalItems: PlaceItem[] = []
    for (const h of order) {
      const at = lngLat(h)
      const el = hosts.animals[h.animal.id]
      if (!at || !el) continue
      const p = map.project(at)
      const width = el.querySelector<HTMLElement>('.map-mk-btn')?.offsetWidth || 96
      animalItems.push({
        id: h.animal.id,
        x: p.x,
        y: p.y,
        candidates: animalCandidates(width),
        required: true,
        reserve: STAMP_RESERVE,
      })
    }
    const box = map.getContainer()
    const viewport: Box = { left: 4, top: 4, right: box.clientWidth - 4, bottom: box.clientHeight - 16 }
    const animals = declutter(animalItems, [], viewport)
    // Moved markers sit under the ones on their real spot, so a leader dot never shows through
    // a stamp. The selected animal is always on top.
    for (const h of herd) {
      const el = live.animals[h.animal.id]
      const pl = animals.get(h.animal.id)
      if (!el || !pl) continue
      const moved = pl.dx !== 0 || pl.dy !== 0
      const z = h.animal.id === selectedId ? 40 : (moved ? 10 : 20) + STATE_PRIORITY[h.assessment.state]
      el.style.zIndex = String(z)
    }
    // Place symbols only give way to each other, most useful first; labels give way to everything.
    const half = PLACE_SYMBOL / 2
    const symbolBox: Box = { left: -half, top: -half, right: half, bottom: half }
    const rank = (p: Place) => (UNLABELLED_PLACES.has(p.id) ? PLACE_ORDER.length : PLACE_ORDER.indexOf(p.kind))
    const ordered = [...PLACES].sort((a, b) => rank(a) - rank(b))
    const projected = new Map(ordered.map((place) => [place.id, map.project([place.lon, place.lat])]))
    const symbols = declutter(
      ordered.map((place) => {
        const p = projected.get(place.id)!
        return { id: place.id, x: p.x, y: p.y, candidates: [{ dx: 0, dy: 0, box: symbolBox }], required: false }
      }),
    )
    const obstacles: Box[] = [...animals.values(), ...symbols.values()].flatMap((pl) => (pl.box ? [pl.box] : []))
    const placeItems: PlaceItem[] = []
    for (const place of ordered) {
      const el = hosts.places[place.id]
      const p = projected.get(place.id)!
      if (!el || !symbols.get(place.id)?.box) continue
      if (UNLABELLED_PLACES.has(place.id)) continue
      const label = el.querySelector<HTMLElement>('.map-pl-label')
      placeItems.push({
        id: place.id,
        x: p.x,
        y: p.y,
        candidates: placeLabelCandidates(label?.offsetWidth || 80, label?.offsetHeight || 16, half),
        required: false,
      })
    }
    const places = declutter(placeItems, obstacles, viewport)
    const hidden = new Set([...symbols].filter(([, pl]) => !pl.box).map(([id]) => id))
    setLayout({ animals, places, hidden })
  }, [herd, hosts, selectedId])
  useLayoutEffect(() => {
    relayoutRef.current = relayout
    relayout()
  }, [relayout])

  // Today's route of the selected animal.
  useEffect(() => {
    const map = mapRef.current
    if (status !== 'ready' || !map) return
    const source = map.getSource<GeoJSONSource>('route-selected')
    source?.setData(routeFeature(selected))
  }, [status, selected])

  // Relief: a little higher on a computer, where the map is large enough to show it.
  useEffect(() => {
    const map = mapRef.current
    if (status !== 'ready' || !map) return
    try {
      if (map.getTerrain()) map.setTerrain({ source: 'terrain', exaggeration: wide ? WIDE.terrain : TERRAIN_EXAGGERATION })
      if (map.getLayer('hillshade')) {
        map.setPaintProperty('hillshade', 'hillshade-exaggeration', wide ? WIDE.hillshade : HILLSHADE_EXAGGERATION)
      }
    } catch {
      // The style is not ready yet; the defaults from style.ts stay.
    }
  }, [status, wide])

  // Move the camera to the selected animal. On a phone it sits above the panel; on a computer
  // the panel is beside the map. Jump when motion is reduced.
  useEffect(() => {
    const map = mapRef.current
    const at = selected && lngLat(selected)
    if (status !== 'ready' || !map || !at) return
    const mapH = map.getContainer().clientHeight
    const panelH = panelRef.current?.offsetHeight ?? 0
    const padding = wide
      ? { top: 72, bottom: 40, left: 48, right: 48 }
      : { top: 64, bottom: Math.round(Math.min(panelH + 8, mapH * 0.62)), left: 16, right: 16 }
    const camera = {
      center: at as LngLatLike,
      zoom: wide ? WIDE.focusZoom : FOCUS_ZOOM,
      pitch: wide ? WIDE.pitch : PITCH,
      bearing: map.getBearing(),
      padding,
    }
    if (reducedMotion()) map.jumpTo(camera)
    else map.flyTo({ ...camera, duration: 2200, essential: false })
  }, [status, selected, wide])

  const showAll = useCallback(() => {
    const map = mapRef.current
    setListOpen(false)
    setDismissed(true)
    setParams({}, { replace: true })
    if (!map) return
    const pitch = wideRef.current ? WIDE.overviewPitch : OVERVIEW_PITCH
    const camera = { ...overviewRef.current, pitch, bearing: BEARING, padding: NO_PADDING }
    if (reducedMotion()) map.jumpTo(camera)
    else map.flyTo({ ...camera, duration: 1600, essential: false })
  }, [setParams])

  const header = (
    <HeaderStrip
      title={t('shared.screen.map')}
      id="map-header"
      className="map-header"
      aside={<RectStamp kind="simulated" id="map-sim" />}
    >
      <p className="ui-label map-area">{t('map.area')}</p>
      {wide && status !== 'missing' && <p className="map-note map-note--side">{t('map.positions')}</p>}
    </HeaderStrip>
  )

  if (status === 'missing') {
    return (
      <Paper className="map-fallback">
        {header}
        <EmptyNote drawing={<FoldedMap />}>{t('map.offline.missing')}</EmptyNote>
        <div className="map-fallback-cols">
          {selected && <MapPanel item={selected} onClose={close} inline />}
          <AnimalList herd={herd} selectedId={selectedId} onSelect={select} />
        </div>
        <p className="map-note">{t('map.positions')}</p>
      </Paper>
    )
  }

  const style = { '--map-top': `${top}px` } as CSSProperties
  // One tree for both layouts, so the map canvas is never remounted when the window crosses the
  // computer breakpoint. On a phone .map-side is display: contents.
  return (
    <Paper width="full" nav={false} className="map-page">
      <div className={['map-screen', wide ? 'map-screen--wide' : ''].filter(Boolean).join(' ')} ref={rootRef} style={style}>
        <div className="map-side">
          {header}
          {wide && <AnimalList id="map-list" className="map-list--side" herd={herd} selectedId={selectedId} onSelect={select} />}
          {wide && selected && (
            <div className="map-dock" ref={panelRef}>
              <MapPanel item={selected} onClose={close} docked />
            </div>
          )}
        </div>
        <div className="map-stage">
          <div ref={canvasRef} className="map-canvas" role="region" aria-label={t('map.region')} data-status={status} />
          {status === 'loading' && <p className="map-loading">{t('map.offline.loading')}</p>}
          <div className="map-tools">
            <button type="button" className="map-tool" onClick={showAll}>
              {t('map.showAll')}
            </button>
            {!wide && (
              <button
                type="button"
                className="map-tool"
                aria-pressed={listOpen}
                aria-controls="map-list"
                onClick={() => setListOpen((v) => !v)}
              >
                {t('map.list.toggle')}
              </button>
            )}
          </div>
          {!wide && listOpen && (
            <AnimalList id="map-list" className="map-list--over" herd={herd} selectedId={selectedId} onSelect={select} />
          )}
          {!wide && selected && !listOpen && (
            <div className="map-panel-wrap" ref={panelRef}>
              <MapPanel item={selected} onClose={close} />
            </div>
          )}
        </div>
      </div>
      {hosts &&
        herd.map((h) => {
          const el = hosts.animals[h.animal.id]
          if (!el) return null
          const pl = layout.animals.get(h.animal.id)
          return createPortal(
            <AnimalMarker
              id={h.animal.id}
              name={h.animal.name}
              state={h.assessment.state}
              dx={pl?.dx ?? 0}
              dy={pl?.dy ?? 0}
              flip={pl?.flip ?? false}
              selected={h.animal.id === selectedId}
              onSelect={select}
            />,
            el,
            h.animal.id,
          )
        })}
      {hosts &&
        PLACES.map((p) => {
          const el = hosts.places[p.id]
          if (!el) return null
          const pl = layout.places.get(p.id)
          return createPortal(
            <PlaceMarker
              place={p}
              label={capitalise(t(p.nameKey))}
              at={pl && pl.index >= 0 ? pl : undefined}
              hidden={layout.hidden.has(p.id)}
            />,
            el,
            p.id,
          )
        })}
    </Paper>
  )
}
