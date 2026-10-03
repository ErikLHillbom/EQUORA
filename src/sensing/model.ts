// The activity classifier: a small random forest trained in ml/ and exported as JSON.
// Probabilities are the mean of the leaf class distributions over trees, as in scikit-learn.

import { CLASSIFIER_LABELS, type Classification, type ClassifierLabel, type ImuWindow } from '../shared/types.ts'
import { extractFeatures, FEATURE_NAMES } from './features.ts'

export const MODEL_URL = '/models/activity-v1.json'

export interface TreeJson {
  /** Feature index per node, -1 for a leaf. */
  feature: number[]
  /** Split threshold per node (go left when x <= Math.fround(threshold)). 0 for a leaf. */
  threshold: number[]
  /** Left child per node. For a leaf: index of its distribution in `leaves`. */
  left: number[]
  /** Right child per node, -1 for a leaf. */
  right: number[]
  /** Leaf class distributions, `classes.length` values per leaf. */
  leaves: number[]
}

export interface ForestJson {
  version: string
  kind: 'random-forest'
  classes: string[]
  featureNames: string[]
  hz: number
  windowSeconds: number
  confidenceThreshold: number
  trees: TreeJson[]
}

interface Tree {
  feature: Int32Array
  threshold: Float32Array
  left: Int32Array
  right: Int32Array
  leaves: Float64Array
}

function isClassifierLabel(s: string): s is ClassifierLabel {
  return (CLASSIFIER_LABELS as readonly string[]).includes(s)
}

export class ActivityModel {
  readonly version: string
  /** Classes the forest can output, in its own order. A label missing here always gets 0. */
  readonly classes: readonly ClassifierLabel[]
  readonly confidenceThreshold: number
  readonly hz: number
  readonly windowSeconds: number
  private readonly trees: Tree[]

  constructor(json: ForestJson) {
    if (json.kind !== 'random-forest') throw new Error(`Unknown model kind ${json.kind}`)
    const names = json.featureNames.join(',')
    if (names !== FEATURE_NAMES.join(',')) {
      throw new Error(`Model features differ from features.ts. Model: ${names}`)
    }
    for (const c of json.classes) if (!isClassifierLabel(c)) throw new Error(`Unknown class ${c}`)
    if (json.trees.length === 0) throw new Error('Model has no trees')
    this.version = json.version
    this.classes = json.classes as ClassifierLabel[]
    this.confidenceThreshold = json.confidenceThreshold
    this.hz = json.hz
    this.windowSeconds = json.windowSeconds
    const k = json.classes.length
    this.trees = json.trees.map((t) => {
      const tree = {
        feature: Int32Array.from(t.feature),
        // Float32Array rounds exactly like Math.fround, matching scikit-learn's float32 features.
        threshold: Float32Array.from(t.threshold),
        left: Int32Array.from(t.left),
        right: Int32Array.from(t.right),
        leaves: Float64Array.from(t.leaves),
      }
      if (tree.leaves.length % k !== 0) throw new Error('Leaf array length is not a multiple of the class count')
      return tree
    })
  }

  /** Fetch and build the model. In the app the file is served from public/models/. */
  static async load(url: string = MODEL_URL, fetchFn: typeof fetch = fetch): Promise<ActivityModel> {
    const res = await fetchFn(url)
    if (!res.ok) throw new Error(`Could not load model from ${url}: ${res.status}`)
    return new ActivityModel((await res.json()) as ForestJson)
  }

  /** Class probabilities in `classes` order. */
  predictProba(features: ArrayLike<number>): Float64Array {
    if (features.length !== FEATURE_NAMES.length) {
      throw new Error(`Expected ${FEATURE_NAMES.length} features, got ${features.length}`)
    }
    const x = features instanceof Float32Array ? features : Float32Array.from(features)
    const k = this.classes.length
    const out = new Float64Array(k)
    for (const t of this.trees) {
      let i = 0
      while (t.feature[i] !== -1) i = x[t.feature[i]] <= t.threshold[i] ? t.left[i] : t.right[i]
      const base = t.left[i] * k
      for (let c = 0; c < k; c++) out[c] += t.leaves[base + c]
    }
    for (let c = 0; c < k; c++) out[c] /= this.trees.length
    return out
  }

  /** Top class, probabilities for every classifier label, and whether it clears the threshold. */
  classify(features: ArrayLike<number>): Classification {
    const p = this.predictProba(features)
    const probs = Object.fromEntries(CLASSIFIER_LABELS.map((l) => [l, 0])) as Record<ClassifierLabel, number>
    let best = 0
    this.classes.forEach((c, i) => {
      probs[c] = p[i]
      if (p[i] > p[best]) best = i
    })
    return { label: this.classes[best], probs, confident: p[best] >= this.confidenceThreshold }
  }

  classifyWindow(win: ImuWindow): Classification {
    return this.classify(extractFeatures(win))
  }
}
