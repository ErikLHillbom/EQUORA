// Public API of the baseline domain: each animal's own normal, per hour of day.

export {
  signalValue,
  signalWeight,
  freeMinutes,
  coveredMinutes,
  isFreeHour,
  workloadOf,
  SIGNAL_INFO,
  BEHAVIOUR_SIGNALS,
  MIN_FREE_MINUTES,
  type SignalInfo,
} from './signals'
export {
  computeBaseline,
  learningProgress,
  cellAt,
  zScore,
  median,
  scaledMad,
  indexAt,
  budgetsBetween,
  countDaysOfData,
  BASELINE_DAYS,
  HOURLY_CELLS_FROM_DAYS,
  MIN_BASELINE_DAYS,
  LEARNING_DAYS,
  MIN_COVERAGE,
  type LearningProgress,
  type BaselineOptions,
} from './baseline'
export { dailySeries, hourlySeries, dailyValue, BAND_Z, type SeriesPoint } from './series'
