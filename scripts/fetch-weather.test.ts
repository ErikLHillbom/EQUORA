import { fillFromRecentDays, lapseCorrection } from './fetch-weather'

describe('fetch-weather helpers', () => {
  it('fills missing hours from the same hour of the most recent day', () => {
    const v = [1, 2, 3, 4, NaN, NaN]
    expect(fillFromRecentDays(v, 2)).toEqual([4, 5])
    expect(v).toEqual([1, 2, 3, 4, 3, 4])
  })

  it('cools the air by 6.5 C per km of extra height', () => {
    expect(lapseCorrection(900, 1900)).toBeCloseTo(-6.5)
    expect(lapseCorrection(1850, 1900)).toBeCloseTo(-0.325)
  })
})
