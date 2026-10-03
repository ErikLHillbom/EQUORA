// Rubber stamps (DESIGN 8). Each state has its own shape, so greyscale still shows every state.
import { useId, type CSSProperties, type ReactNode } from 'react'
import { useT } from '../../i18n/LanguageContext'
import { formatDate, formatTime } from '../lib/clock'
import { seededAngle } from '../lib/random'
import { STATE_SHAPE, stateInk, stateText, type StateShape } from '../tokens'
import type { FeedbackId, StateId } from '../types'
import { safeId } from './geometry'
import { wearProps } from './helpers'
import { WearDefs } from './Wear'

export type StampShape = StateShape

const OCTAGON = Array.from({ length: 8 }, (_, i) => {
  const a = ((22.5 + i * 45) * Math.PI) / 180
  return `${(50 + Math.cos(a) * 47).toFixed(1)},${(50 + Math.sin(a) * 47).toFixed(1)}`
}).join(' ')

const DROP = 'M50 3C59 19 84 42 84 63A34 34 0 0 1 16 63C16 42 41 19 50 3Z'
const TRIANGLE = '50,9 95,89 5,89'

/** Centre of each shape, used to scale the inner rim. */
const CENTRE: Record<StampShape, [number, number]> = {
  circle: [50, 50],
  dashedCircle: [50, 50],
  drop: [50, 64],
  triangle: [50, 63],
  octagon: [50, 50],
}

function ShapeGeometry({ shape, ink, small, rim }: { shape: StampShape; ink: string; small: boolean; rim: boolean }) {
  const ring = small ? 11 : 8
  switch (shape) {
    case 'circle':
      return (
        <>
          <circle cx={50} cy={50} r={44 - ring / 2 + 2} fill="none" stroke={ink} strokeWidth={ring} />
          {rim && <circle cx={50} cy={50} r={30} fill="none" stroke={ink} strokeWidth={3} />}
        </>
      )
    case 'dashedCircle':
      return (
        <circle
          cx={50}
          cy={50}
          r={44 - ring / 2 + 2}
          fill="none"
          stroke={ink}
          strokeWidth={ring}
          pathLength={110}
          strokeDasharray={small ? '6.2 3.8' : '5.5 4.5'}
        />
      )
    case 'drop':
      return <path d={DROP} fill={ink} />
    case 'triangle':
      return <polygon points={TRIANGLE} fill={ink} stroke={ink} strokeWidth={6} strokeLinejoin="round" />
    case 'octagon':
      return <polygon points={OCTAGON} fill={ink} />
  }
}

function Rim({ shape }: { shape: StampShape }) {
  const [cx, cy] = CENTRE[shape]
  const k = shape === 'triangle' ? 0.7 : 0.8
  const t = `translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})`
  const common = { fill: 'none', stroke: 'var(--paper-raised)', strokeWidth: 3 / k, transform: t }
  if (shape === 'drop') return <path d={DROP} {...common} />
  if (shape === 'triangle') return <polygon points={TRIANGLE} {...common} strokeLinejoin="round" />
  if (shape === 'octagon') return <polygon points={OCTAGON} {...common} />
  return null
}

export interface StampProps {
  shape: StampShape
  /** Rendered size in px. */
  size: number
  /** CSS colour for the ink, for example stateInk('urgent') or 'var(--ink)'. */
  ink: string
  /** Seed for rotation and wear, usually the animal id. */
  seed: string
  /** Border rotation in degrees. Defaults to a fixed angle from the seed, at most 2 degrees. */
  rotate?: number
  /** Accessible name. Without it the stamp is hidden from screen readers (the word sits beside it). */
  label?: string
  /** Inner paper rim on filled shapes and a second ring on circles. On by default from 40 px. */
  rim?: boolean
  className?: string
}

