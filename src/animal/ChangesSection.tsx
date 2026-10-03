// Section 3, Detected changes: the logbook. Each change from the animal's normal asks a person
// what they found. The answer is stamped onto the entry and kept on this phone.
import { useState } from 'react'
import { useT } from '../i18n/LanguageContext'
import { formatDate } from '../shared/lib/clock'
import type { Animal, DetectedChange, FeedbackId } from '../shared/types'
import { Button, Logbook, LogbookEntry, NumberedHeading, Slip } from '../shared/ui'
import { FEEDBACK_IDS } from './feedback'
import { useFeedback } from './useFeedback'

/** Entries shown before "Show older entries". */
const FIRST_ENTRIES = 6

export interface ChangesSectionProps {
  animal: Animal
  changes: DetectedChange[]
  /** The normal is still being learned, so no changes can be found yet. */
  learning?: boolean
}

export function ChangesSection({ animal, changes, learning = false }: ChangesSectionProps) {
  const { t } = useT()
  const { saved, ready, record } = useFeedback(animal.id)
  const [showAll, setShowAll] = useState(false)
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set())

  const asks = (c: DetectedChange) => c.state !== 'normal' && c.state !== 'not_sure'
  const answerOf = (c: DetectedChange): FeedbackId | undefined => saved[c.id]?.feedback ?? c.feedback
  // The open change (not yet back to normal) asks right away. Older ones open on request.
  const firstOpen = changes.find((c) => asks(c) && !c.resolved && !answerOf(c))?.id
  const shown = showAll ? changes : changes.slice(0, FIRST_ENTRIES)

  return (
    <section className="animal-section" aria-labelledby="animal-changes-h">
      <NumberedHeading n={3} id="animal-changes-h">
        {t('animal.changes.title')}
      </NumberedHeading>
      <p className="animal-lead">{t('animal.changes.lead', { name: animal.name })}</p>
      {changes.length === 0 ? (
        <p className="animal-note">{t(learning ? 'animal.changes.learning' : 'animal.changes.none', { name: animal.name })}</p>
      ) : (
        <Slip className="animal-log">
          <Logbook label={t('animal.changes.title')}>
            {shown.map((c) => {
              const answer = answerOf(c)
              const open = ready && asks(c) && !answer && (c.id === firstOpen || opened.has(c.id))
              const date = formatDate(c.at)
              const sentence = c.reasons[0] ? t(c.reasons[0].textKey, c.reasons[0].params) : ''
              return (
                <LogbookEntry
                  key={c.id}
                  at={c.at}
                  state={c.state}
                  id={c.id}
                  feedback={answer}
                  actions={
                    asks(c) && !answer && ready ? (
                      open ? (
                        <div className="animal-feedback" role="group" aria-label={t('animal.changes.feedbackGroup', { date })}>
                          <p className="animal-feedback__ask">{t('animal.changes.ask')}</p>
                          <div className="animal-feedback__buttons">
                            {FEEDBACK_IDS.map((f) => (
                              <Button key={f} variant="secondary" onClick={() => void record(c.id, f)}>
                                {t(`shared.feedback.${f}`)}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="animal-feedback animal-feedback--closed">
                          <span className="animal-note">{t('animal.changes.askOld')}</span>
                          <Button variant="tertiary" onClick={() => setOpened((s) => new Set(s).add(c.id))}>
                            {t('animal.changes.answer')}
                          </Button>
                        </div>
                      )
                    ) : undefined
                  }
                >
                  {sentence}
                  {answer && (
                    <span className="animal-log__who">
                      {saved[c.id] ? t('animal.changes.saved') : t('animal.changes.fromOwner')}
                    </span>
                  )}
                </LogbookEntry>
              )
            })}
          </Logbook>
          {!showAll && changes.length > FIRST_ENTRIES && (
            <Button variant="tertiary" onClick={() => setShowAll(true)}>
              {t('animal.changes.older', { count: changes.length - FIRST_ENTRIES })}
            </Button>
          )}
        </Slip>
      )}
    </section>
  )
}
