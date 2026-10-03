// The demo herd: 12 animals of the Aricha cooperative in 5 households. Simulated, and labelled so.
//
// Mix: 8 donkeys, 3 horses, 1 mule. Ethiopia has about 10.7 million donkeys and 2.1 million
// horses (Asteraye et al. 2024, CSA 2020), so donkeys outnumber horses here too.
// Body weights: local breeds are small. Donkeys 120 to 180 kg, horses 250 to 350 kg, mule 250 kg.

import type { Animal, Species, WorkType } from '../shared/types'
import { DAY, DEMO_NOW } from '../shared/lib/clock'

/** What a working day looks like for this animal. */
export type JobKind =
  /** Coffee cherries from home to the washing station (harvest), market loads otherwise. */
  | 'pack_aricha'
  /** Water carrying from the river to the home, every day of the week. */
  | 'water_carry'
  /** Cart shuttles in town: cherries from the market collection point to the station. */
  | 'cart_town'
  /** The owner rides to market and back. */
  | 'riding'
  /** Firewood and coffee down the northern slope. */
  | 'slope_pack'

export interface Profile {
  /** Share of free minutes spent eating in daylight and at night. */
  eatDay: number
  eatNight: number
  /** Share of free minutes walking (grazing steps) in daylight. */
  walkDay: number
  /** Total lying minutes per night and the number of bouts. */
  nightLieMin: [number, number]
  nightBouts: [number, number]
  /** Chance of a short lying bout after a work block (Bukhari et al. 2022: 43% sometimes lie down after loading). */
  postWorkLieProb: number
  /** Chance of a daytime rest lying bout in free time. */
  dayLieProb: number
  /** Relative hour-to-hour noise in eating and walking shares. */
  noise: number
  /** Walking speed with a load and without, km/h. */
  speedLoaded: number
  speedEmpty: number
  /** Share of walking that is trot (horses in cart or under a rider). */
  trotShare: number
  jobs: JobKind[]
  /** Usual start of work, local hour. */
  workStart: number
  /** Round trips in a harvest morning. */
  harvestTrips: number
}

export interface HerdMember {
  animal: Animal
  profile: Profile
}

const LONG_AGO = Date.UTC(2026, 2, 2, 6, 0) // 2 March 2026, before the 180-day window

function animal(
  id: string,
  name: string,
  species: Species,
  sex: 'female' | 'male',
  ageYears: number,
  bodyWeightKg: number,
  tagId: string,
  household: string,
  work: WorkType,
  tagSince = LONG_AGO,
): Animal {
  return { id, name, species, sex, ageYears, bodyWeightKg, tagId, household, work, tagSince }
}

const donkey = (o: Partial<Profile>): Profile => ({
  eatDay: 0.5,
  eatNight: 0.42,
  walkDay: 0.08,
  nightLieMin: [80, 140],
  nightBouts: [2, 4],
  postWorkLieProb: 0.43,
  dayLieProb: 0.3,
  noise: 0.13,
  speedLoaded: 3.8,
  speedEmpty: 4.4,
  trotShare: 0,
  jobs: ['pack_aricha'],
  workStart: 7,
  harvestTrips: 2,
  ...o,
})

const horse = (o: Partial<Profile>): Profile => ({
  eatDay: 0.55,
  eatNight: 0.48,
  walkDay: 0.07,
  nightLieMin: [45, 90],
  nightBouts: [2, 4],
  postWorkLieProb: 0.08,
  dayLieProb: 0.08,
  noise: 0.12,
  speedLoaded: 6,
  speedEmpty: 7,
  trotShare: 0.15,
  jobs: ['cart_town'],
  workStart: 8,
  harvestTrips: 4,
  ...o,
})

/** Gelila's tag went on on Thursday 1 October 2026 at 16:00 local time: learning day 2 of 5 today. */
export const GELILA_TAG_SINCE = Date.UTC(2026, 9, 1, 13, 0)

