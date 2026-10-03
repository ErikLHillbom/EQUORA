import { DAY, DEMO_NOW, localDayStart } from '../shared/lib/clock'
import { getWeather, weatherAt } from './weather'

describe('weather', () => {
  const w = getWeather()

  it('covers 180 days plus the demo day, hour by hour', () => {
    expect(w.tempC.length).toBe(181 * 24)
    expect(w.rh.length).toBe(w.tempC.length)
    expect(w.start).toBeLessThanOrEqual(DEMO_NOW - 180 * DAY)
    expect(w.start + w.tempC.length * w.stepMs).toBe(localDayStart(DEMO_NOW) + DAY)
  })

  it('has highland values: cool nights, warm afternoons', () => {
    for (const t of w.tempC) {
      expect(t).toBeGreaterThan(5)
      expect(t).toBeLessThan(36)
    }
    const night = weatherAt(localDayStart(DEMO_NOW) + 3 * 3600e3).tempC
    const afternoon = weatherAt(DEMO_NOW).tempC
    expect(afternoon).toBeGreaterThan(night + 5)
  })

  it('marks the filled demo day', () => {
    expect(w.filledFrom).not.toBeNull()
    expect(w.filledFrom!).toBeLessThanOrEqual(localDayStart(DEMO_NOW))
  })
})
