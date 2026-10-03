// What the animal is doing right now, as a drawing (DESIGN 7). A drawing is information.
// Stale data turns the drawing into a graphite outline with no fill, so old data never looks healthy.
// The shapes are PLACEHOLDER silhouettes (see postures.ts) until our own drawings exist.
import { useId } from 'react'
import { useT } from '../../i18n/LanguageContext'
import type { Pose, Species } from '../types'
import { safeId } from './geometry'
import { postureShapes } from './postures'

export interface PostureDrawingProps {
  species: Species
  pose: Pose
  /** Data is old: graphite outline, no fill. */
  stale?: boolean
  /** Width in px. Height follows the 3:2 viewBox. Default 120. */
  width?: number
  /** Accessible name. Defaults to "Horse, standing" from the string table. */
  label?: string
  /** Hide from screen readers when the pose is already written next to it. */
  decorative?: boolean
  className?: string
}

export function PostureDrawing({ species, pose, stale = false, width = 120, label, decorative = false, className }: PostureDrawingProps) {
  const { t } = useT()
  const uid = `pd${safeId(useId())}`
  const set = species === 'horse' ? 'horse' : 'donkey'
  const { parts } = postureShapes(set, pose)
  const name =
    label ??
    [t(`shared.species.${species}`), t(`shared.pose.${pose}`).toLowerCase(), stale ? t('shared.pose.stale').toLowerCase() : '']
      .filter(Boolean)
      .join(', ')
  const a11y = decorative ? { 'aria-hidden': true as const } : { role: 'img', 'aria-label': name }
  return (
    <svg
      className={['ui-posture', stale ? 'ui-posture--stale' : '', className].filter(Boolean).join(' ')}
      viewBox="0 0 120 80"
      width={width}
      height={(width * 2) / 3}
      focusable="false"
      data-placeholder="true"
      {...a11y}
    >
      {stale && (
        <defs>
          <filter id={`${uid}-outline`} x="-5%" y="-5%" width="110%" height="110%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="1.1" result="grown" />
            <feComposite in="grown" in2="SourceAlpha" operator="out" result="ring" />
            <feFlood floodColor="var(--graphite)" />
            <feComposite in2="ring" operator="in" />
          </filter>
        </defs>
      )}
      <line className="ui-posture-ground" x1="4" y1="72.6" x2="116" y2="72.6" />
      <g className="ui-posture-figure" filter={stale ? `url(#${uid}-outline)` : undefined}>
        {parts.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  )
}
