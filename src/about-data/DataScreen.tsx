// About the data (DESIGN 9): a datasheet. Mono tables, hairline rules, numbered sections. Every
// model figure is read from public/models/metrics.json at runtime (SPEC 10). Section 4, what our
// data does not cover, sits on a kraft slip held on with tape: the most hand-made part of the app.
import { useEffect, useState, type ReactNode } from 'react'
import { PROFILES, RULES } from '../alerts'
import { BASELINE_DAYS, LEARNING_DAYS, MIN_BASELINE_DAYS } from '../baseline'
import { DONKEY_SWEAT_FACTOR, FORAGE_SHARE, MAX_WORK_WITHOUT_WATER_H, WATER_BANDS } from '../forecast'
import { useT } from '../i18n/LanguageContext'
import { loadMetrics } from '../sensing'
import { getWeather, HERD, HISTORY_DAYS, HOUSEHOLDS, SCENARIOS, TOWN_CENTRE } from '../simulation'
import { STATES } from '../shared/types'
import {
  CoordinateBlock,
  EmptyNote,
  HeaderStrip,
  Ledger,
  MonoLabel,
  NumberedHeading,
  Paper,
  RectStamp,
  Slip,
  StateStamp,
  Tape,
} from '../shared/ui'
import { accuracyGapPoints, dec, foldRange, int, kb, largestConfusion, pct, ruleThreshold, type DatasheetMetrics } from './metrics'
import { SOURCE_GROUPS } from './sources'
import './data.css'

type Loaded = { status: 'loading' } | { status: 'ready'; m: DatasheetMetrics } | { status: 'error' }

function useMetrics(): Loaded {
  const [state, setState] = useState<Loaded>({ status: 'loading' })
  useEffect(() => {
    let live = true
    loadMetrics()
      .then((m) => live && setState({ status: 'ready', m: m as DatasheetMetrics }))
      .catch(() => live && setState({ status: 'error' }))
    return () => {
      live = false
    }
  }, [])
  return state
}

/** Rolling windows in the training set, from the roll decision in metrics.json. */
function rollWindows(m: DatasheetMetrics | undefined): number | undefined {
  return m?.rollDecision.withRoll?.support ?? m?.rollDecision.windowsDropped
}

