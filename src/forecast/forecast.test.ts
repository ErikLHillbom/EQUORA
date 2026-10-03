import type { Animal } from '../shared/types'
import { DAY, DEMO_NOW, HOUR, localDayStart } from '../shared/lib/clock'
import { hasKey } from '../i18n'
import { makeHour, synthHistory } from '../baseline/fixtures'
import { computeBaseline } from '../baseline'
import { assess } from '../alerts'
import { getBudgets, getHerd, herdMember, weatherAt } from '../simulation'
import {
  WATER_BANDS,
  forecastSignal,
  projectWaterDebt,
  recommend,
  recommendFor,
  recommendationText,
  stepWater,
  deficitPct,
  whatIf,
  whatIfAll,
  type WaterState,
} from '.'

const NOW = DEMO_NOW
const donkey: Animal = {
  id: 'd',
  name: 'Test',
  species: 'donkey',
  sex: 'female',
  ageYears: 6,
  bodyWeightKg: 150,
  tagId: 'ES-9999',
  household: 'domorso',
  work: 'pack',
  tagSince: NOW - 60 * DAY,
}
const horse: Animal = { ...donkey, id: 'h', species: 'horse', bodyWeightKg: 300 }

describe('forecastSignal', () => {
  it('widens the band with the horizon', () => {
    // The same values in every hour of the day, so only the horizon changes the width.
    const dayShift = [-6, -3, 0, 3, 6, -2, 2]
    const b = synthHistory(NOW, 14, (t) =>
      makeHour(t, { minutes: { eat: 30 + dayShift[Math.floor(t / DAY) % 7], walk: 5 } }),
    )
    const f = forecastSignal(donkey, b, 'eating', NOW, { horizonH: 12 })
    expect(f.points).toHaveLength(12)
    const widths = f.points.map((p) => p.p90 - p.p10)
    for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeGreaterThan(widths[i - 1])
    for (const p of f.points) {
      expect(p.p10).toBeLessThanOrEqual(p.p50)
      expect(p.p50).toBeLessThanOrEqual(p.p90)
    }
  })

  it('carries a dull animal\'s low level forward, drifting back toward its normal', () => {
    const b = getBudgets('bari')
    const f = forecastSignal(herdMember('bari').animal, b, 'activity', NOW)
    const base = computeBaseline(b, 'activity', NOW)
    const first = f.points[0]
    const h = new Date(first.t + 3 * HOUR).getUTCHours()
    expect(first.p50).toBeLessThan(base.byHour[h].median)
    const gap = (i: number) => base.byHour[new Date(f.points[i].t + 3 * HOUR).getUTCHours()].median - f.points[i].p50
    expect(gap(11) / base.byHour[new Date(f.points[11].t + 3 * HOUR).getUTCHours()].median).toBeLessThan(
      gap(0) / base.byHour[h].median,
    )
  })

  it('forecasts water debt from the water model', () => {
    const chaltu = herdMember('chaltu').animal
    const f = forecastSignal(chaltu, getBudgets('chaltu'), 'waterDebt', NOW, { weather: weatherAt })
    expect(f.points[0].p50).toBeGreaterThan(3)
    expect(f.points[5].p90 - f.points[5].p10).toBeGreaterThan(f.points[0].p90 - f.points[0].p10)
  })
})

