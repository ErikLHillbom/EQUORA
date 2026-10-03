// The Animal screen is a case file (DESIGN 9): "normal for Mulu" against "actual Mulu", what
// changed, and what to do next. A person makes the call; the logbook records it.
import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { useT } from '../i18n/LanguageContext'
import { DEMO_NOW } from '../shared/lib/clock'
import { CaseFolder, EmptyNote, Paper, Slip, StitchDivider, buttonClass } from '../shared/ui'
import { CaseHeader } from './CaseHeader'
import { ChangesSection } from './ChangesSection'
import { caseFile, departState } from './model'
import { NextSteps } from './NextSteps'
import { TodaySection } from './TodaySection'
import { TrendsSection } from './TrendsSection'
import './animal.css'

export default function AnimalScreen() {
  const { id = '' } = useParams()
  return <CaseFileView id={id} now={DEMO_NOW} />
}

export function CaseFileView({ id, now }: { id: string; now: number }) {
  const { t } = useT()
  const file = useMemo(() => caseFile(id, now), [id, now])

  if (!file) {
    return (
      <Paper className="animal">
        <h1 className="visually-hidden">{t('animal.title')}</h1>
        <EmptyNote title={t('animal.unknown.title')}>
          <p>{t('animal.unknown.body')}</p>
          <Link to="/" className={buttonClass('secondary')}>
            {t('animal.unknown.back')}
          </Link>
        </EmptyNote>
      </Paper>
    )
  }

  const { animal, assessment } = file
  const ink = departState(assessment.state)
  const lyingReason = assessment.reasons.find((r) => r.kind === 'fall' || r.kind === 'longLying')
  const lyingNowMin = lyingReason && assessment.pose === 'lying' ? Number(lyingReason.params.minutes) : undefined
  const learning = assessment.state === 'not_sure' && assessment.reasons.some((r) => r.kind === 'shortBaseline')

  return (
    <Paper className="animal">
      <CaseFolder label={animal.name} note={t('animal.tag', { tag: animal.tagId })} className="animal-folder">
        <CaseHeader animal={animal} assessment={assessment} now={now} />
        <NextSteps animal={animal} recommendations={file.recommendations} whatIf={file.whatIf} now={now} />
        <StitchDivider />
        <TodaySection
          animal={animal}
          readings={file.readings}
          main={file.main}
          ink={ink}
          learning={learning}
          lyingNowMin={Number.isFinite(lyingNowMin) ? lyingNowMin : undefined}
          now={now}
        />
        <StitchDivider />
        <TrendsSection
          animal={animal}
          budgets={file.budgets}
          ink={ink}
          learning={learning ? assessment.learning : undefined}
          main={file.main}
          now={now}
        />
        <StitchDivider />
        <ChangesSection animal={animal} changes={file.changes} learning={learning} />
        <StitchDivider />
        <Slip as="aside" className="animal-cannot" aria-labelledby="animal-cannot-h">
          <h2 id="animal-cannot-h" className="animal-h2">
            {t('animal.cannotSee.title')}
          </h2>
          <p>{t('animal.cannotSee.body', { name: animal.name })}</p>
          <p className="animal-note">{t('animal.cannotSee.change', { name: animal.name })}</p>
        </Slip>
      </CaseFolder>
    </Paper>
  )
}
