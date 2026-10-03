// The tap panel (a paper slip above the nav) and the plain list of animals.
import { Link } from 'react-router'
import { recommendationText } from '../forecast'
import { useT } from '../i18n/LanguageContext'
import { DEMO_NOW, formatTime, MINUTE } from '../shared/lib/clock'
import { STATE_SHAPE, stateInk } from '../shared/tokens'
import { buttonClass, MonoLabel, Slip, Stamp, StateStamp } from '../shared/ui'
import type { MapAnimal } from './facts'

type T = (key: string, params?: Record<string, string | number>) => string

function duration(t: T, minutes: number): string {
  const m = Math.round(minutes)
  if (m < 60) return t('map.unit.min', { m })
  return t('map.unit.hMin', { h: Math.floor(m / 60), m: m % 60 })
}

/** Fixes older than this show how old they are. */
const STALE_FIX_MIN = 5

/** "Position at 14:20, 1.2 km north of the market." */
function positionText(t: T, item: MapAnimal, now: number): string {
  const fix = item.lastFix
  const w = item.where
  if (!fix || !w) return t('map.panel.positionNone')
  const min = Math.max(0, Math.round((now - fix.t) / MINUTE))
  const time = min >= STALE_FIX_MIN ? t('map.panel.timeAgo', { time: formatTime(fix.t), min }) : formatTime(fix.t)
  const place = t(w.placeKey)
  const where = w.at ? t('map.panel.whereAt', { place }) : t('map.panel.where', { km: w.km.toFixed(1), dir: t(w.dirKey), place })
  return t('map.panel.position', { time, where })
}

function climbFact(t: T, item: MapAnimal): string {
  const { count, longestM } = item.climbs
  const name = item.animal.name
  if (count === 0) return t('map.fact.climbsNone', { name })
  if (count === 1) return t('map.fact.climbsOne', { name, m: longestM })
  return t('map.fact.climbsMany', { name, n: count, m: longestM })
}

export interface MapPanelProps {
  item: MapAnimal
  onClose: () => void
  now?: number
  /** Inline in the page (no map) instead of floating over the map. */
  inline?: boolean
}

export function MapPanel({ item, onClose, now = DEMO_NOW, inline }: MapPanelProps) {
  const { t, lang } = useT()
  const { animal, assessment, today } = item
  const reason = assessment.reasons[0]
  const headingId = `map-panel-${animal.id}`
  return (
    <Slip
      as="section"
      className={['map-panel', inline ? 'map-panel--inline' : ''].filter(Boolean).join(' ')}
      aria-labelledby={headingId}
      data-animal={animal.id}
      padded={false}
    >
      <div className="map-panel-head">
        <div className="map-panel-titles">
          <h2 id={headingId} className="map-panel-name">
            {animal.name}
          </h2>
          <MonoLabel>{`${t(`shared.species.${animal.species}`)} · ${animal.tagId}`}</MonoLabel>
        </div>
        <StateStamp state={assessment.state} id={animal.id} />
        <button type="button" className="map-panel-close" onClick={onClose} aria-label={t('map.panel.close')}>
          <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div className="map-panel-body">
        {reason && <p className="map-panel-reason">{t(reason.textKey, reason.params)}</p>}
        {item.next && assessment.state !== 'normal' && (
          <p className="map-panel-next">
            <MonoLabel className="map-panel-next-label">{t('map.panel.next')}</MonoLabel>
            {recommendationText(item.next, lang)}
          </p>
        )}

        <dl className="map-panel-stats">
          <div>
            <dt>{t('map.panel.distance')}</dt>
            <dd>{t('map.unit.km', { n: today.distanceKm.toFixed(1) })}</dd>
          </div>
          <div>
            <dt>{t('map.panel.climb')}</dt>
            <dd>{t('map.unit.m', { n: Math.round(today.climbM) })}</dd>
          </div>
          <div>
            <dt>{t('map.panel.work')}</dt>
            <dd>{duration(t, today.workMin)}</dd>
          </div>
          <div>
            <dt>{t('map.panel.workload')}</dt>
            <dd>{Number.isFinite(today.workload) ? t('map.unit.of100', { n: Math.round(today.workload) }) : t('map.panel.workloadNone')}</dd>
          </div>
        </dl>

        <p className="map-panel-fact">
          {positionText(t, item, now)} {climbFact(t, item)}
        </p>
        {!inline && (
          <p className="map-legend">
            <span className="map-legend-route" aria-hidden="true" />
            <MonoLabel>{t('map.legend.route')}</MonoLabel>
          </p>
        )}
      </div>

      <div className="map-panel-foot">
        <Link to={`/animal/${animal.id}`} className={buttonClass('primary', true)}>
          {t('map.panel.caseFile')}
        </Link>
      </div>
    </Slip>
  )
}

export interface AnimalListProps {
  herd: readonly MapAnimal[]
  selectedId: string | null
  onSelect: (id: string) => void
  id?: string
  className?: string
}

/** The same animals as a list of buttons, for screen readers and anyone who cannot use the map. */
export function AnimalList({ herd, selectedId, onSelect, id, className }: AnimalListProps) {
  const { t } = useT()
  return (
    <Slip as="section" id={id} className={['map-list', className].filter(Boolean).join(' ')} aria-labelledby="map-list-h" padded={false}>
      <h2 id="map-list-h" className="map-list-heading">
        <MonoLabel>{t('map.list.heading')}</MonoLabel>
      </h2>
      <ul>
        {herd.map(({ animal, assessment }) => {
          const reason = assessment.reasons[0]
          return (
            <li key={animal.id}>
              <button
                type="button"
                className="map-list-item"
                aria-pressed={selectedId === animal.id}
                onClick={() => onSelect(animal.id)}
              >
                <Stamp shape={STATE_SHAPE[assessment.state]} size={24} ink={stateInk(assessment.state)} seed={`${animal.id}:${assessment.state}`} />
                <span className="map-list-text">
                  <span className="map-list-name">
                    {animal.name}
                    <span className="map-list-state" data-state={assessment.state}>
                      {t(`shared.state.${assessment.state}`)}
                    </span>
                  </span>
                  {reason && <span className="map-list-reason">{t(reason.textKey, reason.params)}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Slip>
  )
}
