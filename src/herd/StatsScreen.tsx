// Statistics: the herd as a ledger (DESIGN 9). Mono columns, hairline rules, a stamp beside each
// animal's current state. Then herd insights computed from the simulated budgets.
import { Link } from 'react-router'
import { BAND_Z } from '../baseline'
import { useT } from '../i18n/LanguageContext'
import {
  HeaderStrip,
  Ledger,
  NumberedHeading,
  Paper,
  PencilUnderline,
  RectStamp,
  Slip,
  StateStamp,
  StitchDivider,
} from '../shared/ui'
import { herdData } from './herdData'
import { oneDecimal, RECENT_HOURS, signedMin, signedPct, type Deviation } from './insights'
import './herd.css'

function changeText(d: Deviation): string {
  if (d.signal === 'lying') return signedMin(d.diffMin)
  return signedPct(d.pct)
}

export default function StatsScreen() {
  const { t } = useT()
  const { rows, insights, top } = herdData()
  const dash = t('herd.stats.dash')
  const nameOf = (id: string) => rows.find((r) => r.animal.id === id)?.animal.name ?? id

  return (
    <Paper className="stats">
      <HeaderStrip
        title={t('shared.screen.stats')}
        kicker={t('herd.stats.kicker', { count: rows.length })}
        id="stats-header"
        aside={<RectStamp kind="simulated" id="stats-sim" />}
      />

      <section aria-labelledby="stats-ledger-h">
        <NumberedHeading n={1} id="stats-ledger-h">
          {t('herd.stats.ledger.heading')}
        </NumberedHeading>
        <Slip className="stats-slip">
          <div className="stats-scroll" role="region" aria-labelledby="stats-ledger-h" tabIndex={0}>
            <Ledger caption={t('herd.stats.ledger.caption')} className="stats-ledger">
              <thead>
                <tr>
                  <th scope="col">{t('herd.stats.col.animal')}</th>
                  <th scope="col" className="num stats-col-activity">
                    {t('herd.stats.col.activity', { hours: RECENT_HOURS })}
                  </th>
                  <th scope="col" className="num">
                    {t('herd.stats.col.km')}
                  </th>
                  <th scope="col" className="num">
                    {t('herd.stats.col.climb')}
                  </th>
                  <th scope="col" className="num">
                    {t('herd.stats.col.work')}
                  </th>
                  <th scope="col" className="num">
                    {t('herd.stats.col.lying')}
                  </th>
                  <th scope="col">{t('herd.stats.col.species')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ animal, assessment, totals, deviations }) => {
                  const act = deviations.activity
                  return (
                    <tr key={animal.id} data-state={assessment.state}>
                      <th scope="row" className="stats-animal">
                        <Link to={`/animal/${animal.id}`} className="stats-animal__link">
                          <span className="stats-animal__name">{animal.name}</span>
                          <StateStamp state={assessment.state} id={animal.id} />
                        </Link>
                      </th>
                      <td className="num stats-col-activity">
                        {!act || !Number.isFinite(act.pct) ? (
                          dash
                        ) : assessment.state !== 'normal' && Math.abs(act.z) > BAND_Z ? (
                          // Outside the animal's normal band: the one hand-drawn highlight in this row.
                          <PencilUnderline state={assessment.state} id={`${animal.id}-act`}>
                            {signedPct(act.pct)}
                          </PencilUnderline>
                        ) : (
                          signedPct(act.pct)
                        )}
                      </td>
                      <td className="num">{oneDecimal(totals.km)}</td>
                      <td className="num">{Math.round(totals.climbM)}</td>
                      <td className="num">{oneDecimal(totals.workH)}</td>
                      <td className="num">{oneDecimal(totals.lyingH)}</td>
                      <td>{t(`shared.species.${animal.species}`)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </Ledger>
          </div>
          <p className="herd-note stats-foot">
            <span className="stats-scrollhint">{t('herd.stats.scrollHint')} </span>
            {t('herd.stats.ledger.note', { hours: RECENT_HOURS })}
          </p>
        </Slip>
      </section>

      <StitchDivider />

      <div className="stats-pair">
        <section aria-labelledby="stats-insights-h">
          <NumberedHeading n={2} id="stats-insights-h">
            {t('herd.stats.insights.heading')}
          </NumberedHeading>
          <Slip className="stats-slip">
            <ul className="stats-insights">
              {insights.map((line) => {
                const params = { ...line.params }
                if (typeof params.groupKey === 'string') params.group = t(params.groupKey)
                return (
                  <li key={line.id} data-insight={line.id}>
                    {t(line.textKey, params)}
                  </li>
                )
              })}
            </ul>
            <p className="herd-note stats-foot">{t('herd.stats.insights.note')}</p>
          </Slip>
        </section>

        <StitchDivider className="stats-pair__divider" />

        <section aria-labelledby="stats-top-h">
          <NumberedHeading n={3} id="stats-top-h">
            {t('herd.stats.top.heading')}
          </NumberedHeading>
          <Slip className="stats-slip">
            {top.length === 0 ? (
              <p>{t('herd.stats.top.none', { hours: RECENT_HOURS })}</p>
            ) : (
              <Ledger caption={t('herd.stats.top.caption', { hours: RECENT_HOURS })} className="stats-top">
                <thead>
                  <tr>
                    <th scope="col">{t('herd.stats.col.animal')}</th>
                    <th scope="col">{t('herd.stats.col.signal')}</th>
                    <th scope="col" className="num">
                      {t('herd.stats.col.change')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {top.map(({ animalId, deviation }) => (
                    <tr key={`${animalId}-${deviation.signal}`}>
                      <th scope="row">
                        <Link to={`/animal/${animalId}`} className="stats-animal__link stats-animal__link--plain">
                          {nameOf(animalId)}
                        </Link>
                      </th>
                      <td>{t(`herd.stats.signal.${deviation.signal}`)}</td>
                      <td className="num">{changeText(deviation)}</td>
                    </tr>
                  ))}
                </tbody>
              </Ledger>
            )}
            {top.some((r) => r.deviation.signal === 'lying') && <p className="herd-note stats-foot">{t('herd.stats.top.lyingNote')}</p>}
          </Slip>
        </section>
      </div>
    </Paper>
  )
}