export const HERD: HerdMember[] = [
  // Domorso household, north slope.
  {
    animal: animal('mulu', 'Mulu', 'donkey', 'female', 7, 150, 'ES-0412', 'domorso', 'pack'),
    profile: donkey({ jobs: ['pack_aricha', 'slope_pack'], harvestTrips: 2 }),
  },
  {
    animal: animal('kito', 'Kito', 'horse', 'male', 9, 310, 'ES-0415', 'domorso', 'cart'),
    profile: horse({ eatDay: 0.57, nightLieMin: [50, 85] }),
  },
  {
    animal: animal('chaltu', 'Chaltu', 'donkey', 'female', 6, 155, 'ES-0427', 'domorso', 'pack'),
    profile: donkey({ eatDay: 0.52, walkDay: 0.09, harvestTrips: 2 }),
  },
  // Konga household, south of town.
  {
    animal: animal('bari', 'Bari', 'donkey', 'female', 8, 140, 'ES-0421', 'konga', 'pack'),
    profile: donkey({ workStart: 6.5, harvestTrips: 1, eatDay: 0.5, walkDay: 0.08, nightLieMin: [90, 150], noise: 0.2 }),
  },
  {
    animal: animal('saba', 'Saba', 'horse', 'female', 11, 285, 'ES-0423', 'konga', 'cart'),
    profile: horse({ eatDay: 0.54, nightLieMin: [40, 80], harvestTrips: 3 }),
  },
  // Haru road household, west slope.
  {
    animal: animal('almaz', 'Almaz', 'donkey', 'female', 5, 135, 'ES-0418', 'haru', 'pack'),
    profile: donkey({ eatDay: 0.48, walkDay: 0.1, harvestTrips: 1 }),
  },
  {
    animal: animal('gutu', 'Gutu', 'donkey', 'male', 10, 170, 'ES-0430', 'haru', 'pack'),
    profile: donkey({ eatDay: 0.53, walkDay: 0.07, dayLieProb: 0.4, harvestTrips: 1 }),
  },
  // Benko household, north-east.
  {
    animal: animal('gelila', 'Gelila', 'donkey', 'female', 4, 125, 'ES-0433', 'benko', 'pack', GELILA_TAG_SINCE),
    profile: donkey({ eatDay: 0.5, walkDay: 0.1, harvestTrips: 1 }),
  },
  {
    animal: animal('boru', 'Boru', 'mule', 'male', 8, 250, 'ES-0436', 'benko', 'pack'),
    profile: donkey({
      eatDay: 0.53,
      nightLieMin: [60, 110],
      postWorkLieProb: 0.2,
      speedLoaded: 4.5,
      speedEmpty: 5.2,
      harvestTrips: 2,
    }),
  },
  // Adido road household, east.
  {
    animal: animal('desta', 'Desta', 'donkey', 'male', 12, 165, 'ES-0439', 'adido', 'pack'),
    profile: donkey({ eatDay: 0.47, walkDay: 0.07, harvestTrips: 1 }),
  },
  {
    animal: animal('hawi', 'Hawi', 'donkey', 'female', 3, 120, 'ES-0442', 'adido', 'pack', DEMO_NOW - 64 * DAY),
    profile: donkey({ jobs: ['water_carry'], workStart: 6, eatDay: 0.51, walkDay: 0.11 }),
  },
  {
    animal: animal('lemma', 'Lemma', 'horse', 'male', 7, 265, 'ES-0445', 'adido', 'riding'),
    profile: horse({ jobs: ['riding'], trotShare: 0.3, speedLoaded: 7, speedEmpty: 7.5 }),
  },
]

export const HOUSEHOLDS = ['domorso', 'konga', 'haru', 'benko', 'adido'] as const

export function herdMember(id: string): HerdMember {
  const m = HERD.find((h) => h.animal.id === id)
  if (!m) throw new Error(`Unknown animal ${id}`)
  return m
}
