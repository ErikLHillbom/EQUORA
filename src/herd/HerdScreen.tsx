// Herd home: which animal to visit first, the herd at a glance, and every animal as a paper slip
// (DESIGN 9). Colour appears only where an animal departs from its normal.
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { recommendationText } from '../forecast'
import { useT } from '../i18n/LanguageContext'
import { canUse3D, stillUrl } from '../landing/models'
import { formatDate, formatTime, MINUTE } from '../shared/lib/clock'
import { STATE_SHAPE, stateInk } from '../shared/tokens'
import { STATE_PRIORITY, STATES, type Pose, type Species, type StateId } from '../shared/types'
import {
  buttonClass,
  CoordinateBlock,
  HeaderStrip,
  Paper,
  PencilCircle,
  PostureDrawing,
  RectStamp,
  Slip,
  Stamp,
  StateStamp,
  StitchDivider,
} from '../shared/ui'
import { COMPACT_HERD_SIZE, firstRecommendation, herdData, STALE_AFTER_MS, type HerdRow } from './herdData'
import './herd.css'

const HorseScene = lazy(() => import('../landing/HorseScene'))

/** Counts shown left to right: calm first, then rising concern. */
const COUNT_ORDER: readonly StateId[] = ['normal', 'water', 'check', 'urgent', 'not_sure']

type Translate = (key: string, params?: Record<string, string | number>) => string

function updatedText(t: Translate, lastUpdate: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - lastUpdate) / MINUTE))
  if (minutes < 1) return t('herd.card.updatedNow')
  if (minutes < 120) return t('herd.card.updatedMin', { minutes })
  return t('herd.card.updatedHours', { hours: Math.round(minutes / 60) })
}

function firstReason(row: HerdRow, t: Translate): string {
  const r = row.assessment.reasons[0]
  return r ? t(r.textKey, r.params) : ''
}

