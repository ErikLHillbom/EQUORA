// Builds the training table and the replay fixtures from the labelled Horsing Around rows.
// Usage: npx tsx scripts/build-features.ts [--replay-subject Driekus] [--replay-minutes 3]
//
// Input: ml/data/raw/labelled/<Name>.csv.gz from ml/equid_ml/fetch_subset.py
//   columns: row (index within the subject's recording), Ax, Ay, Az (m/s^2), label, segment
// Output:
//   ml/data/interim/features.csv   one row per 2 s window: subject, name, label, source_label, ...features
//   ml/data/interim/build_summary.json   windows per source label and subject, dropped labels
//   public/replay/*.bin + manifest.json   raw 25 Hz windows from one horse, int16 milli-g
//
// The features come from src/sensing/features.ts, the same code the app runs.

import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { createGunzip } from 'node:zlib'
import {
  extractFeatures,
  FEATURE_NAMES,
  resample,
  SOURCE_HZ,
  STANDARD_GRAVITY,
  TARGET_HZ,
  WINDOW_SAMPLES,
  WINDOW_SECONDS,
} from '../src/sensing/features.ts'
import { CLASSIFIER_LABELS, type ClassifierLabel } from '../src/shared/types.ts'

const ROOT = process.cwd()
const RAW = join(ROOT, 'ml', 'data', 'raw')
const LABELLED = join(RAW, 'labelled')
const INTERIM = join(ROOT, 'ml', 'data', 'interim')
const REPLAY = join(ROOT, 'public', 'replay')
const RAW_WINDOW = SOURCE_HZ * WINDOW_SECONDS
const FACTOR = SOURCE_HZ / TARGET_HZ

/** Horsing Around labels mapped to our five classes. Anything not listed is dropped. */
export const LABEL_MAP: Record<string, ClassifierLabel> = {
  standing: 'stand',
  'walking-natural': 'walk',
  'walking-rider': 'walk',
  'trotting-natural': 'trot',
  'trotting-rider': 'trot',
  grazing: 'eat',
  eating: 'eat',
  rolling: 'roll',
}

/** Why each dropped label is not one of our classes. Written to the summary for docs/data.md. */
export const DROP_REASONS: Record<string, string> = {
  'galloping-natural': 'gallop is not working-animal behaviour and is rare at a neck collar',
  'galloping-rider': 'gallop is not working-animal behaviour',
  'head-shake': 'a short event inside other activities, not a time budget activity',
  shaking: 'a short event inside other activities',
  'scratch-biting': 'a short event inside other activities',
  rubbing: 'too few windows',
  fighting: 'too few windows, not a time budget activity',
  jumping: 'riding sport, not working-animal behaviour',
  scared: 'too few windows',
}

export function normaliseLabel(label: string): string {
  return label.trim().toLowerCase().replace(/_/g, '-')
}

export interface RawWindow {
  subject: string
  sourceLabel: string
  segment: string
  startRow: number
  /** 25 Hz, in g. */
  ax: Float32Array
  ay: Float32Array
  az: Float32Array
}

/**
 * Cuts runs of consecutive rows with the same label and segment into non-overlapping
 * 2 s windows (200 rows at 100 Hz), then resamples each to 25 Hz and converts m/s^2 to g.
 * Calls `onWindow` for each window. Rows that do not fill a whole window are skipped.
 */
export class Windower {
  private rows: number[] = []
  private ax: number[] = []
  private ay: number[] = []
  private az: number[] = []
  private label = ''
  private segment = ''
  private lastRow = -2
  private readonly subject: string
  private readonly onWindow: (w: RawWindow) => void

  constructor(subject: string, onWindow: (w: RawWindow) => void) {
    this.subject = subject
    this.onWindow = onWindow
  }

  push(row: number, ax: number, ay: number, az: number, label: string, segment: string): void {
    const contiguous = row === this.lastRow + 1 && label === this.label && segment === this.segment
    const finite = Number.isFinite(ax) && Number.isFinite(ay) && Number.isFinite(az)
    if (!contiguous || !finite) this.reset(label, segment)
    this.lastRow = row
    if (!finite) {
      // A gap in the signal breaks the run.
      this.lastRow = -2
      return
    }
    this.rows.push(row)
    this.ax.push(ax)
    this.ay.push(ay)
    this.az.push(az)
    if (this.ax.length === RAW_WINDOW) this.emit()
  }

