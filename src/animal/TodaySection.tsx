// Section 1, Today: one card per signal, today so far against the animal's normal by this hour.
// Only the card behind the state gets the dot-matrix number and the pencil underline.
import { useT } from '../i18n/LanguageContext'
import { formatTime } from '../shared/lib/clock'
import type { Animal, StateId } from '../shared/types'
import { NumberedHeading, TodayCard } from '../shared/ui'
import { CARD_SIGNALS, NORMAL_DAYS, isOutside, type CardSignal, type Reading } from './readings'

const DECIMALS: Record<CardSignal, number> = {
  activity: 0,
  lying: 0,
  eating: 0,
  workload: 0,
  distance: 1,
  climb: 0,
  waterDebt: 1,
}

const EXPERIMENTAL: ReadonlySet<CardSignal> = new Set(['lying'])
const FOOTNOTE: Partial<Record<CardSignal, string>> = {
  activity: 'animal.foot.activity',
  workload: 'animal.foot.workload',
  waterDebt: 'animal.foot.waterDebt',
}

export interface TodaySectionProps {
  animal: Animal
  readings: Record<CardSignal, Reading>
  main: CardSignal
  /** State ink for numbers outside the normal. */
  ink: StateId
  learning: boolean
  /** Minutes the animal has been lying in the current bout, when a reason says so. */
  lyingNowMin?: number
  now: number
}

export function TodaySection({ animal, readings, main, ink, learning, lyingNowMin, now }: TodaySectionProps) {
  const { t } = useT()
  const order = [main, ...CARD_SIGNALS.filter((s) => s !== main)]
  return (
    <section className="animal-section" aria-labelledby="animal-today-h">
      <NumberedHeading n={1} id="animal-today-h">
        {t('animal.today.title')}
      </NumberedHeading>
      <p className="animal-lead">
        {learning
          ? t('animal.today.leadLearning', { name: animal.name })
          : t('animal.today.lead', { time: formatTime(now), name: animal.name, days: NORMAL_DAYS })}
      </p>
      <div className="animal-today">
        {order.map((s) => {
          const r = readings[s]
          const isMain = s === main
          const showRange = !learning && r.low != null && r.high != null
          // Compare what the card shows, so a value never looks outside a range it equals.
          const d = DECIMALS[s]
          const round = (v: number | null) => (v == null ? null : Number(v.toFixed(d)))
          const shown = { ...r, value: round(r.value), low: round(r.low), high: round(r.high) }
          const foot =
            s === 'lying' && lyingNowMin != null
              ? t('animal.foot.lyingNow', { minutes: lyingNowMin })
              : FOOTNOTE[s]
                ? t(FOOTNOTE[s])
                : undefined
          return (
            <TodayCard
              key={s}
              className={isMain ? 'animal-today__main' : undefined}
              label={t(`animal.card.${s}`)}
              value={shown.value}
              unit={t(`animal.unit.${s}`)}
              name={animal.name}
              low={showRange ? shown.low : null}
              high={showRange ? shown.high : null}
              state={ink}
              decimals={DECIMALS[s]}
              dotMatrix={isMain && shown.value != null}
              experimental={EXPERIMENTAL.has(s)}
              highlight={isMain && isOutside(shown)}
              id={`${animal.id}:${s}`}
            >
              {foot}
            </TodayCard>
          )
        })}
      </div>
    </section>
  )
}
