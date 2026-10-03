// Map markers, drawn as HTML over the canvas: animals as state stamps with a name tab,
// places as small ink symbols on a square paper chip (never a state shape).
import type { CSSProperties } from 'react'
import { useT } from '../i18n/LanguageContext'
import { STATE_SHAPE, stateInk } from '../shared/tokens'
import type { Place, StateId } from '../shared/types'
import { Stamp } from '../shared/ui'
import { MARKER_HALF } from './declutter'

export interface AnimalMarkerProps {
  id: string
  name: string
  state: StateId
  /** Offset of the marker from its real position, px. A leader line points back. */
  dx: number
  dy: number
  /** Name tab on the left of the stamp, for markers near the right edge. */
  flip?: boolean
  selected: boolean
  onSelect: (id: string) => void
}

export function AnimalMarker({ id, name, state, dx, dy, flip = false, selected, onSelect }: AnimalMarkerProps) {
  const { t } = useT()
  const moved = dx !== 0 || dy !== 0
  // Flipped markers hang from their right edge, so the stamp stays on the point either way.
  const x = flip ? dx + MARKER_HALF : dx - MARKER_HALF
  const style = { transform: `translate(${x}px, ${dy - MARKER_HALF}px)` } as CSSProperties
  const hollow = STATE_SHAPE[state] === 'circle' || STATE_SHAPE[state] === 'dashedCircle'
  return (
    <div
      className={['map-mk', selected ? 'is-selected' : '', flip ? 'is-flipped' : ''].filter(Boolean).join(' ')}
      data-state={state}
      data-animal={id}
    >
      {moved && (
        <>
          <svg className="map-mk-leader" aria-hidden="true" focusable="false">
            <line x1={0} y1={0} x2={dx} y2={dy} />
          </svg>
          <span className="map-mk-dot" aria-hidden="true" />
        </>
      )}
      <button
        type="button"
        className="map-mk-btn"
        style={style}
        aria-pressed={selected}
        aria-label={t('map.marker.label', { name, state: t(`shared.state.${state}`) })}
        onClick={() => onSelect(id)}
      >
        <span className="map-mk-stamp">
          {hollow && <span className="map-mk-fill" aria-hidden="true" />}
          <Stamp shape={STATE_SHAPE[state]} size={28} ink={stateInk(state)} seed={`${id}:${state}`} />
        </span>
        <span className="map-mk-tab">{name}</span>
      </button>
    </div>
  )
}

/** Ink symbol for a place, 20 px, on a square paper chip. */
export function PlaceSymbol({ kind }: { kind: Place['kind'] }) {
  return (
    <svg className="map-pl-sym" width={20} height={20} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <rect x={1} y={1} width={18} height={18} rx={2.5} className="map-pl-chip" />
      <g className="map-pl-ink">
        {kind === 'home' && <path d="M5 10.2 10 5.6l5 4.6V15H5Z" />}
        {kind === 'washing_station' && <path d="M5 7h10M5 10h10M5 13h10" />}
        {kind === 'water' && <path d="M4.5 8.2c1.4-1.3 2.8-1.3 4.2 0s2.8 1.3 4.2 0 1.6-1.1 2.6-.4M4.5 12.4c1.4-1.3 2.8-1.3 4.2 0s2.8 1.3 4.2 0 1.6-1.1 2.6-.4" />}
        {kind === 'market' && <path d="M4.5 8.5h11M6 8.5V15M14 8.5V15M4.5 8.5 6 5.5h8l1.5 3" />}
        {kind === 'clinic' && <path d="M10 5.2v9.6M5.2 10h9.6" className="map-pl-cross" />}
      </g>
    </svg>
  )
}

export interface PlaceMarkerProps {
  place: Place
  label: string
  /** Label offset (top-left corner) from the point, or undefined when the label is hidden. */
  at?: { dx: number; dy: number }
  /** The symbol gives way to a nearby place that matters more. */
  hidden?: boolean
}

export function PlaceMarker({ place, label, at, hidden = false }: PlaceMarkerProps) {
  return (
    <div className="map-pl" data-kind={place.kind} data-place={place.id} hidden={hidden}>
      <PlaceSymbol kind={place.kind} />
      <span
        className="map-pl-label"
        style={at ? { transform: `translate(${at.dx}px, ${at.dy}px)` } : { visibility: 'hidden' }}
      >
        {label}
      </span>
    </div>
  )
}