  private reset(label: string, segment: string) {
    this.rows = []
    this.ax = []
    this.ay = []
    this.az = []
    this.label = label
    this.segment = segment
  }

  private emit() {
    const toG = (x: number[]) => resample(x.map((v) => v / STANDARD_GRAVITY), FACTOR)
    this.onWindow({
      subject: this.subject,
      sourceLabel: this.label,
      segment: this.segment,
      startRow: this.rows[0],
      ax: toG(this.ax),
      ay: toG(this.ay),
      az: toG(this.az),
    })
    this.reset(this.label, this.segment)
  }
}

async function readSubject(path: string, subject: string, onWindow: (w: RawWindow) => void): Promise<number> {
  const rl = createInterface({ input: createReadStream(path).pipe(createGunzip()), crlfDelay: Infinity })
  const windower = new Windower(subject, onWindow)
  let header: string[] | null = null
  let n = 0
  for await (const line of rl) {
    if (!header) {
      header = line.split(',')
      const want = ['row', 'Ax', 'Ay', 'Az', 'label', 'segment']
      if (want.some((c, i) => header![i] !== c)) throw new Error(`${path}: unexpected header ${line}`)
      continue
    }
    if (!line) continue
    const f = line.split(',')
    windower.push(Number(f[0]), Number(f[1]), Number(f[2]), Number(f[3]), normaliseLabel(f[4]), f[5])
    n++
  }
  return n
}

function readSubjectIds(): Map<string, number> {
  const ids = new Map<string, number>()
  const text = readFileSync(join(RAW, 'subject_mapping.csv'), 'utf8').replace(/^﻿/, '')
  for (const line of text.trim().split(/\r?\n/).slice(1)) {
    const [name, id] = line.split(',')
    ids.set(name, Number(id))
  }
  return ids
}

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

/** Interleaved int16 milli-g, window after window: ax[50], ay[50], az[50]. */
function encodeWindows(windows: RawWindow[]): Buffer {
  const buf = Buffer.alloc(windows.length * WINDOW_SAMPLES * 3 * 2)
  let o = 0
  for (const w of windows) {
    for (const axis of [w.ax, w.ay, w.az]) {
      for (let i = 0; i < WINDOW_SAMPLES; i++) {
        const v = Math.max(-32768, Math.min(32767, Math.round(axis[i] * 1000)))
        buf.writeInt16LE(v, o)
        o += 2
      }
    }
  }
  return buf
}

/** Picks the longest contiguous stretches first, so replay looks like a real recording. */
function pickReplay(windows: RawWindow[], max: number): RawWindow[] {
  const runs: RawWindow[][] = []
  for (const w of windows) {
    const run = runs[runs.length - 1]
    const prev = run?.[run.length - 1]
    if (prev && prev.segment === w.segment && w.startRow === prev.startRow + RAW_WINDOW) run.push(w)
    else runs.push([w])
  }
  runs.sort((a, b) => b.length - a.length || a[0].startRow - b[0].startRow)
  const out: RawWindow[] = []
  for (const run of runs) {
    for (const w of run) {
      if (out.length >= max) break
      out.push(w)
    }
    if (out.length >= max) break
  }
  return out
}

