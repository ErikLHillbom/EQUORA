// Recorded collar data for the Tag screen: real Horsing Around windows from one horse that the
// shipped model never saw (see public/replay/manifest.json), replayed through the real pipeline.

import { CLASSIFIER_LABELS, type ClassifierLabel, type ImuWindow } from '../shared/types.ts'

export const REPLAY_BASE = '/replay/'

export interface ReplayClipInfo {
  label: ClassifierLabel
  file: string
  windows: number
  sourceLabels: string[]
}

export interface ReplayManifest {
  version: number
  dataset: string
  doi: string
  licence: string
  subject: string
  note: string
  hz: number
  windowSamples: number
  encoding: string
  /** Stored value = g * scale (int16). */
  scale: number
  clips: ReplayClipInfo[]
}

export interface ReplayClip {
  label: ClassifierLabel
  sourceLabels: string[]
  windows: ImuWindow[]
}

export interface Replay {
  manifest: ReplayManifest
  clips: ReplayClip[]
}

/** Decode int16le milli-g windows (ax[n], ay[n], az[n] per window) into ImuWindows from `start`. */
export function decodeWindows(
  buf: ArrayBuffer,
  opts: { hz: number; windowSamples: number; scale: number; start?: number },
): ImuWindow[] {
  const n = opts.windowSamples
  const view = new DataView(buf)
  const perWindow = n * 3 * 2
  if (buf.byteLength % perWindow !== 0) throw new Error(`Replay data is ${buf.byteLength} bytes, not a whole number of windows`)
  const count = buf.byteLength / perWindow
  const ms = (n / opts.hz) * 1000
  const out: ImuWindow[] = []
  for (let w = 0; w < count; w++) {
    const axes = [new Float32Array(n), new Float32Array(n), new Float32Array(n)]
    for (let a = 0; a < 3; a++) {
      for (let i = 0; i < n; i++) axes[a][i] = view.getInt16(w * perWindow + (a * n + i) * 2, true) / opts.scale
    }
    out.push({ start: (opts.start ?? 0) + w * ms, hz: opts.hz, ax: axes[0], ay: axes[1], az: axes[2] })
  }
  return out
}

/** Encode windows the same way, for recordings and tests. */
export function encodeWindows(windows: ImuWindow[], scale = 1000): ArrayBuffer {
  if (windows.length === 0) return new ArrayBuffer(0)
  const n = windows[0].ax.length
  const buf = new ArrayBuffer(windows.length * n * 3 * 2)
  const view = new DataView(buf)
  windows.forEach((w, k) => {
    ;[w.ax, w.ay, w.az].forEach((axis, a) => {
      for (let i = 0; i < n; i++) {
        const v = Math.max(-32768, Math.min(32767, Math.round(axis[i] * scale)))
        view.setInt16((k * n * 3 + a * n + i) * 2, v, true)
      }
    })
  })
  return buf
}

/** Fetch the manifest and every clip. */
export async function loadReplay(base: string = REPLAY_BASE, fetchFn: typeof fetch = fetch): Promise<Replay> {
  const root = base.endsWith('/') ? base : `${base}/`
  const res = await fetchFn(`${root}manifest.json`)
  if (!res.ok) throw new Error(`Could not load replay manifest: ${res.status}`)
  const manifest = (await res.json()) as ReplayManifest
  const clips = await Promise.all(
    manifest.clips.map(async (c) => {
      if (!(CLASSIFIER_LABELS as readonly string[]).includes(c.label)) throw new Error(`Unknown replay label ${c.label}`)
      const r = await fetchFn(`${root}${c.file}`)
      if (!r.ok) throw new Error(`Could not load replay clip ${c.file}: ${r.status}`)
      const windows = decodeWindows(await r.arrayBuffer(), manifest)
      if (windows.length !== c.windows) throw new Error(`${c.file} has ${windows.length} windows, manifest says ${c.windows}`)
      return { label: c.label, windows, sourceLabels: c.sourceLabels }
    }),
  )
  return { manifest, clips }
}

/**
 * Joins clips into one stream with consecutive start times, in the given label order,
 * for example a horse that stands, walks, trots, then grazes.
 */
export function replaySequence(
  replay: Replay,
  order: readonly ClassifierLabel[] = CLASSIFIER_LABELS,
  start = 0,
  windowsPerClip = Infinity,
): { window: ImuWindow; label: ClassifierLabel }[] {
  const out: { window: ImuWindow; label: ClassifierLabel }[] = []
  let t = start
  for (const label of order) {
    const clip = replay.clips.find((c) => c.label === label)
    if (!clip) continue
    for (const w of clip.windows.slice(0, windowsPerClip)) {
      out.push({ window: { ...w, start: t }, label })
      t += (w.ax.length / w.hz) * 1000
    }
  }
  return out
}
