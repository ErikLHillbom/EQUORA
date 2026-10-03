// Reads public/models/metrics.json for the datasheet. Every model number on the screen comes
// through here, never from a typed constant (SPEC 10).
import type { ModelMetrics } from '../sensing'

/** Fields of metrics.json the datasheet reads beyond the shared ModelMetrics type. */
export interface DatasheetMetrics extends ModelMetrics {
  model?: { kind?: string; n_estimators?: number; max_depth?: number; min_samples_leaf?: number }
  modelNodes?: number
  baseline: ModelMetrics['baseline'] & {
    perClass?: Record<string, { precision: number; recall: number; f1: number; support: number }>
  }
  rollDecision: ModelMetrics['rollDecision'] & { windowsDropped?: number }
}

/** 0.9612 -> "96.1%". */
export function pct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`
}

/** 0.9505 -> "0.951". */
export function dec(x: number, digits = 3): string {
  return x.toFixed(digits)
}

/** 49045 -> "49,045". */
export function int(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

/** Bytes to KB (1024), one decimal. */
export function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`
}

/** Accuracy gap between the shipped forest and the baseline, in percentage points. */
export function accuracyGapPoints(m: ModelMetrics): string {
  return ((m.accuracy - m.baseline.accuracy) * 100).toFixed(1)
}

export interface Confusion {
  trueLabel: string
  predicted: string
  count: number
  /** Share of the true class. */
  share: number
}

/** The largest off-diagonal cell of the confusion matrix. */
export function largestConfusion(m: ModelMetrics): Confusion {
  const { labels, matrix } = m.confusion
  let best: Confusion = { trueLabel: labels[0], predicted: labels[0], count: -1, share: 0 }
  matrix.forEach((row, i) => {
    const total = row.reduce((a, b) => a + b, 0)
    row.forEach((count, j) => {
      if (i !== j && count > best.count) best = { trueLabel: labels[i], predicted: labels[j], count, share: total ? count / total : 0 }
    })
  })
  return best
}

/** The held-out horses with the lowest and highest accuracy. */
export function foldRange(m: ModelMetrics) {
  const sorted = m.perFold.slice().sort((a, b) => a.accuracy - b.accuracy)
  return { low: sorted[0], high: sorted[sorted.length - 1] }
}

/** The number in a rule such as "keep roll if ... both >= 0.3". */
export function ruleThreshold(rule: string): string | undefined {
  return rule.match(/>=\s*([\d.]+)/)?.[1]
}
