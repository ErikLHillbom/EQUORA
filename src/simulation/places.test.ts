import { ARICHA, DEMO_BBOX, HOMES, MARKET, PLACES, TOWN_CENTRE, distanceKm } from './places'
import { ROUTES, climbBetween, getRoute, pointAt, routeLengthKm } from './routes'

describe('places', () => {
  it('sit inside the demo box', () => {
    for (const p of PLACES) {
      expect(p.lat).toBeGreaterThan(DEMO_BBOX.south)
      expect(p.lat).toBeLessThan(DEMO_BBOX.north)
      expect(p.lon).toBeGreaterThan(DEMO_BBOX.west)
      expect(p.lon).toBeLessThan(DEMO_BBOX.east)
    }
  })

  it('put Aricha less than 5 km from town and have 4 to 6 homes', () => {
    expect(distanceKm(ARICHA, TOWN_CENTRE)).toBeLessThan(5)
    expect(HOMES.length).toBeGreaterThanOrEqual(4)
    expect(HOMES.length).toBeLessThanOrEqual(6)
  })
})

describe('routes', () => {
  it('go from every home to Aricha, the water point and the market, plus the north slope', () => {
    for (const h of HOMES) {
      for (const purpose of ['aricha', 'water', 'market']) {
        expect(ROUTES.some((r) => r.from === h.id && r.purpose === purpose)).toBe(true)
      }
    }
    expect(ROUTES.some((r) => r.purpose === 'slope')).toBe(true)
  })

  it('have plausible elevations for the Yirgacheffe slopes', () => {
    for (const r of ROUTES) {
      for (const c of r.coords) {
        expect(c[2]).toBeGreaterThan(1500)
        expect(c[2]).toBeLessThan(2600)
      }
    }
  })

  it('start at the home and end at the place', () => {
    const r = getRoute('domorso-market')
    const home = HOMES.find((h) => h.id === r.from)!
    expect(distanceKm(pointAt(r.id, 0), home)).toBeLessThan(0.05)
    expect(distanceKm(pointAt(r.id, routeLengthKm(r.id)), MARKET)).toBeLessThan(0.05)
    expect(distanceKm(pointAt(r.id, 0, true), MARKET)).toBeLessThan(0.05)
  })

  it('count climb in the walking direction', () => {
    const id = 'adido-market'
    const L = routeLengthKm(id)
    const down = climbBetween(id, 0, L)
    const up = climbBetween(id, 0, L, true)
    expect(down).toBeGreaterThan(0)
    // The Adido home sits at about 2,086 m and the market at 1,845 m: walking back climbs more.
    expect(up).toBeGreaterThan(down)
  })
})
