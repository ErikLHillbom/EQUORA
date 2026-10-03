// The phone's own motion sensor stands in for the tag (SPEC 4).
// Reads DeviceMotion accelerationIncludingGravity (m/s^2), converts to g and cuts the stream
// into 2 s windows at 25 Hz, whatever rate the phone delivers.
//
// iOS reports the axes with the opposite sign to Android. The features only use magnitudes and
// the window's own gravity direction, so the sign does not matter.

import type { ImuSample, ImuWindow } from '../shared/types.ts'
import { STANDARD_GRAVITY, TARGET_HZ, WINDOW_SAMPLES } from './features.ts'

export type MotionPermission = 'granted' | 'denied' | 'unsupported'

export function msToG(v: number): number {
  return v / STANDARD_GRAVITY
}

interface DeviceMotionEventIOS {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

/**
 * Ask for motion access. On iOS this must run inside a tap handler, or Safari refuses.
 * Other browsers grant motion without a prompt where the sensor exists.
 */
export async function requestMotionPermission(): Promise<MotionPermission> {
  if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return 'unsupported'
  const ctor = (window as unknown as { DeviceMotionEvent: DeviceMotionEventIOS }).DeviceMotionEvent
  if (typeof ctor.requestPermission === 'function') {
    try {
      return (await ctor.requestPermission()) === 'granted' ? 'granted' : 'denied'
    } catch {
      return 'denied'
    }
  }
  return 'granted'
}

export interface AssemblerOptions {
  hz?: number
  windowSamples?: number
  /** A gap longer than this drops the partial window, ms. */
  maxGapMs?: number
}

/**
 * Turns samples at any rate into fixed windows. Each 1/hz slot holds the mean of the samples
 * that fall in it (an anti-alias average for fast phones); empty slots are interpolated.
 */
export class WindowAssembler {
  private readonly hz: number
  private readonly n: number
  private readonly slotMs: number
  private readonly maxGapMs: number
  private origin: number | null = null
  private slot = 0
  private sum: [number, number, number] = [0, 0, 0]
  private count = 0
  private slots: ([number, number, number] | null)[] = []
  private firstSlot = 0
  private lastT = -Infinity

  constructor(opts: AssemblerOptions = {}) {
    this.hz = opts.hz ?? TARGET_HZ
    this.n = opts.windowSamples ?? WINDOW_SAMPLES
    this.slotMs = 1000 / this.hz
    this.maxGapMs = opts.maxGapMs ?? 500
  }

  /** Add one sample (acceleration in g). Returns the windows it completes, usually none or one. */
  push(s: ImuSample): ImuWindow[] {
    if (!Number.isFinite(s.ax) || !Number.isFinite(s.ay) || !Number.isFinite(s.az)) return []
    if (s.t < this.lastT) return []
    if (this.origin === null || s.t - this.lastT > this.maxGapMs) this.restart(s.t)
    this.lastT = s.t
    const out: ImuWindow[] = []
    const slot = Math.floor((s.t - this.origin!) / this.slotMs)
    while (this.slot < slot) {
      this.closeSlot()
      if (this.slots.length === this.n) out.push(this.emit())
    }
    this.sum[0] += s.ax
    this.sum[1] += s.ay
    this.sum[2] += s.az
    this.count++
    return out
  }

  reset(): void {
    this.origin = null
    this.lastT = -Infinity
  }

  private restart(t: number) {
    this.origin = t
    this.slot = 0
    this.firstSlot = 0
    this.sum = [0, 0, 0]
    this.count = 0
    this.slots = []
  }

  private closeSlot() {
    this.slots.push(this.count > 0 ? [this.sum[0] / this.count, this.sum[1] / this.count, this.sum[2] / this.count] : null)
    this.sum = [0, 0, 0]
    this.count = 0
    this.slot++
  }

  private emit(): ImuWindow {
    const filled = fillGaps(this.slots)
    const w: ImuWindow = {
      start: this.origin! + this.firstSlot * this.slotMs,
      hz: this.hz,
      ax: Float32Array.from(filled, (v) => v[0]),
      ay: Float32Array.from(filled, (v) => v[1]),
      az: Float32Array.from(filled, (v) => v[2]),
    }
    this.firstSlot += this.n
    this.slots = []
    return w
  }
}

/** Linear interpolation over empty slots; edges take the nearest value. */
function fillGaps(slots: ([number, number, number] | null)[]): [number, number, number][] {
  const known = slots.map((v, i) => (v ? i : -1)).filter((i) => i >= 0)
  if (known.length === 0) return slots.map(() => [0, 0, 0])
  return slots.map((v, i) => {
    if (v) return v
    const next = known.find((k) => k > i)
    let prev = -1
    for (const k of known) if (k < i) prev = k
    if (prev < 0) return slots[next!]!
    if (next === undefined) return slots[prev]!
    const a = (i - prev) / (next - prev)
    const p = slots[prev]!
    const q = slots[next]!
    return [p[0] + (q[0] - p[0]) * a, p[1] + (q[1] - p[1]) * a, p[2] + (q[2] - p[2]) * a]
  })
}

export interface MotionRecorder {
  stop(): void
  /** Sample rate the phone delivers, Hz, from the samples so far. 0 before two samples. */
  rateHz(): number
}

export interface MotionRecorderOptions extends AssemblerOptions {
  onWindow: (w: ImuWindow) => void
  onSample?: (s: ImuSample) => void
  target?: Pick<Window, 'addEventListener' | 'removeEventListener'>
  /** Maps the event time to epoch ms. */
  timeOrigin?: number
}

/** Listen to devicemotion and deliver 25 Hz windows in g. Call requestMotionPermission first. */
export function startMotionRecorder(opts: MotionRecorderOptions): MotionRecorder {
  const target = opts.target ?? window
  const origin = opts.timeOrigin ?? (typeof performance !== 'undefined' ? performance.timeOrigin : 0)
  const assembler = new WindowAssembler(opts)
  let first = -1
  let last = -1
  let samples = 0
  const onMotion = (e: Event) => {
    const m = e as DeviceMotionEvent
    const a = m.accelerationIncludingGravity
    if (!a || a.x === null || a.y === null || a.z === null) return
    const t = origin + m.timeStamp
    const s: ImuSample = { t, ax: msToG(a.x), ay: msToG(a.y), az: msToG(a.z) }
    if (first < 0) first = t
    last = t
    samples++
    opts.onSample?.(s)
    for (const w of assembler.push(s)) opts.onWindow(w)
  }
  target.addEventListener('devicemotion', onMotion)
  return {
    stop: () => target.removeEventListener('devicemotion', onMotion),
    rateHz: () => (samples > 1 && last > first ? ((samples - 1) * 1000) / (last - first) : 0),
  }
}
