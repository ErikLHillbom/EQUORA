// "What to do next": the recommendations in order, and for water the three plans side by side.
// These are options for a person. The tag never names a disease and never decides.
import { useT } from '../i18n/LanguageContext'
import { recommendationText, WATER_BANDS, WHAT_IF_PLANS, type WhatIfPlan, type WhatIfResult } from '../forecast'
import { formatTime } from '../shared/lib/clock'
import type { Animal, Recommendation } from '../shared/types'
import { Ledger, Slip } from '../shared/ui'
import { compareAt, crossing, deficitAt } from './plans'

export interface NextStepsProps {
  animal: Animal
  recommendations: Recommendation[]
  whatIf?: Record<WhatIfPlan, WhatIfResult>
  now: number
}

export function NextSteps({ animal, recommendations, whatIf, now }: NextStepsProps) {
  const { t, lang } = useT()
  if (recommendations.length === 0 && !whatIf) return null
  const sorted = [...recommendations].sort((a, b) => a.priority - b.priority)
  return (
    <section className="animal-next" aria-labelledby="animal-next-h">
      <Slip>
        <h2 id="animal-next-h" className="animal-h2">
          {t('animal.next.title')}
        </h2>
        <p className="animal-lead">{t('animal.next.lead', { name: animal.name })}</p>
        <ol className="animal-next__list">
          {sorted.map((r) => (
            <li key={r.id}>{recommendationText(r, lang)}</li>
          ))}
        </ol>
        {whatIf && <WhatIf animal={animal} whatIf={whatIf} now={now} />}
      </Slip>
    </section>
  )
}

function WhatIf({ animal, whatIf, now }: { animal: Animal; whatIf: Record<WhatIfPlan, WhatIfResult>; now: number }) {
  const { t } = useT()
  const at = compareAt(now, whatIf.continue_work.water)
  const fmtPct = (v: number) => t('animal.whatIf.pct', { pct: v.toFixed(1) })
  return (
    <div className="animal-whatif">
      <h3 className="animal-h3">{t('animal.whatIf.title')}</h3>
      <p className="animal-note">{t('animal.whatIf.lead', { name: animal.name })}</p>
      <Ledger caption={t('animal.whatIf.caption')}>
        <thead>
          <tr>
            <th scope="col">{t('animal.whatIf.plan')}</th>
            <th scope="col" className="num">
              {t('animal.whatIf.at', { time: formatTime(at) })}
            </th>
            <th scope="col" className="num">
              {t('animal.whatIf.passes')}
            </th>
          </tr>
        </thead>
        <tbody>
          {WHAT_IF_PLANS.map((plan) => {
            const w = whatIf[plan].water
            const cross = crossing(w, WATER_BANDS.concern)
            const end = w.points[w.points.length - 1]?.t ?? now
            return (
              <tr key={plan} data-plan={plan}>
                <th scope="row">{t(`forecast.plan.${plan}`, { name: animal.name })}</th>
                <td className="num">{fmtPct(deficitAt(w, at))}</td>
                <td className="num">{cross != null ? formatTime(cross) : t('animal.whatIf.never', { time: formatTime(end) })}</td>
              </tr>
            )
          })}
        </tbody>
      </Ledger>
      <p className="animal-note">{t('animal.whatIf.note', { name: animal.name })}</p>
    </div>
  )
}
