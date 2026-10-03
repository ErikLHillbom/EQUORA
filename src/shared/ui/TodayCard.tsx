// Today cards (DESIGN 9, Animal screen): a label, one big number, the animal's normal, a dot bar.
import type { ReactNode } from 'react'
import { useT } from '../../i18n/LanguageContext'
import { stateInk } from '../tokens'
import type { StateId } from '../types'
import { DotNumber } from './DotNumber'
import { PencilUnderline } from './Pencil'
import { RectStamp } from './Stamp'

function fmt(n: number, decimals: number): string {
  return n.toFixed(decimals)
}

export interface DotBarProps {
  value: number
  low: number
  high: number
  /** Domain of the bar. Defaults to the normal range widened by 75% on each side, and always includes the value. */
  min?: number
  max?: number
  /** State ink for today's dot when it is outside the normal. Default 'check'. */
  state?: StateId
  /** Number of dots. Default 23. */
  dots?: number
  /** Accessible description. Defaults to a sentence with today and the range. */
  label?: string
  decimals?: number
}

/** A short row of dots: filled inside the normal range, hollow outside, today as a large dot. */
export function DotBar({ value, low, high, min, max, state = 'check', dots = 23, label, decimals = 1 }: DotBarProps) {
  const { t } = useT()
  const span = Math.max(high - low, Math.abs(high) * 0.1, 1e-6)
  let lo = min ?? low - span * 0.75
  let hi = max ?? high + span * 0.75
  lo = Math.min(lo, value)
  hi = Math.max(hi, value)
  const outside = value < low || value > high
  const step = 10
  const width = (dots - 1) * step + 12
  const x = (v: number) => 6 + ((v - lo) / (hi - lo || 1)) * (dots - 1) * step
  const todayX = Math.min(Math.max(x(value), 6), width - 6)
  const params = { value: fmt(value, decimals), low: fmt(low, decimals), high: fmt(high, decimals) }
  const text = label ?? t(outside ? 'shared.dotbar.outside' : 'shared.dotbar.label', params)
  return (
    <svg
      className="ui-dotbar"
      viewBox={`0 0 ${width} 16`}
      role="img"
      aria-label={text}
      preserveAspectRatio="xMinYMid meet"
    >
      {Array.from({ length: dots }, (_, i) => {
        const v = lo + (i / (dots - 1)) * (hi - lo)
        const inside = v >= low && v <= high
        const cx = 6 + i * step
        return inside ? (
          <circle key={i} cx={cx} cy={8} r={2.4} fill="var(--graphite)" />
        ) : (
          <circle key={i} cx={cx} cy={8} r={2} fill="none" stroke="var(--graphite)" strokeWidth={0.9} />
        )
      })}
      <circle
        cx={todayX}
        cy={8}
        r={5.2}
        fill={outside ? stateInk(state) : 'var(--ink)'}
        stroke="var(--paper-raised)"
        strokeWidth={1.5}
      />
    </svg>
  )
}

export interface TodayCardProps {
  /** Short label, three words or fewer, set in mono caps by CSS. */
  label: string
  /** Today's value. null shows "No data". */
  value: number | null
  unit?: string
  /** Animal name for "Normal for {name}: x to y". */
  name: string
  /** The animal's normal range for this signal. Omit while the baseline is still learned. */
  low?: number | null
  high?: number | null
  /** State ink used when the value is outside the normal. Default 'check'. */
  state?: StateId
  decimals?: number
  /** Draw the main number as a dot matrix (only for the one main number per screen). */
  dotMatrix?: boolean
  /** Adds the Experimental stamp (lying, rolling and head-position readouts). */
  experimental?: boolean
  /** Underline a value outside the normal. Turn off on all but the one card that matters most. Default true. */
  highlight?: boolean
  /** Seed for the underline wobble. */
  id?: string
  /** Optional footnote under the dot bar. */
  children?: ReactNode
  className?: string
}

export function TodayCard({
  label,
  value,
  unit,
  name,
  low,
  high,
  state = 'check',
  decimals = 1,
  dotMatrix = false,
  experimental = false,
  highlight = true,
  id,
  children,
  className,
}: TodayCardProps) {
  const { t } = useT()
  const hasRange = low != null && high != null
  const outside = value != null && hasRange && (value < low || value > high)
  const shown = value == null ? null : fmt(value, decimals)
  const number =
    shown == null ? (
      <span className="ui-today-nodata">{t('shared.today.noData')}</span>
    ) : dotMatrix ? (
      <DotNumber value={shown} height={48} label={unit ? `${shown} ${unit}` : shown} />
    ) : (
      <span className="ui-today-number mono">{shown}</span>
    )
  const seed = id ?? label
  return (
    <article className={['ui-slip', 'ui-today', className].filter(Boolean).join(' ')} data-outside={outside || undefined}>
      <header className="ui-today-head">
        <h3 className="ui-label">{label}</h3>
        {experimental && <RectStamp kind="experimental" id={`${seed}:exp`} />}
      </header>
      <p className="ui-today-value">
        {outside && highlight ? (
          <PencilUnderline state={state} id={seed}>
            {number}
          </PencilUnderline>
        ) : (
          number
        )}
        {unit && shown != null && <span className="ui-today-unit mono">{unit}</span>}
      </p>
      <p className="ui-today-normal">
        {hasRange
          ? t(unit ? 'shared.today.normalFor' : 'shared.today.normalForNoUnit', {
              name,
              low: fmt(low, decimals),
              high: fmt(high, decimals),
              unit: unit ?? '',
            })
          : t('shared.today.learning')}
      </p>
      {hasRange && value != null && <DotBar value={value} low={low} high={high} state={state} decimals={decimals} />}
      {children && <div className="ui-today-foot">{children}</div>}
    </article>
  )
}
