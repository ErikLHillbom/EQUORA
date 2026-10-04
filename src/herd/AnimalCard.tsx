// One animal on the Herd home, as in the team mockup (docs/design-desktop.md). The whole card is
// one link. A 4 px edge in the state ink marks animals that need a look; a normal card has none,
// so a calm herd stays black and white.
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { useT } from '../i18n/LanguageContext'
import { stateInk } from '../shared/tokens'
import type { StateId } from '../shared/types'
import { PostureDrawing, StateStamp } from '../shared/ui'
import { activityValue, ageText, firstReason, metaLine } from './cardText'
import { STALE_AFTER_MS, type HerdRow } from './herdData'

/** The edge colour. None for normal, graphite for not sure (DESIGN 4: colour means "look here"). */
function edgeInk(state: StateId): string | undefined {
  if (state === 'normal') return undefined
  if (state === 'not_sure') return 'var(--graphite)'
  return stateInk(state)
}

export interface AnimalCardProps {
  row: HerdRow
  now: number
  /** Large herds: one short row without the drawing. */
  compact?: boolean
  /** The first card that needs attention carries the "Visit first" tab. */
  visitFirst?: boolean
}

export function AnimalCard({ row, now, compact = false, visitFirst = false }: AnimalCardProps) {
  const { t } = useT()
  const { animal, assessment } = row
  const stale = now - assessment.lastUpdate > STALE_AFTER_MS
  const edge = edgeInk(assessment.state)
  const style = edge ? ({ '--card-edge': edge } as CSSProperties) : undefined
  const reason = firstReason(row, t)
  const activity = activityValue(row)
  const classes = ['ui-slip', 'acard', compact ? 'acard--compact' : '', edge ? 'acard--edge' : '', visitFirst ? 'acard--first' : '']

  return (
    <Link to={`/animal/${animal.id}`} className={classes.filter(Boolean).join(' ')} style={style} data-state={assessment.state}>
      {visitFirst && <span className="acard__tab">{t('herd.card.visitFirst')}</span>}
      <span className="acard__head">
        <h3 className="acard__name">{animal.name}</h3>
        <StateStamp state={assessment.state} id={animal.id} className="acard__stamp" />
      </span>
      <span className="acard__meta">{metaLine(row, t)}</span>

      {compact ? (
        <span className="acard__reason">{reason}</span>
      ) : (
        <span className="acard__body">
          <span className="acard__figure">
            <PostureDrawing species={animal.species} pose={assessment.pose} stale={stale} width={200} className="acard__drawing" />
          </span>
          <span className="acard__reason">{reason}</span>
        </span>
      )}

      <dl className="acard__foot">
        <div className="acard__cell">
          <dt>{t('herd.card.activity')}</dt>
          <dd>
            {activity.kind === 'pct' ? (
              activity.text
            ) : activity.kind === 'learning' ? (
              t('herd.card.learning')
            ) : (
              <>
                <span aria-hidden="true">{t('herd.stats.dash')}</span>
                <span className="acard__sr">{t('herd.card.activityNone')}</span>
              </>
            )}
          </dd>
        </div>
        <div className="acard__cell">
          <dt>{t('herd.card.doing')}</dt>
          <dd>{t(`shared.pose.${assessment.pose}`)}</dd>
        </div>
        <div className="acard__cell">
          <dt>{t('herd.card.updated')}</dt>
          <dd>{ageText(t, assessment.lastUpdate, now)}</dd>
        </div>
      </dl>
    </Link>
  )
}
