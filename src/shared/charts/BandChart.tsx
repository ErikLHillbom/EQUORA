// Trend chart (DESIGN 9, Animal screen): graph paper, the normal band as pencil hatching,
// the measured value as an ink line, the part outside the band redrawn in the state ink,
// and an optional forecast (dashed median and a lighter hatched P10 to P90 band) after "now".
import { scaleLinear, scaleUtc } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'
import { useId, useMemo } from 'react'
import { useT } from '../../i18n/LanguageContext'
import { TZ_OFFSET_MS } from '../lib/clock'
import { stateInk } from '../tokens'
import type { ForecastPoint, StateId } from '../types'
import { safeId } from '../ui/geometry'
import { useWidth } from './useWidth'
import './charts.css'

export interface BandPoint {
  /** Epoch ms. */
  t: number
  /** Measured value. null leaves a gap. */
  value: number | null
  /** The animal's normal range at this time. */
  low: number
  high: number
}

export interface BandChartProps {
  data: readonly BandPoint[]
  /** Forecast after now. Uses p10, p50 and p90. */
  forecast?: readonly ForecastPoint[]
  /** Time of the "now" marker. Defaults to the last measured point when a forecast is given. */
  now?: number
  /** State ink for the part of the line outside the band. Default 'check'. */
  state?: StateId
  /** Accessible title, e.g. "Activity, last 7 days". */
  title: string
  /** Accessible description: what the chart shows in one or two sentences. */
  desc?: string
  unit?: string
  /** Plot height in px. Default 200. */
  height?: number
  yDomain?: readonly [number, number]
  /** Tick label for a time. Default: HH:MM for spans up to two days, else MM-DD (local time). */
  formatX?: (t: number) => string
  formatY?: (v: number) => string
  /** Show the legend under the chart. Default true. */
  legend?: boolean
  className?: string
}

const M = { top: 12, right: 10, bottom: 26, left: 36 }
const pad2 = (n: number) => String(n).padStart(2, '0')

