// Top of the case file: who the animal is, its state as a large stamp, the reasons in plain
// sentences, and what it is doing now as a drawing taped to the page.
import { Link } from 'react-router'
import { useT } from '../i18n/LanguageContext'
import { useWidth } from '../shared/charts/useWidth'
import { MINUTE } from '../shared/lib/clock'
import type { Animal, Assessment } from '../shared/types'
import { MonoLabel, PostureDrawing, RectStamp, Slip, StateStamp, Tape, buttonClass } from '../shared/ui'

export interface CaseHeaderProps {
  animal: Animal
  assessment: Assessment
  now: number
}

export function CaseHeader({ animal, assessment, now }: CaseHeaderProps) {
  const { t } = useT()
  const minutes = Math.floor((now - assessment.lastUpdate) / MINUTE)
  const stale = now - assessment.lastUpdate > 2 * 60 * MINUTE
  const lying = assessment.pose === 'lying'
  // The drawing fills its frame: small beside the name on a phone, large on a computer.
  const [artRef, artWidth] = useWidth<HTMLDivElement>(128)
  return (
    <header className="animal-header">
      <div className="animal-header__meta">
        <RectStamp kind="simulated" id={`${animal.id}:sim`} />
      </div>

      <div className="animal-header__who">
        <div className="animal-header__ident">
          <p className="animal-header__name">{animal.name}</p>
          <p className="mono animal-header__line">
            {t('animal.details', {
              species: t(`shared.species.${animal.species}`),
              sex: t(`animal.sex.${animal.sex}`),
              age: animal.ageYears,
              weight: animal.bodyWeightKg,
            })}
          </p>
          <p className="mono animal-header__line">{t(`simulation.household.${animal.household}`)}</p>
          <p className="mono animal-header__line">{t(`animal.work.${animal.work}`)}</p>
          <p className="mono animal-header__line animal-header__updated">
            {minutes < 1 ? t('animal.updatedNow') : t('animal.updated', { minutes })}
          </p>
        </div>
        <figure className="animal-header__drawing">
          <Slip className="animal-header__photo" padded={false}>
            <Tape placement="top" angle={-4} />
            <div className="animal-header__art" ref={artRef}>
              <PostureDrawing species={animal.species} pose={assessment.pose} stale={stale} width={artWidth} />
            </div>
          </Slip>
          <figcaption className="animal-header__pose">
            <MonoLabel>{t('animal.pose', { pose: t(`shared.pose.${assessment.pose}`).toLowerCase() })}</MonoLabel>
            {lying && <RectStamp kind="experimental" id={`${animal.id}:pose-exp`} />}
          </figcaption>
        </figure>
      </div>

      <div className="animal-header__state">
        <StateStamp state={assessment.state} size="large" id={animal.id} />
        <div className="animal-header__reasons">
          <h2 className="visually-hidden">{t('animal.reasons')}</h2>
          <ul>
            {assessment.reasons.map((r, i) => (
              <li key={`${r.kind}-${i}`}>{t(r.textKey, r.params)}</li>
            ))}
          </ul>
          {assessment.learning && (
            <RectStamp
              kind="learning"
              name={animal.name}
              day={assessment.learning.day}
              of={assessment.learning.of}
              id={`${animal.id}:learn`}
            />
          )}
        </div>
      </div>

      <nav className="animal-header__links" aria-label={animal.name}>
        <Link to={`/map?animal=${encodeURIComponent(animal.id)}`} className={buttonClass('secondary')}>
          {t('animal.showOnMap')}
        </Link>
        <Link to="/tag" className={buttonClass('tertiary')}>
          {t('animal.tagScreen')}
        </Link>
      </nav>
    </header>
  )
}