describe('water debt', () => {
  const start: WaterState = { deficitL: 0, workSinceWaterMin: 0 }
  const t0 = localDayStart(NOW) + 8 * HOUR

  it('rises with work and with heat, and falls after a water stop', () => {
    const rest = stepWater(start, donkey, makeHour(t0, { minutes: { eat: 30 }, tempC: 22 }))
    const work = stepWater(start, donkey, makeHour(t0, { minutes: { walk: 55 }, workMin: 55, climbM: 100, tempC: 22 }))
    const hotWork = stepWater(start, donkey, makeHour(t0, { minutes: { walk: 55 }, workMin: 55, climbM: 100, tempC: 32, rh: 60 }))
    expect(work.deficitL).toBeGreaterThan(rest.deficitL)
    expect(hotWork.deficitL).toBeGreaterThan(work.deficitL)
    expect(work.workSinceWaterMin).toBe(55)

    let s = work
    for (let i = 1; i < 4; i++) s = stepWater(s, donkey, makeHour(t0 + i * HOUR, { minutes: { walk: 55 }, workMin: 55, tempC: 26 }))
    const before = deficitPct(s, donkey)
    const after = stepWater(s, donkey, makeHour(t0 + 4 * HOUR, { minutes: { eat: 20 }, waterStopMin: 10, tempC: 26 }))
    expect(deficitPct(after, donkey)).toBeLessThan(before / 2)
    expect(after.workSinceWaterMin).toBe(0)
  })

  it('makes donkeys sweat less than horses per kg for the same work (assumption)', () => {
    const h = makeHour(t0, { minutes: { walk: 55 }, workMin: 55, climbM: 100, tempC: 26 })
    expect(deficitPct(stepWater(start, donkey, h), donkey)).toBeLessThan(deficitPct(stepWater(start, horse, h), horse))
  })

  it('projects Chaltu past 5% if work continues, and back near 0 if she rests at water', () => {
    const chaltu = herdMember('chaltu').animal
    const plans = whatIfAll(chaltu, NOW)
    const at = (p: { points: { t: number; deficitPct: number }[] }, h: number) =>
      p.points.find((x) => x.t >= NOW + h * HOUR)!.deficitPct
    expect(plans.continue_work.water.crossings.some((c) => c.thresholdPct === WATER_BANDS.concern)).toBe(true)
    expect(at(plans.continue_work.water, 3)).toBeGreaterThan(at(plans.rest_now.water, 3))
    expect(at(plans.rest_now.water, 3)).toBeGreaterThan(at(plans.rest_at_water.water, 3))
    expect(at(plans.rest_at_water.water, 1)).toBeLessThan(1)
    expect(whatIf(chaltu, NOW, 'rest_now').plan).toBe('rest_now')
  })

  it('puts thresholds in order: 3% before 5% before 8%', () => {
    const chaltu = herdMember('chaltu').animal
    const p = projectWaterDebt(chaltu, getBudgets('chaltu'), weatherAt, NOW, 'continue_work', { horizonH: 24 })
    const times = p.crossings.map((c) => c.t)
    expect([...times].sort((a, b) => a - b)).toEqual(times)
  })
})

describe('recommendations', () => {
  const text = (id: string) => recommendFor(id).map((r) => recommendationText(r))

  it('sends someone to Kito now, with his last position', () => {
    expect(text('kito')[0]).toBe(
      'Go to Kito now. Last position: 1.2 km north of the market, 6 minutes ago. Check if Kito can stand.',
    )
  })

  it('tells the owner where and when to water Chaltu', () => {
    const first = text('chaltu')[0]
    expect(first).toMatch(/^Stop Chaltu at the Aricha water point before \d\d:\d\d\. If work continues, Chaltu's water deficit passes 5% of body weight at about \d\d:\d\d\.$/)
  })

  it('asks the owner to look at Bari, a dull donkey', () => {
    expect(text('bari')[0]).toBe(
      'Look at Bari before evening work. Is Bari eating? Check gums and droppings. Dullness is the first sign of colic in donkeys.',
    )
  })

  it('tells Gelila\'s owner the tag is still learning', () => {
    expect(text('gelila')[0]).toContain('day 2 of 5')
  })

  it('reads in Amharic with translated places and directions', () => {
    const kito = recommendFor('kito')[0]
    const am = recommendationText(kito, 'am')
    expect(am).toContain('ገበያ')
    expect(am).not.toContain('market')
  })

  it('never names a disease as a diagnosis and uses known string keys', () => {
    for (const a of getHerd()) {
      for (const r of recommendFor(a.id)) {
        expect(hasKey(r.textKey)).toBe(true)
        const s = recommendationText(r).toLowerCase()
        expect(s).not.toMatch(/has colic|colic detected|is dehydrated|diagnos/)
      }
    }
  })

  it('works on hand-made data without positions', () => {
    const b = synthHistory(NOW, 20, (t, h, base) =>
      t >= localDayStart(NOW) && h === 13 ? makeHour(t, { minutes: { lie: 20, eat: 5 }, lyingBouts: 3, upDowns: 3 }) : base,
    )
    const a = assess(horse, b, NOW)
    const recs = recommend(horse, a, {}, [])
    expect(recs[0].textKey).toBe('forecast.rec.goNowNoPosition')
    expect(recs.map((r) => r.priority)).toEqual([...recs.map((r) => r.priority)].sort((x, y) => x - y))
  })
})