export default function HerdScreen() {
  const { t } = useT()
  const data = herdData()
  const { rows, now } = data
  const first = rows[0]
  const [params, setParams] = useSearchParams()
  const filterParam = params.get('state')
  const filter = STATES.includes(filterParam as StateId) ? (filterParam as StateId) : null

  const counts = Object.fromEntries(STATES.map((s) => [s, 0])) as Record<StateId, number>
  for (const r of rows) counts[r.assessment.state]++

  // Scroll to the list when a count is chosen.
  useEffect(() => {
    if (filter) document.getElementById('herd-animals')?.scrollIntoView({ block: 'start' })
  }, [filter])

  const shown = filter ? rows.filter((r) => r.assessment.state === filter) : rows
  // One pencil circle per screen: the first animal that departs from normal.
  const circled = rows.find((r) => r.assessment.state !== 'normal')?.animal.id
  const compact = rows.length > COMPACT_HERD_SIZE

  return (
    <Paper className="herd">
      <HeaderStrip
        title={t('shared.app.name')}
        kicker={t('herd.kicker')}
        id="herd-header"
        aside={<RectStamp kind="simulated" id="herd-sim" />}
      >
        <CoordinateBlock
          label={t('herd.coords.label')}
          cells={['6.162 N', '38.205 E', t('herd.coords.town'), t('herd.coords.zone'), formatDate(now), t('herd.coords.time', { time: formatTime(now) })]}
        />
      </HeaderStrip>

      {first && <FirstVisit row={first} now={now} />}

      <section aria-labelledby="herd-counts-h" className="herd-counts">
        <h2 id="herd-counts-h" className="ui-label herd-label">
          {t('herd.counts.heading')}
        </h2>
        <ul className="herd-counts__list">
          {COUNT_ORDER.map((s) => (
            <li key={s}>
              <CountItem state={s} count={counts[s]} active={filter === s} />
            </li>
          ))}
        </ul>
      </section>

      <StitchDivider />

      <section aria-labelledby="herd-animals-h" id="herd-animals" className="herd-list">
        <div className="herd-list__head">
          <h2 id="herd-animals-h" className="herd-h2">
            {t('herd.list.heading')}
          </h2>
          <p className="herd-note">{t('herd.list.note', { count: rows.length })}</p>
        </div>
        {filter && (
          <div className="herd-filter">
            <p>{t('herd.counts.filtered', { state: t(`shared.state.${filter}`) })}</p>
            <button
              type="button"
              className={buttonClass('secondary')}
              onClick={() => {
                const next = new URLSearchParams(params)
                next.delete('state')
                setParams(next)
              }}
            >
              {t('herd.counts.showAll')}
            </button>
          </div>
        )}
        {shown.length === 0 ? (
          <p className="herd-note">{t('herd.list.empty')}</p>
        ) : (
          <ul className={compact ? 'herd-cards herd-cards--compact' : 'herd-cards'}>
            {shown.map((row) => (
              <li key={row.animal.id}>
                {row.animal.id === circled ? (
                  <PencilCircle id={row.animal.id} state={row.assessment.state}>
                    <AnimalCard row={row} now={now} compact={compact} />
                  </PencilCircle>
                ) : (
                  <AnimalCard row={row} now={now} compact={compact} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="herd-why">
        <Link to="/why" className={buttonClass('tertiary')}>
          {t('herd.why')}
        </Link>
      </p>
    </Paper>
  )
}

function FirstVisit({ row, now }: { row: HerdRow; now: number }) {
  const { t, lang } = useT()
  const { animal, assessment } = row
  const calm = STATE_PRIORITY[assessment.state] === 0
  const rec = useMemo(() => (calm ? undefined : firstRecommendation(animal.id, now)), [animal.id, now, calm])
  const label = t('herd.first.drawing', { name: animal.name, pose: t(`shared.pose.${assessment.pose}`).toLowerCase() })
  return (
    <section aria-labelledby="herd-first-h" className="herd-first">
      <h2 id="herd-first-h" className="ui-label herd-label">
        {calm ? t('herd.first.calm') : t('herd.first.heading')}
      </h2>
      <AnimalFigure species={animal.species} pose={assessment.pose} label={label} />
      <Slip className="herd-first__slip">
        <div className="herd-first__head">
          <StateStamp state={assessment.state} size="large" id={animal.id} />
          <div className="herd-first__who">
            <h3 className="herd-first__name">{animal.name}</h3>
            <p className="herd-ids">{t('herd.card.ids', { species: t(`shared.species.${animal.species}`), tag: animal.tagId })}</p>
            <p className="herd-ids">{updatedText(t, assessment.lastUpdate, now)}</p>
          </div>
        </div>
        <p className="herd-first__reason">{firstReason(row, t)}</p>
        {rec && <p className="herd-first__rec">{recommendationText(rec, lang)}</p>}
        {assessment.learning && (
          <RectStamp kind="learning" name={animal.name} day={assessment.learning.day} of={assessment.learning.of} id={`${animal.id}-first`} />
        )}
        <Link to={`/animal/${animal.id}`} className={buttonClass(calm ? 'secondary' : 'primary', true)}>
          {calm ? t('herd.first.open', { name: animal.name }) : t('herd.first.go', { name: animal.name })}
        </Link>
      </Slip>
    </section>
  )
}

/**
 * Poses the 3D scene draws on this screen: all of them. Lying is built from bone turns
 * (src/landing/ink/lyingPose.ts) and checked on a real GPU; headless software rendering drew it
 * wrong, so screenshots in CI fall back to the still through canUse3D().
 */
const POSES_3D: readonly Pose[] = ['standing', 'walking', 'trotting', 'grazing', 'lying']

/** The 3D ink animal, loaded after the page. The still drawing shows while it loads and on phones without WebGL. */
function AnimalFigure({ species, pose, label }: { species: Species; pose: Pose; label: string }) {
  const [webgl] = useState(canUse3D)
  const use3D = webgl && POSES_3D.includes(pose)
  const still = <img className="herd-figure__still" src={stillUrl(species, pose)} alt={label} width={720} height={540} decoding="async" />
  return (
    <div className="herd-figure">
      <div className="herd-figure__frame">
        {use3D ? (
          <Suspense fallback={still}>
            <HorseScene species={species} pose={pose} label={label} className="herd-figure__scene" />
          </Suspense>
        ) : (
          still
        )}
      </div>
    </div>
  )
}

function CountItem({ state, count, active }: { state: StateId; count: number; active: boolean }) {
  const { t } = useT()
  const word = t(`shared.state.${state}`)
  // A state nobody is in is printed in graphite: colour only where something departs from normal.
  const ink = count > 0 ? stateInk(state) : 'var(--rule)'
  const body = (
    <>
      <Stamp shape={STATE_SHAPE[state]} size={26} ink={ink} seed={`count:${state}`} />
      <span className="herd-count__n">{count}</span>
      <span className="herd-count__word">{word}</span>
    </>
  )
  if (count === 0)
    return (
      <span className="herd-count herd-count--zero" data-state={state}>
        {body}
      </span>
    )
  return (
    <Link
      to={{ search: active ? '' : `?state=${state}` }}
      className="herd-count"
      data-state={state}
      aria-current={active ? 'true' : undefined}
      aria-label={t('herd.counts.item', { count, state: word })}
    >
      {body}
    </Link>
  )
}

function AnimalCard({ row, now, compact }: { row: HerdRow; now: number; compact: boolean }) {
  const { t } = useT()
  const { animal, assessment } = row
  const stale = now - assessment.lastUpdate > STALE_AFTER_MS
  const updated = updatedText(t, assessment.lastUpdate, now)
  const ids = t('herd.card.ids', { species: t(`shared.species.${animal.species}`), tag: animal.tagId })
  return (
    <Slip padded={false} className="herd-card-slip">
      <Link to={`/animal/${animal.id}`} className={compact ? 'herd-card herd-card--compact' : 'herd-card'} data-state={assessment.state}>
        {!compact && (
          <PostureDrawing species={animal.species} pose={assessment.pose} stale={stale} width={96} className="herd-card__drawing" />
        )}
        <span className="herd-card__body">
          <span className="herd-card__top">
            <h3 className="herd-card__name">{animal.name}</h3>
            <StateStamp state={assessment.state} id={animal.id} />
          </span>
          <span className="herd-ids">{ids}</span>
          <span className="herd-card__reason">{firstReason(row, t)}</span>
          {assessment.learning && !compact && (
            <RectStamp kind="learning" name={animal.name} day={assessment.learning.day} of={assessment.learning.of} id={`${animal.id}-card`} />
          )}
          <span className="herd-ids">{updated}</span>
        </span>
      </Link>
    </Slip>
  )
}
