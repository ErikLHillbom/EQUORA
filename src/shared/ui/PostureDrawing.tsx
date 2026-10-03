// What the animal is doing right now, as a drawing (DESIGN 7). A drawing is information.
// Fresh data: an ink line drawing. Stale data: thin broken graphite lines with no hatching and no
// dark masses, so old data never looks healthy. A state colour is never applied to the drawing.
import { useT } from '../../i18n/LanguageContext'
import type { Pose, Species } from '../types'
import { postureShapes } from './postures'

export interface PostureDrawingProps {
  species: Species
  pose: Pose
  /** Data is old: thin broken graphite lines, no fill. */
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
  const set = species === 'horse' ? 'horse' : 'donkey'
  const shapes = postureShapes(set, pose)
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
      {...a11y}
    >
      {stale ? (
        <path className="ui-posture-line" d={shapes.outline} />
      ) : (
        <>
          <path className="ui-posture-hatch" d={shapes.hatch} />
          <path className="ui-posture-ink" d={shapes.ink} />
        </>
      )}
    </svg>
  )
}
