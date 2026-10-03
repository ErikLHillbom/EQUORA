// Public API of the sensing domain. Other domains import from here, never from the files inside.

export {
  extractFeatures,
  FEATURE_COUNT,
  FEATURE_NAMES,
  type FeatureName,
  namedFeatures,
  resample,
  SOURCE_HZ,
  STANDARD_GRAVITY,
  TARGET_HZ,
  WINDOW_SAMPLES,
  WINDOW_SECONDS,
} from './features.ts'
export { ActivityModel, type ForestJson, MODEL_URL } from './model.ts'
export {
  FallDetector,
  type FallConfig,
  LyingDetector,
  type LyingConfig,
  type Posture,
  RollingDetector,
  type RollingConfig,
  type SensingEvent,
  type SensingEventKind,
} from './rules.ts'
export {
  createPipeline,
  decideActivity,
  type Pipeline,
  type PipelineCounters,
  type PipelineOptions,
  type PipelineOutput,
} from './pipeline.ts'
export {
  loadReplay,
  type Replay,
  REPLAY_BASE,
  type ReplayClip,
  type ReplayManifest,
  replaySequence,
} from './replay.ts'
export {
  type MotionPermission,
  type MotionRecorder,
  msToG,
  requestMotionPermission,
  startMotionRecorder,
  WindowAssembler,
} from './motion.ts'
export {
  createRecordingStore,
  type RecordingExport,
  type RecordingMeta,
  type RecordingStore,
  windowsFromExport,
} from './recordings.ts'
export { synthSequence, synthWindow } from './synthetic.ts'

export const METRICS_URL = '/models/metrics.json'

/** The parts of public/models/metrics.json that screens read. Produced by ml/equid_ml/export.py. */
export interface ModelMetrics {
  version: string
  trainedAt: string
  dataset: { name: string; citation: string; doi: string; url: string; licence: string }
  subjectsUsed: string[]
  subjectsInShippedModel: string[]
  replaySubject: string
  windows: number
  windowsPerClass: Record<string, number>
  droppedWindows: Record<string, number>
  labels: string[]
  cvMethod: string
  accuracy: number
  macroF1: number
  perClass: Record<string, { precision: number; recall: number; f1: number; support: number }>
  confusion: { labels: string[]; rowsAreTrue: boolean; matrix: number[][] }
  perFold: { heldOut: string; windows: number; accuracy: number }[]
  baseline: { model: string; accuracy: number; macroF1: number }
  rollDecision: { kept: boolean; rule: string; withRoll?: { precision: number; recall: number; f1: number; support: number } }
  confidenceThreshold: number
  coverageAtThreshold: number
  accuracyAtThreshold: number
  modelBytes: number
  featureNames: string[]
  hz: number
  windowSeconds: number
}

export async function loadMetrics(url: string = METRICS_URL, fetchFn: typeof fetch = fetch): Promise<ModelMetrics> {
  const res = await fetchFn(url)
  if (!res.ok) throw new Error(`Could not load metrics from ${url}: ${res.status}`)
  return (await res.json()) as ModelMetrics
}
