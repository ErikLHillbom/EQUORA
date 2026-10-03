// Thresholds for the five states, with two species profiles (SPEC 5).
//
// Horse: rolling and repeated getting up and down are the signs to watch.
// Donkey: donkeys hide pain, and dullness (activity below its own normal) is the first sign.
// Rolling and pawing are rare in donkeys and serious when seen (The Donkey Sanctuary).
// Mule: we found no study. ASSUMPTION: horse rules for rolling and up-downs, donkey rules for
// dullness, because a mule can show either.

import type { Species } from '../shared/types'

export interface SpeciesProfile {
  /** |z| for one behaviour signal to count as departing. */
  departZ: number
  /** |z| for a single activity or eating signal to be enough on its own. */
  strongZ: number
  /** Donkey dullness rule: activity z below this and eating z below dullEatZ, over 3 free hours. */
  dullActZ: number | null
  dullEatZ: number | null
}

export const PROFILES: Record<Species, SpeciesProfile> = {
  // Donkeys first show dullness, so a smaller departure counts.
  donkey: { departZ: 2, strongZ: 3, dullActZ: -3, dullEatZ: -2 },
  horse: { departZ: 2.5, strongZ: 3.5, dullActZ: null, dullEatZ: null },
  mule: { departZ: 2, strongZ: 3, dullActZ: -3, dullEatZ: -2 },
}

export const RULES = {
  /** A possible fall counts for 2 hours unless the animal moves normally again. */
  fallWindowH: 2,
  /** Repeated getting up and down within one hour (the tag would use 30 minutes on events). */
  upDownsUrgent: 3,
  rollingUrgent: 2,
  /** Lying still counts as URGENT past max(2x longest normal bout, longest + 60 min). */
  longLyingFactor: 2,
  longLyingExtraMin: 60,
  /** Hours combined for the z-scores: the last 3 to 6 hours that have free time. */
  windowMinHours: 2,
  windowMaxHours: 4,
  windowLookbackH: 6,
  /** Donkey dullness must hold over this many free hours. */
  dullHours: 3,
  /**
   * One-sided CUSUM on activity z for a sustained drop, z clipped to +/-3 so one odd hour
   * cannot fire it alone. The usual k = 0.5 gave 1 to 1.4 false alarms per animal per week on the
   * simulated herd, because hourly activity spreads wider than a normal curve. k = 1 and h = 5
   * gave 10 in 12 animals over 120 days, and still fires after about 3 hours at z = -3.
   */
  cusumK: 1,
  cusumH: 5,
  cusumClip: 3,
  cusumLookbackH: 12,
  /** NOT SURE triggers. */
  minCoverage24h: 0.6,
  staleAfterH: 2,
  /** Share of recent minutes the classifier could not label. */
  maxUnknownShare: 0.3,
} as const
