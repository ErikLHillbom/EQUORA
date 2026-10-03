// Shared contracts between domains. Domains import from here, never from each other's internals.
// Times are epoch milliseconds (UTC). Display converts to Africa/Addis_Ababa (UTC+3).

export type Species = 'horse' | 'donkey' | 'mule'

/** Classes the activity classifier outputs for one 2 s window. */
export const CLASSIFIER_LABELS = ['stand', 'walk', 'trot', 'eat', 'roll'] as const
export type ClassifierLabel = (typeof CLASSIFIER_LABELS)[number]

/** What the tag reports for a stretch of time. 'lie' comes from a rule, not the classifier. */
export type Activity = ClassifierLabel | 'lie' | 'unknown'
export const ACTIVITIES: readonly Activity[] = ['stand', 'walk', 'trot', 'eat', 'roll', 'lie', 'unknown']

/** Drawing to show for an animal (DESIGN 7). Rolling is never drawn; it maps to 'lying'. */
export type Pose = 'standing' | 'walking' | 'trotting' | 'grazing' | 'lying'

export const STATES = ['normal', 'water', 'check', 'urgent', 'not_sure'] as const
export type StateId = (typeof STATES)[number]

/** Severity order used to sort animals: who to visit first. */
export const STATE_PRIORITY: Record<StateId, number> = {
  urgent: 4,
  check: 3,
  water: 2,
  not_sure: 1,
  normal: 0,
}

export type WorkType = 'pack' | 'cart' | 'riding'

export interface Animal {
  id: string
  name: string
  species: Species
  sex: 'female' | 'male'
  ageYears: number
  bodyWeightKg: number
  tagId: string
  household: string
  work: WorkType
  /** When the tag was fitted. Baseline learning starts here. */
  tagSince: number
}

// ---------- Sensing ----------

/** One raw motion sample. Acceleration in g, rotation in deg/s. */
export interface ImuSample {
  t: number
  ax: number
  ay: number
  az: number
  gx?: number
  gy?: number
  gz?: number
}

/** A fixed-length window resampled to `hz`. Acceleration in g. */
export interface ImuWindow {
  start: number
  hz: number
  ax: Float32Array
  ay: Float32Array
  az: Float32Array
}

export interface Classification {
  label: ClassifierLabel
  probs: Record<ClassifierLabel, number>
  /** False when the top probability is below the model's confidence threshold. */
  confident: boolean
}

// ---------- Hourly time budget (what the tag stores per hour) ----------

export interface HourBudget {
  animalId: string
  hourStart: number
  /** Share of the hour with valid data, 0 to 1. */
  coverage: number
  /** Minutes in each activity. Sums to about 60 * coverage. */
  minutes: Record<Activity, number>
  lyingBouts: number
  /** Lie-down then stand-up transitions within the hour. */
  upDowns: number
  rollingBouts: number
  /** Possible falls: impact, fast orientation change, then lying. */
  falls: number
  /** Mean overall dynamic body acceleration, g. */
  odba: number
  distanceKm: number
  climbM: number
  /** Minutes classified as work (walking or trotting under load). */
  workMin: number
  /** Ambient temperature at the tag, deg C. */
  tempC: number
  /** Relative humidity from weather data, %. */
  rh: number
  /** Minutes standing still near a known water point. */
  waterStopMin: number
}

// ---------- Baseline and assessment ----------

export const SIGNALS = [
  'activity',
  'lying',
  'eating',
  'workload',
  'distance',
  'climb',
  'temperature',
  'waterDebt',
] as const
export type SignalId = (typeof SIGNALS)[number]

export interface BaselineCell {
  median: number
  /** Scaled MAD (1.4826 * MAD), floored so it is never 0. */
  spread: number
  /** Number of days that contributed. */
  n: number
}

export interface Baseline {
  animalId: string
  signal: SignalId
  /** 24 cells, one per local hour of day. */
  byHour: BaselineCell[]
  daysOfData: number
}

export type ReasonKind =
  | SignalId
  | 'rolling'
  | 'upDowns'
  | 'longLying'
  | 'fall'
  | 'stale'
  | 'lowConfidence'
  | 'shortBaseline'
  | 'heat'
  | 'noRest'

export interface Reason {
  kind: ReasonKind
  direction?: 'up' | 'down'
  /** Numbers the sentence needs, e.g. { pct: 34, hours: 3 }. */
  params: Record<string, number | string>
  /** String table key for the sentence. */
  textKey: string
}

export interface Assessment {
  animalId: string
  at: number
  state: StateId
  /** Most important first. */
  reasons: Reason[]
  /** Present while the baseline is still being learned. */
  learning?: { day: number; of: number }
  pose: Pose
  lastUpdate: number
}

export type FeedbackId = 'fine' | 'not_eating' | 'called_help' | 'treated'

export interface DetectedChange {
  id: string
  animalId: string
  at: number
  state: StateId
  reasons: Reason[]
  /** True when the animal returned to its normal after this change. */
  resolved?: boolean
  feedback?: FeedbackId
}

// ---------- Forecast ----------

export interface ForecastPoint {
  t: number
  p10: number
  p50: number
  p90: number
}

export interface SignalForecast {
  animalId: string
  signal: SignalId
  points: ForecastPoint[]
}

export interface WaterProjection {
  /** Deficit as % of body weight. */
  deficitPctNow: number
  points: { t: number; deficitPct: number }[]
  /** First time the projection crosses a threshold, if it does in the horizon. */
  crossings: { thresholdPct: number; t: number }[]
}

export interface Recommendation {
  id: string
  /** Lower is more urgent. */
  priority: number
  textKey: string
  params: Record<string, number | string>
  because: Reason[]
}

// ---------- Location ----------

export interface Fix {
  t: number
  lat: number
  lon: number
  eleM: number
}

export interface Place {
  id: string
  nameKey: string
  lat: number
  lon: number
  kind: 'water' | 'washing_station' | 'market' | 'home' | 'clinic'
}
