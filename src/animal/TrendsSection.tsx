// Section 2, Trends: a range switch and three charts at a time. Behaviour (activity, eating,
// lying) or work and water (workload, distance, and water deficit for today).
import { useMemo, useState } from 'react'
import { useT } from '../i18n/LanguageContext'
import { BandChart } from '../shared/charts'
import type { Animal, HourBudget, StateId } from '../shared/types'
import { EmptyNote, NumberedHeading, RectStamp, Tabs } from '../shared/ui'
import { dailyTrend, todayTrend, type CardSignal, type Range, type Trend } from './readings'

type Group = 'behaviour' | 'work'
const RANGES: readonly Range[] = ['today', 'd7', 'd30', 'm6']
const GROUPS: Record<Group, readonly CardSignal[]> = {
  behaviour: ['activity', 'eating', 'lying'],
  work: ['workload', 'distance', 'waterDebt'],
}

export interface TrendsSectionProps {
  animal: Animal
  budgets: HourBudget[]
  /** State ink for the part of a line outside the band. */
  ink: StateId
  learning?: { day: number; of: number }
  /** First signal to show in the behaviour group, usually the one behind the state. */
  main: CardSignal
  now: number
}

export function TrendsSection({ animal, budgets, ink, learning, main, now }: TrendsSectionProps) {
  const { t } = useT()
  const [range, setRange] = useState<Range>('today')
  const [group, setGroup] = useState<Group>(
    main === 'waterDebt' || main === 'workload' || main === 'distance' ? 'work' : 'behaviour',
  )

  const signals = useMemo(() => {
    const list = GROUPS[group].filter((s) => range === 'today' || s !== 'waterDebt')
    // The signal behind the state comes first.
    return list.includes(main) ? [main, ...list.filter((s) => s !== main)] : list
  }, [group, range, main])

  const trends = useMemo(
    () =>
      signals.map((s) => ({
        signal: s,
        trend:
          range === 'today'
            ? todayTrend(animal, budgets, s, now)
            : dailyTrend(animal, budgets, s as Exclude<CardSignal, 'waterDebt'>, range, now),
      })),
    [signals, range, animal, budgets, now],
  )

  const unitKey = (s: CardSignal) => `animal.chartUnit.${range === 'today' ? 'today' : 'day'}.${s}`
  const desc = range === 'today' ? 'animal.chart.descToday' : range === 'd7' ? 'animal.chart.descWeek' : 'animal.chart.desc'

  return (
    <section className="animal-section" aria-labelledby="animal-trends-h">
      <NumberedHeading n={2} id="animal-trends-h">
        {t('animal.trends.title')}
      </NumberedHeading>
      {learning ? (
        <EmptyNote>{t('animal.trends.learning', { name: animal.name, day: learning.day, of: learning.of })}</EmptyNote>
      ) : (
        <>
          <div className="animal-trends__switch">
            <Tabs
              label={t('animal.trends.range')}
              items={RANGES.map((r) => ({ id: r, label: t(`animal.range.${r}`) }))}
              value={range}
              onChange={(id) => setRange(id as Range)}
              idPrefix="animal-range"
              controls="animal-trends-panel"
            />
            <Tabs
              className="animal-trends__group"
              label={t('animal.trends.group')}
              items={(['behaviour', 'work'] as const).map((g) => ({ id: g, label: t(`animal.trends.${g}`) }))}
              value={group}
              onChange={(id) => setGroup(id as Group)}
              idPrefix="animal-group"
              controls="animal-trends-panel"
            />
          </div>
          <div id="animal-trends-panel" role="tabpanel" aria-labelledby={`animal-range-${range}`} className="animal-trends">
            {trends.map(({ signal, trend }, i) => (
              <TrendChart
                key={`${range}-${signal}`}
                trend={trend}
                title={t('animal.chart.title', {
                  signal: t(`animal.card.${signal}`),
                  range: t(`animal.range.${range}`).toLowerCase(),
                })}
                desc={t(desc, { name: animal.name })}
                unit={t(unitKey(signal))}
                ink={ink}
                experimental={signal === 'lying'}
                legend={i === 0}
                height={i === 0 ? 200 : 170}
                id={`${animal.id}:${range}:${signal}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

interface TrendChartProps {
  trend: Trend
  title: string
  desc: string
  unit: string
  ink: StateId
  experimental: boolean
  legend: boolean
  /** Plot height in px. The first chart, the signal behind the state, is a little taller. */
  height: number
  id: string
}

function TrendChart({ trend, title, desc, unit, ink, experimental, legend, height, id }: TrendChartProps) {
  const { t } = useT()
  const hasData = trend.data.some((p) => p.value != null)
  return (
    <div className="animal-chart">
      <div className="animal-chart__head">
        <h3 className="animal-h3">{title}</h3>
        {experimental && <RectStamp kind="experimental" id={`${id}:exp`} />}
      </div>
      {hasData ? (
        <BandChart
          data={trend.data}
          forecast={trend.forecast}
          now={trend.now}
          state={ink}
          title={title}
          desc={desc}
          unit={unit}
          height={height}
          legend={legend}
        />
      ) : (
        <p className="animal-note">{t('animal.trends.noData')}</p>
      )}
    </div>
  )
}
