// Herd home: which animal to visit first, the herd at a glance, and every animal as a card
// (docs/design-desktop.md). Colour appears only where an animal departs from its normal.
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { recommendationText } from '../forecast'
import { useT } from '../i18n/LanguageContext'
import { canUse3D, stillUrl } from '../landing/models'
import { formatDate, formatTime } from '../shared/lib/clock'
import { STATE_SHAPE, stateInk } from '../shared/tokens'
import { STATE_PRIORITY, STATES, type Pose, type Species, type StateId } from '../shared/types'
import { buttonClass, CoordinateBlock, HeaderStrip, Paper, RectStamp, Slip, Stamp, StateStamp } from '../shared/ui'
import { AnimalCard } from './AnimalCard'
import { metaLine, updatedText } from './cardText'
import { COMPACT_HERD_SIZE, firstRecommendation, herdData, type HerdRow } from './herdData'
import './herd.css'

const HorseScene = lazy(() => import('../landing/HorseScene'))

/** Counts shown left to right: calm first, then rising concern. */
const COUNT_ORDER: readonly StateId[] = ['normal', 'water', 'check', 'urgent', 'not_sure']

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
  // One "Visit first" tab per screen: the first animal that departs from normal.
  const visitFirstId = rows.find((r) => r.assessment.state !== 'normal')?.animal.id
  const tabbed = shown.some((r) => r.animal.id === visitFirstId)
  const compact = rows.length > COMPACT_HERD_SIZE

  return (
    <Paper className="herd">
      <HeaderStrip
        title={t('shared.app.name')}
        kicker={t('herd.kicker', { count: rows.length })}
        id="herd-header"
        className="herd-header"
        aside={<RectStamp kind="simulated" id="herd-sim" />}
      >
        <CoordinateBlock
          label={t('herd.coords.label')}
          cells={['6.162 N', '38.205 E', t('herd.coords.town'), t('herd.coords.zone'), formatDate(now), t('herd.coords.time', { time: formatTime(now) })]}
        />
      </HeaderStrip>

      {first && <FirstVisit row={first} now={now} />}

      <section aria-labelledby="herd-animals-h" id="herd-animals" className="herd-list">
        <div className="herd-list__head">
          <div className="herd-list__title">
            <h2 id="herd-animals-h" className="herd-h2">
              {t('herd.list.heading')}
            </h2>
            <p className="herd-note">{t('herd.list.note')}</p>
          </div>
          <div className="herd-counts" role="group" aria-labelledby="herd-counts-h">
            <h3 id="herd-counts-h" className="ui-label herd-counts__label">
              {t('herd.counts.heading')}
            </h3>
            <ul className="herd-counts__list">
              {COUNT_ORDER.map((s) => (
                <li key={s}>
                  <CountItem state={s} count={counts[s]} active={filter === s} />
                </li>
              ))}
            </ul>
          </div>
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
          <ul className={['herd-cards', compact ? 'herd-cards--compact' : '', tabbed ? 'herd-cards--tabbed' : ''].filter(Boolean).join(' ')}>
            {shown.map((row) => (
              <li key={row.animal.id}>
                <AnimalCard row={row} now={now} compact={compact} visitFirst={row.animal.id === visitFirstId} />
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
  const [lead, ...more] = assessment.reasons
  return (
    <section aria-labelledby="herd-first-h" className={calm ? 'herd-first herd-first--calm' : 'herd-first'}>
      <Slip padded={false} className="herd-first__sheet">
        <h2 id="herd-first-h" className="herd-first__tab">
          {calm ? t('herd.first.calm') : t('herd.first.heading')}
        </h2>
        <AnimalFigure species={animal.species} pose={assessment.pose} label={label} />
        <div className="herd-first__text">
          <div className="herd-first__head">
            <StateStamp state={assessment.state} size="large" id={animal.id} />
            <div className="herd-first__who">
              <h3 className="herd-first__name">{animal.name}</h3>
              <p className="herd-ids">{metaLine(row, t)}</p>
              <p className="herd-ids herd-ids--quiet">{updatedText(t, assessment.lastUpdate, now)}</p>
            </div>
          </div>
          {lead && <p className="herd-first__reason">{t(lead.textKey, lead.params)}</p>}
          {more.length > 0 && (
            <ul className="herd-first__more">
              {more.map((r) => (
                <li key={r.textKey}>{t(r.textKey, r.params)}</li>
              ))}
            </ul>
          )}
          {assessment.learning && (
            <RectStamp kind="learning" name={animal.name} day={assessment.learning.day} of={assessment.learning.of} id={`${animal.id}-first`} />
          )}
          {rec && (
            <div className="herd-first__rec">
              <p className="ui-label">{t('herd.first.next')}</p>
              <p>{recommendationText(rec, lang)}</p>
            </div>
          )}
          <Link to={`/animal/${animal.id}`} className={`${buttonClass(calm ? 'secondary' : 'primary')} herd-first__go`}>
            {calm ? t('herd.first.open', { name: animal.name }) : t('herd.first.go', { name: animal.name })}
          </Link>
        </div>
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
  // A state nobody is in is printed in the rule colour: colour only where something departs from normal.
  const ink = count > 0 ? stateInk(state) : 'var(--rule)'
  const body = (
    <>
      <Stamp shape={STATE_SHAPE[state]} size={24} ink={ink} seed={`count:${state}`} />
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
