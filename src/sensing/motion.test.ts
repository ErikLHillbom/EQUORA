import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ImuWindow } from '../shared/types.ts'
import { msToG, requestMotionPermission, startMotionRecorder, WindowAssembler } from './motion.ts'

function feed(a: WindowAssembler, hz: number, seconds: number, t0 = 0, jitterMs = 0): ImuWindow[] {
  const out: ImuWindow[] = []
  const n = Math.round(hz * seconds)
  for (let i = 0; i < n; i++) {
    // Odd samples arrive late by jitterMs, as phone events do.
    const t = t0 + (i * 1000) / hz + (i % 2 ? jitterMs : 0)
    out.push(...a.push({ t, ax: 0, ay: Math.sin((2 * Math.PI * t) / 1000), az: 1 }))
  }
  return out
}

describe('msToG', () => {
  it('converts standard gravity to 1 g', () => {
    expect(msToG(9.80665)).toBeCloseTo(1, 10)
  })
})

describe('WindowAssembler', () => {
  for (const hz of [60, 100, 37]) {
    it(`turns ${hz} Hz samples into 2 s windows at 25 Hz`, () => {
      const w = feed(new WindowAssembler(), hz, 6.1, 1_000, 2)
      expect(w.length).toBe(3)
      expect(w.map((x) => x.start)).toEqual([1000, 3000, 5000])
      for (const x of w) {
        expect(x.hz).toBe(25)
        expect(x.az.length).toBe(50)
        expect(x.az[10]).toBeCloseTo(1, 5)
        // The 1 Hz sine survives the slot averaging.
        expect(Math.max(...x.ay)).toBeGreaterThan(0.8)
      }
    })
  }

  it('interpolates empty slots when the phone delivers slower than 25 Hz', () => {
    const w = feed(new WindowAssembler(), 20, 4.2)
    expect(w.length).toBe(2)
    expect(w[0].ay.every((v) => Number.isFinite(v))).toBe(true)
  })

  it('drops the partial window after a long gap', () => {
    const a = new WindowAssembler({ maxGapMs: 300 })
    const before = feed(a, 50, 1.5, 0)
    const after = feed(a, 50, 2.1, 5_000)
    expect(before.length).toBe(0)
    expect(after.length).toBe(1)
    expect(after[0].start).toBe(5_000)
  })

  it('ignores samples that go back in time or are not numbers', () => {
    const a = new WindowAssembler()
    a.push({ t: 100, ax: 0, ay: 0, az: 1 })
    expect(a.push({ t: 50, ax: 0, ay: 0, az: 1 })).toEqual([])
    expect(a.push({ t: 120, ax: Number.NaN, ay: 0, az: 1 })).toEqual([])
  })
})

describe('requestMotionPermission', () => {
  const original = (window as unknown as Record<string, unknown>).DeviceMotionEvent
  afterEach(() => {
    ;(window as unknown as Record<string, unknown>).DeviceMotionEvent = original
    if (original === undefined) delete (window as unknown as Record<string, unknown>).DeviceMotionEvent
  })

  it('asks on iOS and passes the answer on', async () => {
    const requestPermission = vi.fn(async () => 'granted' as const)
    ;(window as unknown as Record<string, unknown>).DeviceMotionEvent = { requestPermission }
    expect(await requestMotionPermission()).toBe('granted')
    expect(requestPermission).toHaveBeenCalledOnce()
  })

  it('reports a refusal or a thrown error as denied', async () => {
    ;(window as unknown as Record<string, unknown>).DeviceMotionEvent = { requestPermission: async () => 'denied' }
    expect(await requestMotionPermission()).toBe('denied')
    ;(window as unknown as Record<string, unknown>).DeviceMotionEvent = {
      requestPermission: async () => {
        throw new Error('needs a tap')
      },
    }
    expect(await requestMotionPermission()).toBe('denied')
  })

  it('grants without a prompt where there is no permission API', async () => {
    ;(window as unknown as Record<string, unknown>).DeviceMotionEvent = function DeviceMotionEvent() {}
    expect(await requestMotionPermission()).toBe('granted')
  })

  it('reports unsupported without the sensor API', async () => {
    delete (window as unknown as Record<string, unknown>).DeviceMotionEvent
    expect(await requestMotionPermission()).toBe('unsupported')
  })
})

describe('startMotionRecorder', () => {
  it('converts devicemotion events in m/s^2 into windows in g', () => {
    const target = new EventTarget()
    const windows: ImuWindow[] = []
    const rec = startMotionRecorder({ target: target as unknown as Window, timeOrigin: 1_000_000, onWindow: (w) => windows.push(w) })
    for (let i = 0; i < 260; i++) {
      const e = new Event('devicemotion')
      Object.defineProperty(e, 'timeStamp', { value: i * 10 })
      Object.defineProperty(e, 'accelerationIncludingGravity', { value: { x: 0, y: 0, z: -9.80665 } })
      target.dispatchEvent(e)
    }
    expect(windows.length).toBe(1)
    expect(windows[0].start).toBe(1_000_000)
    expect(windows[0].az[0]).toBeCloseTo(-1, 5)
    expect(rec.rateHz()).toBeCloseTo(100, 5)
    rec.stop()
    const e = new Event('devicemotion')
    Object.defineProperty(e, 'timeStamp', { value: 9_000 })
    Object.defineProperty(e, 'accelerationIncludingGravity', { value: { x: 0, y: 0, z: 9.8 } })
    target.dispatchEvent(e)
    expect(rec.rateHz()).toBeCloseTo(100, 5)
  })

  it('skips events without acceleration', () => {
    const target = new EventTarget()
    const onSample = vi.fn()
    startMotionRecorder({ target: target as unknown as Window, onWindow: () => {}, onSample })
    const e = new Event('devicemotion')
    Object.defineProperty(e, 'accelerationIncludingGravity', { value: { x: null, y: null, z: null } })
    target.dispatchEvent(e)
    expect(onSample).not.toHaveBeenCalled()
  })
})
