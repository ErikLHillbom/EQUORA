// Scripted events woven into the simulated history, so the data explains today's states and the
// logbooks have past entries with owner feedback. Days count back from the demo day (0 = today).

import type { FeedbackId, StateId } from '../shared/types'

export type ScenarioKind =
  /** Dull: less eating and walking, more lying, from `fromMin` to `toMin` (minutes of the day). */
  | 'quiet'
  /** Horse restlessness: repeated up and down, rolling, no eating, in the evening. */
  | 'colic'
  /** Pack work without any water stop, and an afternoon trip in the heat. */
  | 'noWater'
  /** Long work without a water stop (rider stays out). */
  | 'longWork'
  /** Possible fall on the way home: impact, fast turn, then lying. */
  | 'fall'

export interface Scenario {
  animalId: string
  daysAgo: number
  kind: ScenarioKind
  fromMin?: number
  toMin?: number
  /** Multipliers on free-time eating and walking while the scenario runs. */
  eat?: number
  walk?: number
  /** Extra lying bouts as [start minute, end minute]. */
  extraLie?: [number, number][]
  /** What the logbook records, if the owner answered. */
  logbook?: { state: StateId; atMin: number; feedback?: FeedbackId; resolved: boolean }
}

const hm = (h: number, m = 0) => h * 60 + m

export const SCENARIOS: Scenario[] = [
  // Today. Bari walked slowly on the morning trip to Aricha and has been dull since she got home.
  {
    animalId: 'bari',
    daysAgo: 0,
    kind: 'quiet',
    fromMin: hm(9, 50),
    toMin: hm(24),
    eat: 0.74,
    walk: 0.4,
    extraLie: [
      [hm(10, 50), hm(11, 22)],
      [hm(12, 40), hm(13, 12)],
    ],
    logbook: { state: 'check', atMin: hm(13), resolved: false },
  },
  // Today. Kito: possible fall at 14:14 on the way home from the market.
  { animalId: 'kito', daysAgo: 0, kind: 'fall', fromMin: hm(14, 14), logbook: { state: 'urgent', atMin: hm(14, 14), resolved: false } },
  // Today. Chaltu: cherries to Aricha all morning with no water stop, then an afternoon trip.
  { animalId: 'chaltu', daysAgo: 0, kind: 'noWater', logbook: { state: 'water', atMin: hm(12), resolved: false } },
  // 19 days ago. Saba: up and down and rolling in the evening. The owner called for help.
  {
    animalId: 'saba',
    daysAgo: 19,
    kind: 'colic',
    fromMin: hm(18, 5),
    toMin: hm(22),
    eat: 0.12,
    walk: 1.6,
    extraLie: [
      [hm(18, 5), hm(18, 10)],
      [hm(18, 14), hm(18, 20)],
      [hm(18, 25), hm(18, 31)],
      [hm(18, 38), hm(18, 45)],
      [hm(19, 10), hm(19, 32)],
    ],
    logbook: { state: 'urgent', atMin: hm(18, 45), feedback: 'called_help', resolved: true },
  },
  // Past CHECK entries the owners answered with "Checked: fine" (false alarms) and one that was not.
  {
    animalId: 'mulu',
    daysAgo: 41,
    kind: 'quiet',
    fromMin: hm(13),
    toMin: hm(19),
    eat: 0.66,
    walk: 0.35,
    extraLie: [[hm(15, 10), hm(15, 45)]],
    logbook: { state: 'check', atMin: hm(16), feedback: 'fine', resolved: true },
  },
  {
    animalId: 'gutu',
    daysAgo: 12,
    kind: 'quiet',
    fromMin: hm(14),
    toMin: hm(20),
    eat: 0.68,
    walk: 0.35,
    extraLie: [[hm(16, 20), hm(16, 55)]],
    logbook: { state: 'check', atMin: hm(17), feedback: 'fine', resolved: true },
  },
  {
    animalId: 'desta',
    daysAgo: 8,
    kind: 'quiet',
    fromMin: hm(15),
    toMin: hm(21),
    eat: 0.68,
    walk: 0.35,
    extraLie: [[hm(17, 5), hm(17, 40)]],
    logbook: { state: 'check', atMin: hm(18), feedback: 'fine', resolved: true },
  },
  {
    animalId: 'hawi',
    daysAgo: 52,
    kind: 'quiet',
    fromMin: hm(9),
    toMin: hm(24),
    eat: 0.6,
    walk: 0.4,
    extraLie: [
      [hm(11, 30), hm(12, 5)],
      [hm(14, 40), hm(15, 20)],
    ],
    logbook: { state: 'check', atMin: hm(12), feedback: 'treated', resolved: true },
  },
  // 26 days ago (a Monday). Lemma: a long ride on a warm day without water.
  { animalId: 'lemma', daysAgo: 26, kind: 'longWork', logbook: { state: 'water', atMin: hm(12, 30), feedback: 'fine', resolved: true } },
]

export function scenariosFor(animalId: string, daysAgo: number): Scenario[] {
  return SCENARIOS.filter((s) => s.animalId === animalId && s.daysAgo === daysAgo)
}
