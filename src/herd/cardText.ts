// Short texts shared by the Herd home and its animal cards.
import { MINUTE } from '../shared/lib/clock'
import type { HerdRow } from './herdData'
import { signedPct } from './insights'

export type Translate = (key: string, params?: Record<string, string | number>) => string

/** "Updated 2 min ago", for sentences. */
export function updatedText(t: Translate, lastUpdate: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - lastUpdate) / MINUTE))
  if (minutes < 1) return t('herd.card.updatedNow')
  if (minutes < 120) return t('herd.card.updatedMin', { minutes })
  return t('herd.card.updatedHours', { hours: Math.round(minutes / 60) })
}

/** "2 min ago", for the card footer where the label already says Updated. */
export function ageText(t: Translate, lastUpdate: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - lastUpdate) / MINUTE))
  if (minutes < 1) return t('herd.card.ageNow')
  if (minutes < 120) return t('herd.card.ageMin', { minutes })
  return t('herd.card.ageHours', { hours: Math.round(minutes / 60) })
}

export function firstReason(row: HerdRow, t: Translate): string {
  const r = row.assessment.reasons[0]
  return r ? t(r.textKey, r.params) : ''
}

/** "Horse · Domorso · ES-0415". The tag id keeps its hyphen unbroken, so a narrow card wraps at the dots. */
export function metaLine(row: HerdRow, t: Translate): string {
  const { animal } = row
  return t('herd.card.ids', {
    species: t(`shared.species.${animal.species}`),
    household: t(`herd.household.${animal.household}`),
    tag: animal.tagId.replaceAll('-', '\u2011'),
  })
}

/**
 * Activity against the animal's own normal over the last RECENT_HOURS hours, signed. `learning`
 * while the baseline is short, `none` when there was too little free time to measure.
 */
export function activityValue(row: HerdRow): { kind: 'pct'; text: string } | { kind: 'learning' } | { kind: 'none' } {
  const act = row.deviations.activity
  if (act && Number.isFinite(act.pct)) return { kind: 'pct', text: signedPct(act.pct) }
  return row.assessment.learning ? { kind: 'learning' } : { kind: 'none' }
}
