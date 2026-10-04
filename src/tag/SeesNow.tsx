// "What the tag sees now" (docs/design-desktop.md): one tile per activity the tag can read, with the
// drawing for the scenario animal. The tile for the latest window is marked in ink with "Now".
// Rolling is never drawn, so its tile says so. Trotting shares the walking tile.
import { useT } from '../i18n/LanguageContext'
import type { Activity, Pose, Species } from '../shared/types'
import { PostureDrawing } from '../shared/ui'

type Tile = 'stand' | 'walk' | 'eat' | 'lie' | 'roll'

const TILES: readonly Tile[] = ['stand', 'walk', 'eat', 'lie', 'roll']
const POSE: Record<Exclude<Tile, 'roll'>, Pose> = { stand: 'standing', walk: 'walking', eat: 'grazing', lie: 'lying' }
/** Lying and rolling come from rules on the collar tilt and carry the Experimental label (SPEC 10). */
const EXPERIMENTAL: ReadonlySet<Tile> = new Set(['lie', 'roll'])

/** The tile an activity lights up. Not sure lights up none. */
function tileFor(activity: Activity | undefined): Tile | null {
  if (!activity || activity === 'unknown') return null
  return activity === 'trot' ? 'walk' : activity
}

export interface SeesNowProps {
  species: Species
  /** Activity of the latest window, or undefined before the first one. */
  activity?: Activity
}

export function SeesNow({ species, activity }: SeesNowProps) {
  const { t } = useT()
  const now = tileFor(activity)
  const trotting = activity === 'trot'
  const lead = activity === undefined ? 'tag.sees.waiting' : now === null ? 'tag.sees.unsure' : 'tag.sees.lead'
  return (
    <section className="tag-sees" aria-labelledby="tag-sees-h">
      <h2 id="tag-sees-h" className="tag-h2">
        {t('tag.sees.title')}
      </h2>
      <p className="tag-note">{t(lead)}</p>
      <ul className="tag-sees__tiles">
        {TILES.map((tile) => {
          const on = tile === now
          const label = tile === 'walk' && on && trotting ? t('tag.sees.trot') : t(`tag.sees.${tile}`)
          const pose: Pose | null = tile === 'roll' ? null : tile === 'walk' && on && trotting ? 'trotting' : POSE[tile]
          return (
            <li
              key={tile}
              className={`tag-sees__tile${on ? ' tag-sees__tile--now' : ''}`}
              data-tile={tile}
              aria-current={on ? 'true' : undefined}
            >
              {on && <span className="tag-sees__now">{t('tag.sees.now')}</span>}
              <div className="tag-sees__art">
                {pose ? (
                  <PostureDrawing species={species} pose={pose} width={132} decorative />
                ) : (
                  <span className="tag-sees__none">{t('tag.sees.noDrawing')}</span>
                )}
              </div>
              <span className="tag-sees__label">{label}</span>
              {EXPERIMENTAL.has(tile) && <span className="tag-exp">{t('shared.stamp.experimental')}</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
