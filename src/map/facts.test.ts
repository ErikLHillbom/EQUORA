import { countClimbs, mapHerd, routeLine, todayNumbers } from './facts'

const ele = (...m: number[]) => m.map((eleM) => ({ eleM }))

describe('countClimbs', () => {
  it('counts each climb of 40 m or more once', () => {
    expect(countClimbs(ele(1800, 1820, 1850, 1860, 1840, 1830, 1880, 1900))).toEqual({ count: 2, longestM: 70 })
  })

  it('ignores small bumps and an empty day', () => {
    expect(countClimbs(ele(1800, 1820, 1810, 1830, 1815))).toEqual({ count: 0, longestM: 0 })
    expect(countClimbs([])).toEqual({ count: 0, longestM: 0 })
  })

  it('a dip under 15 m does not split one climb', () => {
    expect(countClimbs(ele(1800, 1850, 1840, 1900))).toEqual({ count: 1, longestM: 100 })
  })
})

describe('routeLine', () => {
  const home = { lat: 6.15, lon: 38.2 }
  it('draws fixes near home at home and drops tiny steps', () => {
    const fixes = [
      { t: 0, lat: 6.1501, lon: 38.2003, eleM: 0 },
      { t: 1, lat: 6.1499, lon: 38.1998, eleM: 0 },
      { t: 2, lat: 6.16, lon: 38.2, eleM: 0 },
      { t: 3, lat: 6.16001, lon: 38.2, eleM: 0 },
    ]
    expect(routeLine(fixes, home)).toEqual([
      [38.2, 6.15],
      [38.2, 6.16],
    ])
  })
})

describe('mapHerd', () => {
  const herd = mapHerd()

  it('has every animal of the demo herd, most urgent first, each with a position today', () => {
    expect(herd).toHaveLength(12)
    expect(herd[0].assessment.state).toBe('urgent')
    for (const h of herd) {
      expect(h.lastFix).toBeDefined()
      expect(h.route.length).toBeGreaterThan(1)
    }
  })

  it("today's numbers come from the tag's hourly budgets", () => {
    const kito = todayNumbers('kito')
    expect(kito.distanceKm).toBeGreaterThan(5)
    expect(kito.climbM).toBeGreaterThan(100)
    expect(kito.workload).toBeGreaterThan(0)
    expect(kito.workload).toBeLessThanOrEqual(100)
  })
})