/** A single stamp shape in SVG, with seeded ink wear. */
export function Stamp({ shape, size, ink, seed, rotate, label, rim, className }: StampProps) {
  const uid = `st${safeId(useId())}`
  const angle = rotate ?? seededAngle(seed, 2)
  const small = size < 40
  const showRim = rim ?? !small
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const }
  return (
    <svg
      className={['ui-stamp', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      focusable="false"
      {...a11y}
    >
      <WearDefs uid={uid} seed={seed} voidFrequency={small ? 0.16 : 0.085} voids={small ? 3.9 : 4.35} roughScale={small ? 2.5 : 2} />
      <g transform={`rotate(${angle.toFixed(2)} 50 50)`}>
        <g {...wearProps(uid)}>
          <ShapeGeometry shape={shape} ink={ink} small={small} rim={showRim && shape === 'circle'} />
          {showRim && shape !== 'circle' && <Rim shape={shape} />}
        </g>
      </g>
    </svg>
  )
}

export interface StateStampProps {
  state: StateId
  /** inline: 22 px shape with the word beside it. large: 76 px shape with the word below. */
  size?: 'inline' | 'large'
  /** Show the state word. When false the stamp carries it as its accessible name. Default true. */
  showWord?: boolean
  /** Seed for rotation and wear, usually the animal id. */
  id?: string
  className?: string
}

/** The state badge: shape, colour and word together (SPEC 5). */
export function StateStamp({ state, size = 'inline', showWord = true, id = 'stamp', className }: StateStampProps) {
  const { t } = useT()
  const word = t(`shared.state.${state}`)
  const px = size === 'large' ? 76 : 22
  return (
    <span
      className={['ui-statestamp', `ui-statestamp--${size}`, className].filter(Boolean).join(' ')}
      data-state={state}
    >
      <Stamp
        shape={STATE_SHAPE[state]}
        size={px}
        ink={stateInk(state)}
        seed={`${id}:${state}`}
        label={showWord ? undefined : word}
      />
      {showWord && (
        <span className="ui-statestamp-word" style={{ color: stateText(state) }}>
          {word}
        </span>
      )}
    </span>
  )
}

interface RectFrameProps {
  seed: string
  children: ReactNode
  tone: 'ink' | 'graphite'
  variant: string
  className?: string
  as?: 'span' | 'p' | 'time'
  dateTime?: string
}

/** Rectangular stamp: real text, with a worn border rotated a little from the seed. */
function RectFrame({ seed, children, tone, variant, className, as = 'span', dateTime }: RectFrameProps) {
  const uid = `rs${safeId(useId())}`
  const angle = seededAngle(`rect:${seed}`, 2)
  const style = { '--stamp-rot': `${angle.toFixed(2)}deg` } as CSSProperties
  const Tag = as
  return (
    <Tag
      className={['ui-rectstamp', `ui-rectstamp--${variant}`, `ui-rectstamp--${tone}`, className]
        .filter(Boolean)
        .join(' ')}
      style={style}
      dateTime={dateTime}
    >
      <svg className="ui-rectstamp-border" aria-hidden="true" focusable="false">
        <WearDefs
          uid={uid}
          seed={seed}
          voidFrequency={0.16}
          roughFrequency={0.5}
          roughScale={1.6}
          region={{ x: '-5%', y: '-20%', width: '110%', height: '140%' }}
        />
        <g {...wearProps(uid)}>
          <rect x="0" y="0" width="100%" height="100%" rx="3" fill="none" stroke="currentColor" />
        </g>
      </svg>
      <span className="ui-rectstamp-text">{children}</span>
    </Tag>
  )
}

export type RectStampProps = { id?: string; className?: string } & (
  | { kind: 'simulated' }
  | { kind: 'experimental' }
  | { kind: 'learning'; name: string; day: number; of: number }
  | { kind: 'feedback'; feedback: FeedbackId }
  | { kind: 'custom'; text: string; tone?: 'ink' | 'graphite' }
)

/** Ink or graphite stamps that are never state colours: honesty, learning and owner feedback. */
export function RectStamp(props: RectStampProps) {
  const { t } = useT()
  const seed = props.id ?? props.kind
  switch (props.kind) {
    case 'simulated':
      return (
        <RectFrame seed={seed} tone="ink" variant="caps" className={props.className}>
          {t('shared.stamp.simulated')}
        </RectFrame>
      )
    case 'experimental':
      return (
        <RectFrame seed={seed} tone="graphite" variant="caps" className={props.className}>
          {t('shared.stamp.experimental')}
        </RectFrame>
      )
    case 'learning':
      return (
        <RectFrame seed={seed} tone="graphite" variant="sentence" className={props.className}>
          {t('shared.stamp.learning', { name: props.name, day: props.day, of: props.of })}
        </RectFrame>
      )
    case 'feedback':
      return (
        <RectFrame seed={`${seed}:${props.feedback}`} tone="ink" variant="caps" className={props.className}>
          {t(`shared.feedback.${props.feedback}`)}
        </RectFrame>
      )
    case 'custom':
      return (
        <RectFrame seed={seed} tone={props.tone ?? 'ink'} variant="caps" className={props.className}>
          {props.text}
        </RectFrame>
      )
  }
}

export interface DateStampProps {
  /** Epoch ms. Shown in Ethiopian local time (UTC+3). */
  at: number
  /** Add the time of day, 24 h. Default true. */
  withTime?: boolean
  id?: string
  className?: string
}

/** Mono date stamp, like a date stamper on a logbook entry. */
export function DateStamp({ at, withTime = true, id, className }: DateStampProps) {
  const text = withTime ? `${formatDate(at)} ${formatTime(at)}` : formatDate(at)
  return (
    <RectFrame
      as="time"
      dateTime={new Date(at).toISOString()}
      seed={id ?? `date:${at}`}
      tone="graphite"
      variant="date"
      className={className}
    >
      {text}
    </RectFrame>
  )
}