export default function DataScreen() {
  const { t } = useT()
  const loaded = useMetrics()
  const m = loaded.status === 'ready' ? loaded.m : undefined

  return (
    <Paper className="ds">
      <HeaderStrip title={t('data.title')} kicker={m ? t('data.kicker', { version: m.version }) : undefined} id="data-header">
        {m && (
          <CoordinateBlock
            label={t('data.coords')}
            cells={[
              t('data.coords.horses', { n: m.perFold.length }),
              t('data.coords.windows', { n: int(m.windows) }),
              t('data.coords.hz', { n: m.hz }),
              t('data.coords.window', { n: m.windowSeconds }),
            ]}
          />
        )}
        <p className="ds-intro">{t('data.intro')}</p>
        <a className="ds-jump" href="#data-gaps">
          {t('data.jump')}
        </a>
      </HeaderStrip>

      <section aria-labelledby="data-model-h">
        <NumberedHeading n={1} id="data-model-h">
          {t('data.model.h')}
        </NumberedHeading>
        {loaded.status === 'loading' && <EmptyNote>{t('data.loading')}</EmptyNote>}
        {loaded.status === 'error' && <EmptyNote title={t('data.error.title')}>{t('data.error.body')}</EmptyNote>}
        {m && <ModelSection m={m} />}
      </section>

      <section aria-labelledby="data-built-h">
        <NumberedHeading n={2} id="data-built-h">
          {t('data.built.h')}
        </NumberedHeading>
        <BuiltWith m={m} />
      </section>

      <section aria-labelledby="data-rules-h">
        <NumberedHeading n={3} id="data-rules-h">
          {t('data.rules.h')}
        </NumberedHeading>
        <RulesSection rollN={rollWindows(m)} />
      </section>

      <Gaps rollN={rollWindows(m)} />

      <section aria-labelledby="data-privacy-h">
        <NumberedHeading n={5} id="data-privacy-h">
          {t('data.privacy.h')}
        </NumberedHeading>
        <Slip>
          <ul className="ds-list">
            {['local', 'forward', 'outputs', 'noDiagnosis', 'person', 'network'].map((k) => (
              <li key={k}>{t(`data.privacy.${k}`)}</li>
            ))}
          </ul>
        </Slip>
      </section>

      <section aria-labelledby="data-sources-h">
        <NumberedHeading n={6} id="data-sources-h">
          {t('data.sources.h')}
        </NumberedHeading>
        <Slip className="ds-sources">
          {SOURCE_GROUPS.map((g) => (
            <div key={g.titleKey} className="ds-sources__group">
              <h3 className="ds-h3">{t(g.titleKey)}</h3>
              <ol className="ds-refs">
                {g.sources.map((s) => (
                  <li key={s.id} id={`src-${s.id}`}>
                    <a className="ds-ref" href={s.url} target="_blank" rel="noreferrer">
                      <span className="ds-ref__cite">{s.cite}</span>
                      {s.note && <span className="ds-ref__note">{s.note}</span>}
                      <span className="ds-ref__link">{s.url.replace(/^https?:\/\//, '')}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          <p className="ds-note">{t('data.sources.ours')}</p>
        </Slip>
      </section>
    </Paper>
  )
}

// ---------- 1. The model ----------

function ModelSection({ m }: { m: DatasheetMetrics }) {
  const { t } = useT()
  const label = (id: string) => t(`sensing.activity.${id}`).toLowerCase()
  const classes = m.labels.map(label).join(', ')
  const trees = m.model?.n_estimators
  const kind = m.model?.kind ?? 'random forest'
  const { low, high } = foldRange(m)
  const mix = largestConfusion(m)
  const roll = m.rollDecision
  const rollMin = ruleThreshold(roll.rule)
  const thresholdRule = (m as DatasheetMetrics & { thresholdRule?: string }).thresholdRule

  return (
    <>
      <Slip className="ds-sheet">
        <p className="ds-lead">
          {t('data.model.lead', {
            kind,
            trees: trees ?? '?',
            seconds: m.windowSeconds,
            n: m.labels.length,
            classes,
            hz: m.hz,
            features: m.featureNames.length,
          })}
        </p>
        <Ledger caption={t('data.spec.caption')} className="ds-spec">
          <tbody>
            <SpecRow k={t('data.spec.kind')} v={kind.charAt(0).toUpperCase() + kind.slice(1)} />
            {trees !== undefined && (
              <SpecRow k={t('data.spec.trees')} v={t('data.spec.treesValue', { n: trees, depth: m.model?.max_depth ?? '?' })} />
            )}
            <SpecRow k={t('data.spec.classes')} v={classes} />
            <SpecRow k={t('data.spec.sensor')} v={t('data.spec.sensorValue', { hz: m.hz })} />
            <SpecRow k={t('data.spec.window')} v={t('data.spec.windowValue', { n: m.windowSeconds })} />
            <SpecRow k={t('data.spec.features')} v={String(m.featureNames.length)} />
            <SpecRow
              k={t('data.spec.size')}
              v={m.modelNodes !== undefined ? t('data.spec.sizeValue', { kb: kb(m.modelBytes), nodes: int(m.modelNodes) }) : kb(m.modelBytes)}
              testId="metric-size"
            />
            <SpecRow k={t('data.spec.test')} v={t('data.spec.testValue')} />
            <SpecRow k={t('data.spec.horses')} v={String(m.perFold.length)} />
            <SpecRow k={t('data.spec.windows')} v={int(m.windows)} />
            <SpecRow k={t('data.spec.trained')} v={m.trainedAt.slice(0, 10)} />
          </tbody>
        </Ledger>
      </Slip>

      <Slip className="ds-sheet">
        <h3 className="ds-h3">{t('data.test.h')}</h3>
        <p>{t('data.test.body', { horses: m.perFold.length, windows: int(m.windows) })}</p>
        <Ledger caption={t('data.results.caption')} className="ds-results">
          <thead>
            <tr>
              <th scope="col">{t('data.results.model')}</th>
              <th scope="col" className="num">
                {t('data.results.accuracy')}
              </th>
              <th scope="col" className="num">
                {t('data.results.f1')}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="ds-results__shipped">
              <th scope="row">{t('data.results.forest')}</th>
              <td className="num" data-testid="metric-accuracy">
                {pct(m.accuracy)}
              </td>
              <td className="num" data-testid="metric-f1">
                {dec(m.macroF1)}
              </td>
            </tr>
            <tr>
              <th scope="row">{t('data.results.baseline')}</th>
              <td className="num" data-testid="baseline-accuracy">
                {pct(m.baseline.accuracy)}
              </td>
              <td className="num">{dec(m.baseline.macroF1)}</td>
            </tr>
          </tbody>
        </Ledger>
        <p>{t('data.baseline.note', { gap: accuracyGapPoints(m) })}</p>
        <p>
          {t('data.folds', {
            low: pct(low.accuracy),
            lowName: low.heldOut,
            lowN: int(low.windows),
            high: pct(high.accuracy),
            highName: high.heldOut,
            highN: int(high.windows),
          })}
        </p>
      </Slip>

      <Slip className="ds-sheet">
        <Ledger caption={t('data.perclass.caption')} className="ds-perclass">
          <thead>
            <tr>
              <th scope="col">{t('data.perclass.activity')}</th>
              <th scope="col" className="num">
                {t('data.perclass.precision')}
              </th>
              <th scope="col" className="num">
                {t('data.perclass.recall')}
              </th>
              <th scope="col" className="num">
                {t('data.perclass.f1')}
              </th>
              <th scope="col" className="num">
                {t('data.perclass.windows')}
              </th>
            </tr>
          </thead>
          <tbody>
            {m.labels.map((c) => {
              const r = m.perClass[c]
              return (
                <tr key={c}>
                  <th scope="row">{c}</th>
                  <td className="num">{dec(r.precision, 2)}</td>
                  <td className="num">{dec(r.recall, 2)}</td>
                  <td className="num">{dec(r.f1, 2)}</td>
                  <td className="num">{int(r.support)}</td>
                </tr>
              )
            })}
          </tbody>
        </Ledger>
        <p className="ds-note">{t('data.perclass.note')}</p>

        <hr className="ds-rule" />

        <Ledger caption={t('data.confusion.caption')} className="ds-confusion">
          <thead>
            <tr>
              <td />
              <th scope="colgroup" colSpan={m.confusion.labels.length} className="ds-confusion__said">
                {t('data.confusion.said')}
              </th>
            </tr>
            <tr>
              <th scope="col">{t('data.confusion.true')}</th>
              {m.confusion.labels.map((c) => (
                <th key={c} scope="col" className="num">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.confusion.matrix.map((row, i) => (
              <tr key={m.confusion.labels[i]}>
                <th scope="row">{m.confusion.labels[i]}</th>
                {row.map((n, j) => (
                  <td key={j} className={i === j ? 'num ds-confusion__hit' : 'num'}>
                    {int(n)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Ledger>
        <p className="ds-note">
          {t('data.confusion.note', {
            count: int(mix.count),
            trueLabel: mix.trueLabel,
            predicted: mix.predicted,
            share: pct(mix.share),
          })}
        </p>
      </Slip>

      <Slip className="ds-sheet">
        <h3 className="ds-h3">{t('data.threshold.h')}</h3>
        <p>
          {t('data.threshold.body', {
            threshold: m.confidenceThreshold,
            coverage: pct(m.coverageAtThreshold),
            accuracy: pct(m.accuracyAtThreshold),
          })}
        </p>
        <p className="ds-callout">
          <StateStamp state="not_sure" showWord={false} id="data-threshold" />
          <span>{t('data.threshold.notSure')}</span>
        </p>
        {thresholdRule && <Recorded rule={thresholdRule} />}

        <hr className="ds-rule" />

        <h3 className="ds-h3">{t('data.roll.h')}</h3>
        {roll.kept ? (
          <p>{t('data.roll.kept')}</p>
        ) : (
          <p>
            {t('data.roll.failed', {
              n: roll.withRoll ? int(roll.withRoll.support) : '?',
              precision: roll.withRoll ? dec(roll.withRoll.precision, 2) : '?',
              recall: roll.withRoll ? dec(roll.withRoll.recall, 2) : '?',
              min: rollMin ?? '?',
            })}
          </p>
        )}
        <Recorded rule={roll.rule} />

        <hr className="ds-rule" />

        <h3 className="ds-h3">{t('data.limits.h')}</h3>
        <p>{t('data.limits.body')}</p>
      </Slip>
    </>
  )
}

function SpecRow({ k, v, testId }: { k: string; v: string; testId?: string }) {
  return (
    <tr>
      <th scope="row">{k}</th>
      <td data-testid={testId}>{v}</td>
    </tr>
  )
}

function Recorded({ rule }: { rule: string }) {
  const { t } = useT()
  return (
    <p className="ds-recorded">
      <MonoLabel>{t('data.rule.recorded')}</MonoLabel>
      <code>{rule}</code>
    </p>
  )
}

// ---------- 2. Data we built with ----------

type Tag = 'real' | 'simulated' | 'machine' | 'asset'

interface Entry {
  id: string
  tag: Tag
  body: ReactNode
  licence?: string
  link?: string
}

function BuiltWith({ m }: { m: DatasheetMetrics | undefined }) {
  const { t } = useT()
  const weather = getWeather()
  const labelled = m?.subjectsUsed.length
  const entries: Entry[] = [
    {
      id: 'horsing',
      tag: 'real',
      body: (
        <>
          {labelled !== undefined && <p>{t('data.src.horsing.body', { n: labelled })}</p>}
          <p className="ds-ref__cite">{m?.dataset.citation ?? 'Kamminga JW et al. 2019. Horsing Around. Data 4(4):131.'}</p>
        </>
      ),
      licence: m?.dataset.licence ?? 'CC0',
      link: m?.dataset.url ?? 'https://doi.org/10.4121/uuid:2e08745c-4178-4183-8551-f248c992cb14',
    },
    ...(m
      ? [
          {
            id: 'replay',
            tag: 'real' as const,
            body: <p>{t('data.src.replay.body', { name: m.replaySubject, n: m.subjectsInShippedModel.length })}</p>,
          },
        ]
      : []),
    { id: 'phone', tag: 'real', body: <p>{t('data.src.phone.body')}</p> },
    {
      id: 'herd',
      tag: 'simulated',
      body: <p>{t('data.src.herd.body', { n: HERD.length, households: HOUSEHOLDS.length, days: HISTORY_DAYS })}</p>,
    },
    { id: 'positions', tag: 'simulated', body: <p>{t('data.src.positions.body')}</p> },
    { id: 'scenarios', tag: 'simulated', body: <p>{t('data.src.scenarios.body', { n: SCENARIOS.length })}</p> },
    {
      id: 'weather',
      tag: 'real',
      body: (
        <p>
          {t('data.src.weather.body', { lat: TOWN_CENTRE.lat, lon: TOWN_CENTRE.lon })}
          {weather.filledFrom !== null && ` ${t('data.src.weather.filled')}`}
        </p>
      ),
      link: 'https://power.larc.nasa.gov/docs/services/api/temporal/hourly/',
    },
    { id: 'routes', tag: 'real', body: <p>{t('data.src.routes.body')}</p>, licence: 'ODbL 1.0' },
    {
      id: 'tiles',
      tag: 'real',
      body: <p>{t('data.src.tiles.body')}</p>,
      licence: 'OpenStreetMap ODbL 1.0, Copernicus DEM terms',
    },
    { id: 'models', tag: 'asset', body: <p>{t('data.src.models.body')}</p>, licence: 'CC0 1.0' },
    { id: 'voices', tag: 'machine', body: <p>{t('data.src.voices.body')}</p>, licence: 'CC BY-NC 4.0, non-commercial' },
  ]

  return (
    <Slip className="ds-sheet">
      <p className="ds-lead">{t('data.built.lead')}</p>
      <ul className="ds-entries">
        {entries.map((e) => (
          <li key={e.id} className="ds-entry">
            <div className="ds-entry__head">
              <h3 className="ds-entry__name">{t(`data.src.${e.id}.name`)}</h3>
              <span className={`ds-tag ds-tag--${e.tag}`}>{t(`data.tag.${e.tag}`)}</span>
            </div>
            {e.body}
            {(e.licence || e.link) && (
              <p className="ds-entry__meta">
                {e.licence && <span>{t('data.licence', { licence: e.licence })}</span>}
                {e.link && (
                  <a href={e.link} target="_blank" rel="noreferrer">
                    {e.link.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Slip>
  )
}

// ---------- 3. Rules and assumptions ----------

function RulesSection({ rollN }: { rollN: number | undefined }) {
  const { t } = useT()
  const notSure = [
    t('data.rules.notSure.baseline', { days: MIN_BASELINE_DAYS }),
    t('data.rules.notSure.coverage', { pct: Math.round(RULES.minCoverage24h * 100) }),
    t('data.rules.notSure.stale', { hours: RULES.staleAfterH }),
    t('data.rules.notSure.model', { pct: Math.round(RULES.maxUnknownShare * 100) }),
  ]
  const when: Record<string, ReactNode> = {
    normal: t('data.rules.state.normal'),
    water: t('data.rules.state.water', { pct: WATER_BANDS.offer, hours: MAX_WORK_WITHOUT_WATER_H }),
    check: t('data.rules.state.check'),
    urgent: t('data.rules.state.urgent'),
    not_sure: (
      <>
        {t('data.rules.state.not_sure')}
        <ul className="ds-sublist">
          {notSure.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </>
    ),
  }
  return (
    <Slip className="ds-sheet">
      <p className="ds-lead">{t('data.rules.lead')}</p>

      <div className="ds-h3row">
        <h3 className="ds-h3">{t('data.rules.exp.h')}</h3>
        <RectStamp kind="experimental" id="data-exp" />
      </div>
      <p>{t('data.rules.exp.body', { roll: rollN ?? '?' })}</p>
      <ul className="ds-list">
        <li>{t('data.rules.lying')}</li>
        <li>{t('data.rules.rolling')}</li>
        <li>{t('data.rules.fall')}</li>
      </ul>

      <hr className="ds-rule" />

      <div className="ds-h3row">
        <h3 className="ds-h3">{t('data.rules.water.h')}</h3>
        <RectStamp kind="custom" text={t('data.rules.assumption')} tone="graphite" id="data-assume" />
      </div>
      <p>
        {t('data.rules.water.body', { factor: DONKEY_SWEAT_FACTOR, forage: Math.round(FORAGE_SHARE * 100) })}
      </p>

      <hr className="ds-rule" />

      <h3 className="ds-h3">{t('data.rules.baseline.h')}</h3>
      <p>
        {t('data.rules.baseline.body', {
          days: BASELINE_DAYS,
          zDonkey: PROFILES.donkey.departZ,
          zHorse: PROFILES.horse.departZ,
        })}
      </p>

      <Ledger caption={t('data.rules.states.caption')} className="ds-states">
        <thead>
          <tr>
            <th scope="col">{t('data.rules.states.state')}</th>
            <th scope="col">{t('data.rules.states.when')}</th>
          </tr>
        </thead>
        <tbody>
          {STATES.map((s) => (
            <tr key={s}>
              <th scope="row">
                <StateStamp state={s} id={`data-${s}`} />
              </th>
              <td>{when[s]}</td>
            </tr>
          ))}
        </tbody>
      </Ledger>
    </Slip>
  )
}

// ---------- 4. What our data does not cover ----------

function Gaps({ rollN }: { rollN: number | undefined }) {
  const { t } = useT()
  const items: { id: string; params?: Record<string, string | number>; closeParams?: Record<string, string | number> }[] = [
    { id: 'colic' },
    { id: 'donkeys' },
    { id: 'place' },
    { id: 'lying' },
    { id: 'rolling', params: { n: rollN ?? '?' } },
    { id: 'eating' },
    { id: 'baseline', closeParams: { days: LEARNING_DAYS } },
    { id: 'figure' },
    { id: 'phone' },
    { id: 'language' },
  ]
  return (
    <section id="data-gaps" className="ds-gaps" aria-labelledby="data-gaps-h">
      <Slip tone="kraft" className="ds-gaps__slip">
        <Tape placement="top-left" angle={-7} />
        <Tape placement="top-right" angle={5} />
        <NumberedHeading n={4} id="data-gaps-h">
          {t('data.gaps.h')}
        </NumberedHeading>
        <p className="ds-gaps__sub">{t('data.gaps.sub', { n: items.length })}</p>
        <ol className="ds-gaps__list">
          {items.map((it, i) => (
            <li key={it.id} className="ds-gap">
              <span className="ds-gap__n" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="ds-gap__text">
                <p className="ds-gap__what">{t(`data.gaps.${it.id}`, it.params)}</p>
                <p className="ds-gap__close">
                  <span className="ds-gap__closeLabel">{t('data.gaps.close')}:</span> {t(`data.gaps.${it.id}.close`, it.closeParams)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Slip>
    </section>
  )
}