async function main() {
  if (!existsSync(LABELLED)) throw new Error(`No input at ${LABELLED}. Run ml/equid_ml/fetch_subset.py first.`)
  const replaySubject = arg('replay-subject', 'Driekus')
  const replayWindowsPerClass = Math.round((Number(arg('replay-minutes', '3')) * 60) / WINDOW_SECONDS)
  const ids = readSubjectIds()
  mkdirSync(INTERIM, { recursive: true })
  mkdirSync(REPLAY, { recursive: true })

  const lines: string[] = [['subject', 'name', 'label', 'source_label', 'segment', 'start_row', ...FEATURE_NAMES].join(',')]
  const counts: Record<string, Record<string, number>> = {}
  const replayPool: Record<ClassifierLabel, RawWindow[]> = { stand: [], walk: [], trot: [], eat: [], roll: [] }
  let magSum = 0
  let magN = 0

  const files = readdirSync(LABELLED).filter((f) => f.endsWith('.csv.gz')).sort()
  for (const file of files) {
    const name = file.replace(/\.csv\.gz$/, '')
    const id = ids.get(name)
    if (id === undefined) throw new Error(`Unknown subject ${name}`)
    counts[name] = {}
    const rows = await readSubject(join(LABELLED, file), name, (w) => {
      counts[name][w.sourceLabel] = (counts[name][w.sourceLabel] ?? 0) + 1
      const label = LABEL_MAP[w.sourceLabel]
      if (!label) return
      const f = extractFeatures({ start: 0, hz: TARGET_HZ, ax: w.ax, ay: w.ay, az: w.az })
      magSum += f[0]
      magN++
      lines.push([id, name, label, w.sourceLabel, w.segment, w.startRow, ...Array.from(f, String)].join(','))
      if (name === replaySubject) replayPool[label].push(w)
    })
    console.log(`${name}: ${rows} labelled rows, ${Object.values(counts[name]).reduce((a, b) => a + b, 0)} windows`)
  }
  writeFileSync(join(INTERIM, 'features.csv'), lines.join('\n') + '\n')

  // Units check: the mean magnitude over all kept windows should be close to 1 g.
  const meanMag = magSum / Math.max(1, magN)
  console.log(`mean magnitude ${meanMag.toFixed(3)} g over ${magN} windows`)
  if (meanMag < 0.8 || meanMag > 1.25) throw new Error('Mean magnitude is not near 1 g. Check the units.')

  const perClass: Record<string, number> = {}
  const dropped: Record<string, number> = {}
  for (const c of Object.values(counts)) {
    for (const [src, n] of Object.entries(c)) {
      const label = LABEL_MAP[src]
      if (label) perClass[label] = (perClass[label] ?? 0) + n
      else dropped[src] = (dropped[src] ?? 0) + n
    }
  }
  writeFileSync(
    join(INTERIM, 'build_summary.json'),
    JSON.stringify(
      {
        hz: TARGET_HZ,
        windowSeconds: WINDOW_SECONDS,
        sourceHz: SOURCE_HZ,
        unitsIn: 'm/s^2',
        meanMagnitudeG: Number(meanMag.toFixed(4)),
        labelMap: LABEL_MAP,
        windowsPerClass: perClass,
        droppedWindows: dropped,
        dropReasons: DROP_REASONS,
        windowsPerSubjectAndSourceLabel: counts,
        replaySubject,
      },
      null,
      2,
    ),
  )
  console.log('windows per class', perClass)
  console.log('dropped windows', dropped)

  // Replay fixtures.
  const clips = []
  let bytes = 0
  for (const label of CLASSIFIER_LABELS) {
    const picked = pickReplay(replayPool[label], replayWindowsPerClass)
    if (picked.length === 0) {
      console.warn(`replay: no ${label} windows for ${replaySubject}`)
      continue
    }
    const buf = encodeWindows(picked)
    const file = `${label}.bin`
    writeFileSync(join(REPLAY, file), buf)
    bytes += buf.length
    clips.push({
      label,
      file,
      windows: picked.length,
      sourceLabels: [...new Set(picked.map((w) => w.sourceLabel))].sort(),
    })
  }
  const manifest = {
    version: 1,
    dataset: 'Horsing Around (Kamminga et al. 2019)',
    doi: '10.4121/uuid:2e08745c-4178-4183-8551-f248c992cb14',
    licence: 'CC0',
    subject: replaySubject,
    note: 'Real neck collar recordings of one horse, resampled from 100 Hz to 25 Hz. This horse is left out of the shipped model.',
    hz: TARGET_HZ,
    windowSamples: WINDOW_SAMPLES,
    encoding: 'int16le, milli-g, per window ax[50] then ay[50] then az[50]',
    scale: 1000,
    clips,
  }
  writeFileSync(join(REPLAY, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`replay: ${clips.map((c) => `${c.label} ${c.windows}`).join(', ')}; ${bytes} bytes`)
}

if (process.argv[1]?.endsWith('build-features.ts')) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
