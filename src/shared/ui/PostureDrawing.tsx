// What the animal is doing right now, as a drawing (DESIGN 7). A drawing is information.
// The drawings are pencil engravings rendered from our 3D horse and donkey by
// scripts/render-drawings.ts (public/models3d/stills/). Mule uses the donkey.
// Stale data: the same drawing faded to light graphite inside a dashed frame, so old data never
// looks healthy. A state colour is never applied to the drawing.
import { stillUrl } from '../../landing/models'
import { useT } from '../../i18n/LanguageContext'
import type { Pose, Species } from '../types'

export interface PostureDrawingProps {
  species: Species
  pose: Pose
  /** Data is old: faded light graphite in a dashed frame. */
  stale?: boolean
  /** Width in px. Height follows the 4:3 image. Default 120. */
  width?: number
  /** Accessible name. Defaults to "Horse, standing" from the string table. */
  label?: string
  /** Hide from screen readers when the pose is already written next to it. */
  decorative?: boolean
  className?: string
}

export function PostureDrawing({ species, pose, stale = false, width = 120, label, decorative = false, className }: PostureDrawingProps) {
  const { t } = useT()
  const name =
    label ??
    [t(`shared.species.${species}`), t(`shared.pose.${pose}`).toLowerCase(), stale ? t('shared.pose.stale').toLowerCase() : '']
      .filter(Boolean)
      .join(', ')
  const height = Math.round((width * 3) / 4)
  return (
    <span
      className={['ui-posture', stale ? 'ui-posture--stale' : '', className].filter(Boolean).join(' ')}
      style={{ width, height }}
      {...(decorative ? { 'aria-hidden': true as const } : { role: 'img', 'aria-label': name })}
    >
      <img className="ui-posture-img" src={stillUrl(species, pose)} alt="" width={width} height={height} loading="lazy" decoding="async" />
    </span>
  )
}
