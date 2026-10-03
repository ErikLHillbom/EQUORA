// Why it matters: a short field report on the stakes. Every figure lives in FIGURES with its
// source (SPEC 12) and is shown with an inline citation. One drawing, no other illustration.
import { Link } from 'react-router'
import { Cite } from '../about-data'
import { LEARNING_DAYS } from '../baseline'
import { useT } from '../i18n/LanguageContext'
import { TOWN_CENTRE } from '../simulation'
import { CoordinateBlock, HeaderStrip, Ledger, NumberedHeading, Paper, PostureDrawing, Slip, Tape, buttonClass } from '../shared/ui'
import { FIGURES, tagShares } from './figures'
import './why.css'

export default function WhyScreen() {
  const { t } = useT()
  const f = FIGURES
  const shares = tagShares()
  const diedPct = ((f.colicDied / f.colicCases) * 100).toFixed(1)

  return (
    <Paper className="why">
      <HeaderStrip title={t('why.title')} kicker={t('why.kicker')} id="why-header">
        <CoordinateBlock
          label={t('why.coords')}
          cells={[`${TOWN_CENTRE.lat} N`, `${TOWN_CENTRE.lon} E`, 'Yirgacheffe', 'Gedeo zone']}
        />
        <p className="why-intro">{t('why.intro')}</p>
      </HeaderStrip>

      <figure className="why-figure">
        <Slip className="why-figure__slip">
          <Tape placement="top" angle={-4} />
          <PostureDrawing species="donkey" pose="walking" width={220} decorative />
          <figcaption className="why-figure__caption">{t('why.drawing')}</figcaption>
        </Slip>
      </figure>

      <section aria-labelledby="why-value-h">
        <NumberedHeading n={1} id="why-value-h">
          {t('why.value.h')}
        </NumberedHeading>
        <Slip className="why-sheet">
          <p>
            {t('why.value.worth', { usd: f.donkeyValueUsd, low: f.donkeyValuePi[0], high: f.donkeyValuePi[1] })} <Cite id="asteraye2026" />
          </p>
          <p>
            {t('why.value.income', { pct: f.incomeSharePct, hours: f.labourHoursWeek })} <Cite id="asteraye2026" />
          </p>
          <p>
            {t('why.value.herd', { donkeys: f.donkeysMillion, horses: f.horsesMillion })} <Cite id="asteraye2024" extra="CSA 2020" />
          </p>
          <p>
            {t('why.value.coffee', { hours: f.cherryHours })} <Cite id="fao" />
          </p>
        </Slip>
      </section>

      <section aria-labelledby="why-loss-h">
        <NumberedHeading n={2} id="why-loss-h">
          {t('why.loss.h')}
        </NumberedHeading>
        <Slip className="why-sheet">
          <p>{t('why.loss.work')}</p>
          <p>
            {t('why.loss.income')} <Cite id="geiger2020" />
          </p>
          <p>
            {t('why.loss.price', {
              donkey: Math.round(f.donkeyPriceUsd),
              low: f.donkeyPriceRange[0],
              high: f.donkeyPriceRange[1],
              horse: f.horsePriceUsd,
            })}{' '}
            <Cite id="asteraye2024" />
          </p>
          <p>
            {t('why.loss.women', { n: f.womenInterviewed })} <Cite id="merridale2024women" />
          </p>
        </Slip>
      </section>

      <section aria-labelledby="why-gap-h">
        <NumberedHeading n={3} id="why-gap-h">
          {t('why.gap.h')}
        </NumberedHeading>
        <Slip className="why-sheet">
          <p>
            {t('why.gap.late')} <Cite id="donkeysanctuary" />
          </p>
          <p>
            {t('why.gap.clinic', {
              share: f.colicSharePct,
              cases: f.colicCases,
              died: f.colicDied,
              diedPct,
              donkeys: f.colicDonkeyPct,
            })}{' '}
            <Cite id="worku2017" />
          </p>
        </Slip>
      </section>

      <section aria-labelledby="why-tag-h">
        <NumberedHeading n={4} id="why-tag-h">
          {t('why.tag.h')}
        </NumberedHeading>
        <Slip className="why-sheet">
          <ul className="why-list">
            <li>{t('why.tag.learn', { days: LEARNING_DAYS })}</li>
            <li>{t('why.tag.check', { phrase: t('tag.phrase.check') })}</li>
            <li>{t('why.tag.never')}</li>
            <li>
              {t('why.tag.lying', { pct: Math.round(f.lieAfterLoadingPct) })} <Cite id="bukhari2022" />
            </li>
            <li>{t('why.tag.offline')}</li>
            <li>{t('why.tag.amharic')}</li>
            <li>{t('why.tag.blind')}</li>
          </ul>
        </Slip>
      </section>

      <section aria-labelledby="why-math-h">
        <NumberedHeading n={5} id="why-math-h">
          {t('why.math.h')}
        </NumberedHeading>
        <Slip className="why-sheet">
          <Ledger caption={t('why.math.caption')}>
            <thead>
              <tr>
                <th scope="col">{t('why.math.item')}</th>
                <th scope="col" className="num">
                  {t('why.math.cost')}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{t('why.math.parts')}</th>
                <td className="num">{t('why.math.partsValue', { low: f.tagPartsUsd[0], high: f.tagPartsUsd[1] })}</td>
              </tr>
              <tr>
                <th scope="row">
                  {t('why.math.value')} <Cite id="asteraye2026" />
                </th>
                <td className="num">{t('why.math.valueValue', { usd: f.donkeyValueUsd })}</td>
              </tr>
              <tr>
                <th scope="row">
                  {t('why.math.price')} <Cite id="asteraye2024" />
                </th>
                <td className="num">{t('why.math.priceValue', { usd: Math.round(f.donkeyPriceUsd) })}</td>
              </tr>
            </tbody>
          </Ledger>
          <p className="why-math__share" data-testid="why-share">
            {t('why.math.share', { pct: shares.ofYearPct.toFixed(1), pricePct: Math.round(shares.ofPricePct) })}
          </p>
          <p className="why-note">{t('why.math.rough')}</p>
          <p className="why-note">{t('why.math.limit')}</p>
        </Slip>
      </section>

      <Slip className="why-cta">
        <Link to="/" className={buttonClass('primary', true)}>
          {t('why.cta.herd')}
        </Link>
        <Link to="/tag" className={buttonClass('secondary', true)}>
          {t('why.cta.tag')}
        </Link>
        <Link to="/data" className={buttonClass('tertiary', true)}>
          {t('why.cta.data')}
        </Link>
      </Slip>
    </Paper>
  )
}
