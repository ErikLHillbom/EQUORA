import { DAY, DEMO_NOW, HOUR, localDayStart } from '../shared/lib/clock'
import { getBudgets, herdMember } from '../simulation'
import {
  computeBaseline,
  dailySeries,
  hourlySeries,
  learningProgress,
  median,
  scaledMad,
  signalValue,
  SIGNAL_INFO,
} from '.'
import { makeHour, synthHistory } from './fixtures'

describe('robust statistics', () => {
  it('median and scaled MAD', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
    expect(scaledMad([1, 2, 3, 4, 100])).toBeCloseTo(1.4826)
  })
})

describe('signalValue', () => {
  const t = DEMO_NOW
  it('measures activity as the active share of free minutes', () => {
    const b = makeHour(t, { minutes: { eat: 24, walk: 6, lie: 0 } })
    expect(signalValue(b, 'activity')).toBeCloseTo(0.5)
    expect(signalValue(b, 'eating')).toBeCloseTo(24)
  })

  it('takes work out: a work hour has no behaviour value', () => {
    const work = makeHour(t, { minutes: { walk: 55 }, workMin: 55 })
    expect(signalValue(work, 'activity')).toBeNaN()
    expect(signalValue(work, 'lying')).toBeNaN()
    expect(signalValue(work, 'workload')).toBeGreaterThan(60)
    const half = makeHour(t, { minutes: { walk: 30, eat: 15 }, workMin: 30 })
    expect(signalValue(half, 'activity')).toBeCloseTo(0.5)
  })

  it('scales lying and eating to 60 free minutes in a partial hour', () => {
    const b = makeHour(t, { coverage: 0.5, minutes: { lie: 10, eat: 10 } })
    expect(signalValue(b, 'lying')).toBeCloseTo(20)
  })

  it('has no value for an hour without data', () => {
    expect(signalValue(makeHour(t, { coverage: 0 }), 'temperature')).toBeNaN()
  })
})

describe('computeBaseline', () => {
  it('never has a zero spread', () => {
    const flat = synthHistory(DEMO_NOW, 14, (tt) => makeHour(tt, { minutes: { eat: 30 } }))
    const base = computeBaseline(flat, 'eating', DEMO_NOW)
    for (const c of base.byHour) {
      expect(c.median).toBe(30)
      expect(c.spread).toBe(SIGNAL_INFO.eating.spreadFloor)
    }
  })

  it('uses 4-hour bins below 7 days of data and 1-hour cells after', () => {
    // Eating minutes equal to the hour of day, so pooling is visible.
    const shape = (tt: number, h: number) => makeHour(tt, { minutes: { eat: h } })
    const young = computeBaseline(synthHistory(DEMO_NOW, 4, shape), 'eating', DEMO_NOW)
    expect(young.daysOfData).toBe(4)
    expect(young.byHour[5].median).toBe(5.5) // hours 4 to 7 pooled
    expect(young.byHour[4].median).toBe(young.byHour[7].median)
    const grown = computeBaseline(synthHistory(DEMO_NOW, 10, shape), 'eating', DEMO_NOW)
    expect(grown.daysOfData).toBe(10)
    expect(grown.byHour[5].median).toBe(5)
  })

  it('leaves today out', () => {
    const h = synthHistory(DEMO_NOW, 14, (tt, hh, b) => (tt >= localDayStart(DEMO_NOW) && hh >= 8 ? makeHour(tt, { minutes: { eat: 0 } }) : b))
    const base = computeBaseline(h, 'eating', DEMO_NOW)
    expect(base.byHour[10].median).toBeGreaterThan(25)
  })

  it('learns each animal of the demo herd from its own data', () => {
    const mulu = computeBaseline(getBudgets('mulu'), 'activity', DEMO_NOW)
    expect(mulu.daysOfData).toBe(14)
    for (const c of mulu.byHour) {
      expect(c.median).toBeGreaterThan(0.2)
      expect(c.median).toBeLessThan(0.9)
    }
  })
})

describe('learningProgress', () => {
  it('shows day 2 of 5 for a tag fitted under 2 days ago, and not enough data', () => {
    const p = learningProgress(herdMember('gelila').animal, getBudgets('gelila'), DEMO_NOW)
    expect(p).toMatchObject({ day: 2, of: 5, learning: true, enough: false })
    expect(p.daysOfData).toBeLessThan(3)
  })

  it('is done for an animal tagged months ago', () => {
    const p = learningProgress(herdMember('mulu').animal, getBudgets('mulu'), DEMO_NOW)
    expect(p).toMatchObject({ day: 5, learning: false, enough: true, daysOfData: 14 })
  })
})

describe('series', () => {
  it('gives one point per day with a band from the 14 days before', () => {
    const s = dailySeries(getBudgets('mulu'), 'lying', DEMO_NOW - 29 * DAY, DEMO_NOW)
    expect(s).toHaveLength(30)
    const inside = s.filter((p) => p.value >= p.low && p.value <= p.high).length
    expect(inside).toBeGreaterThan(15)
    for (const p of s) expect(p.high).toBeGreaterThanOrEqual(p.low)
  })

  it('covers 6 months for the long chart', () => {
    const s = dailySeries(getBudgets('mulu'), 'distance', DEMO_NOW - 165 * DAY, DEMO_NOW)
    expect(s).toHaveLength(166)
  })

  it('gives today hour by hour up to now', () => {
    const s = hourlySeries(getBudgets('bari'), 'activity', DEMO_NOW)
    expect(s).toHaveLength(15)
    expect(s[14].t).toBe(localDayStart(DEMO_NOW) + 14 * HOUR)
    // Bari is dull this afternoon: below the band.
    expect(s[12].value).toBeLessThan(s[12].median)
  })
})
