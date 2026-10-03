// A small trend line for lists and ledgers. Hatched normal band, ink line, excursions in the state ink.
import { scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'
import { useId } from 'react'
import { stateInk } from '../tokens'
import type { StateId } from '../types'
import { safeId } from '../ui/geometry'

export interface SparklineProps {
  values: readonly (number | null)[]
  /** Normal range, drawn as a hatched band. */
  low?: number
  high?: number
  /** State ink for points outside the band. Default 'check'. */
  state?: StateId
  width?: number
  height?: number
  /** Accessible description, e.g. "Activity, last 7 days, below normal on the last 2 days". */
  label: string
  className?: string
}

export function Sparkline({ values, low, high, state = 'check', width = 96, height = 28, label, className }: SparklineProps) {
  const uid = `sp${safeId(useId())}`
  const nums = values.filter((v): v is number => v != null)
  const lo = Math.min(...nums, low ?? Infinity)
  const hi = Math.max(...nums, high ?? -Infinity)
  const x = scaleLinear().domain([0, Math.max(1, values.length - 1)]).range([2, width - 2])
  const y = scaleLinear().domain([lo, hi === lo ? lo + 1 : hi]).range([height - 3, 3])
  const d =
    line<number | null>()
      .defined((v) => v != null)
      .x((_, i) => x(i))
      .y((v) => y(v as number))(values as (number | null)[]) ?? ''
  const hasBand = low != null && high != null
  const last = values.length - 1
  const lastV = values[last]
  const outside = hasBand && lastV != null && (lastV < low || lastV > high)
  return (
    <svg className={['ui-sparkline', className].filter(Boolean).join(' ')} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <defs>
        <pattern id={`${uid}-h`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="var(--hatch)" strokeWidth="1" />
        </pattern>
      </defs>
      {hasBand && <rect x={0} y={y(high)} width={width} height={Math.max(1, y(low) - y(high))} fill={`url(#${uid}-h)`} />}
      <path d={d} fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {lastV != null && <circle cx={x(last)} cy={y(lastV)} r={2.6} fill={outside ? stateInk(state) : 'var(--ink)'} />}
    </svg>
  )
}