function defaultFormatX(span: number) {
  return (t: number) => {
    const d = new Date(t + TZ_OFFSET_MS)
    return span <= 2 * 86400000
      ? `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`
      : `${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
  }
}

export function BandChart({
  data,
  forecast,
  now,
  state = 'check',
  title,
  desc,
  unit,
  height = 200,
  yDomain,
  formatX,
  formatY,
  legend = true,
  className,
}: BandChartProps) {
  const { t } = useT()
  const uid = `bc${safeId(useId())}`
  const [ref, width] = useWidth<HTMLDivElement>(328)
  const fc = useMemo(() => forecast ?? [], [forecast])
  const nowT = now ?? (fc.length > 0 && data.length > 0 ? data[data.length - 1].t : undefined)

  const geo = useMemo(() => {
    const innerW = Math.max(120, width - M.left - M.right)
    const innerH = Math.max(80, height - M.top - M.bottom)
    const times = [...data.map((d) => d.t), ...fc.map((f) => f.t)]
    const t0 = Math.min(...times)
    const t1 = Math.max(...times)
    const values = [
      ...data.flatMap((d) => [d.low, d.high, d.value ?? d.low]),
      ...fc.flatMap((f) => [f.p10, f.p90]),
    ]
    const [y0, y1] = yDomain ?? [Math.min(0, ...values), Math.max(...values) * 1.08]
    // Local-time scale: shift epoch ms by the Ethiopian offset, read with UTC getters.
    const x = scaleUtc()
      .domain([new Date(t0 + TZ_OFFSET_MS), new Date(t1 + TZ_OFFSET_MS)])
      .range([0, innerW])
    const xt = (v: number) => x(new Date(v + TZ_OFFSET_MS))
    const y = scaleLinear().domain([y0, y1]).nice(4).range([innerH, 0])
    const band = area<BandPoint>()
      .x((d) => xt(d.t))
      .y0((d) => y(d.low))
      .y1((d) => y(d.high))
      .curve(curveMonotoneX)
    const measured = line<BandPoint>()
      .defined((d) => d.value != null)
      .x((d) => xt(d.t))
      .y((d) => y(d.value as number))
      .curve(curveMonotoneX)
    const fBand = area<ForecastPoint>()
      .x((d) => xt(d.t))
      .y0((d) => y(d.p10))
      .y1((d) => y(d.p90))
      .curve(curveMonotoneX)
    const fLine = line<ForecastPoint>()
      .x((d) => xt(d.t))
      .y((d) => y(d.p50))
      .curve(curveMonotoneX)
    const fmt = formatX ?? defaultFormatX(t1 - t0)
    const xTicks = x.ticks(innerW < 260 ? 3 : 4).map((d) => {
      const v = d.getTime() - TZ_OFFSET_MS
      return { x: xt(v), label: fmt(v) }
    })
    const yTicks = y.ticks(4).map((v) => ({ y: y(v), label: formatY ? formatY(v) : String(v) }))
    return {
      innerW,
      innerH,
      bandPath: band(data as BandPoint[]) ?? '',
      linePath: measured(data as BandPoint[]) ?? '',
      fBandPath: fc.length ? (fBand(fc as ForecastPoint[]) ?? '') : '',
      fLinePath: fc.length ? (fLine(fc as ForecastPoint[]) ?? '') : '',
      nowX: nowT != null ? xt(nowT) : undefined,
      xTicks,
      yTicks,
    }
  }, [data, fc, width, height, yDomain, formatX, formatY, nowT])

  const { innerW, innerH } = geo
  const corner = 4
  return (
    <figure className={['ui-chart', className].filter(Boolean).join(' ')} ref={ref}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={title}
        aria-describedby={desc ? `${uid}-d` : undefined}
      >
        <title id={`${uid}-t`}>{title}</title>
        {desc && <desc id={`${uid}-d`}>{desc}</desc>}
        <defs>
          <pattern id={`${uid}-minor`} width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M8 0H0V8" fill="none" stroke="var(--grid-minor)" strokeWidth="1" />
          </pattern>
          <pattern id={`${uid}-grid`} width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill={`url(#${uid}-minor)`} />
            <path d="M40 0H0V40" fill="none" stroke="var(--grid-major)" strokeWidth="1" />
          </pattern>
          <pattern id={`${uid}-hatch`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
            <line x1="0" y1="0" x2="0" y2="5" stroke="var(--hatch)" strokeWidth="1.1" />
          </pattern>
          <pattern id={`${uid}-fhatch`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="var(--hatch)" strokeWidth="0.7" opacity="0.6" />
          </pattern>
          <clipPath id={`${uid}-plot`}>
            <rect width={innerW} height={innerH} />
          </clipPath>
          {/* Shows the measured line only where it leaves the normal band. */}
          <mask id={`${uid}-outside`} maskUnits="userSpaceOnUse" x={-10} y={-10} width={innerW + 20} height={innerH + 20}>
            <rect x={-10} y={-10} width={innerW + 20} height={innerH + 20} fill="#fff" />
            <path d={geo.bandPath} fill="#000" />
          </mask>
        </defs>
        <g transform={`translate(${M.left} ${M.top})`}>
          <rect width={innerW} height={innerH} fill="var(--paper-raised)" />
          <rect width={innerW} height={innerH} fill={`url(#${uid}-grid)`} />
          {[
            [0, 0],
            [innerW - corner, 0],
            [0, innerH - corner],
            [innerW - corner, innerH - corner],
          ].map(([cx, cy]) => (
            <rect key={`${cx}-${cy}`} x={cx} y={cy} width={corner} height={corner} fill="var(--ink)" />
          ))}
          <g clipPath={`url(#${uid}-plot)`}>
            <path d={geo.bandPath} fill={`url(#${uid}-hatch)`} stroke="var(--graphite)" strokeWidth="0.6" strokeOpacity="0.55" />
            {geo.fBandPath && (
              <path d={geo.fBandPath} fill={`url(#${uid}-fhatch)`} stroke="var(--graphite)" strokeWidth="0.6" strokeOpacity="0.35" strokeDasharray="2 3" />
            )}
            {geo.fLinePath && (
              <path d={geo.fLinePath} fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="5 4" strokeLinecap="round" />
            )}
            <path d={geo.linePath} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <path
              d={geo.linePath}
              fill="none"
              stroke={stateInk(state)}
              strokeWidth="2.8"
              strokeLinejoin="round"
              strokeLinecap="round"
              mask={`url(#${uid}-outside)`}
            />
          </g>
          {geo.nowX != null && (
            <g className="ui-chart-now">
              <line x1={geo.nowX} x2={geo.nowX} y1={0} y2={innerH} stroke="var(--ink)" strokeWidth="1" strokeDasharray="2 3" />
              <text x={geo.nowX + 4} y={10} className="ui-chart-label ui-chart-label--ink">
                {t('shared.chart.now')}
              </text>
            </g>
          )}
          {geo.yTicks.map((tk) => (
            <text key={`y${tk.label}`} x={-6} y={tk.y} dy="0.32em" textAnchor="end" className="ui-chart-label">
              {tk.label}
            </text>
          ))}
          {geo.xTicks.map((tk) => (
            <text key={`x${tk.x}`} x={tk.x} y={innerH + 17} textAnchor="middle" className="ui-chart-label">
              {tk.label}
            </text>
          ))}
          {unit && (
            <text x={-6} y={-3} textAnchor="end" className="ui-chart-label">
              {unit}
            </text>
          )}
        </g>
      </svg>
      {legend && (
        <figcaption className="ui-chart-legend" aria-hidden="true">
          <span className="ui-chart-key">
            <svg width="22" height="12" viewBox="0 0 22 12">
              <rect width="22" height="12" fill={`url(#${uid}-hatch)`} stroke="var(--graphite)" strokeWidth="0.6" strokeOpacity="0.55" />
            </svg>
            {t('shared.chart.normalBand')}
          </span>
          <span className="ui-chart-key">
            <svg width="22" height="12" viewBox="0 0 22 12">
              <line x1="1" y1="6" x2="21" y2="6" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {t('shared.chart.actual')}
          </span>
          {fc.length > 0 && (
            <>
              <span className="ui-chart-key">
                <svg width="22" height="12" viewBox="0 0 22 12">
                  <line x1="1" y1="6" x2="21" y2="6" stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="5 4" strokeLinecap="round" />
                </svg>
                {t('shared.chart.forecast')}
              </span>
              <span className="ui-chart-key">
                <svg width="22" height="12" viewBox="0 0 22 12">
                  <rect width="22" height="12" fill={`url(#${uid}-fhatch)`} stroke="var(--graphite)" strokeWidth="0.6" strokeOpacity="0.4" strokeDasharray="2 3" />
                </svg>
                {t('shared.chart.forecastRange')}
              </span>
            </>
          )}
        </figcaption>
      )}
    </figure>
  )
}
