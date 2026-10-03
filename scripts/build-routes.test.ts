import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Network, simplify, straightLine } from './build-routes'

describe('build-routes helpers', () => {
  it('simplify keeps the ends and drops points on a straight line', () => {
    const line = straightLine({ lat: 6.15, lon: 38.2 }, { lat: 6.17, lon: 38.21 }, 100)
    const s = simplify(line, 5)
    expect(s).toHaveLength(2)
    expect(s[0]).toEqual(line[0])
    expect(s[1]).toEqual(line[line.length - 1])
  })

  it('finds the shortest path on a small network', () => {
    const g = (lat: number, lon: number) => ({ lat, lon })
    const net = new Network([
      {
        type: 'way',
        id: 1,
        nodes: [1, 2, 3],
        geometry: [g(6.1, 38.1), g(6.1, 38.11), g(6.1, 38.12)],
        tags: { highway: 'track' },
      },
      {
        type: 'way',
        id: 2,
        nodes: [1, 4, 3],
        geometry: [g(6.1, 38.1), g(6.13, 38.11), g(6.1, 38.12)],
        tags: { highway: 'track' },
      },
    ])
    const path = net.path(1, 3)
    expect(path).toHaveLength(3)
    expect(path![1]).toEqual(g(6.1, 38.11))
  })

  it('keeps routes.json under 150 KB', () => {
    const size = readFileSync(join(process.cwd(), 'src/simulation/routes.json')).length
    expect(size).toBeLessThan(150 * 1024)
  })
})
