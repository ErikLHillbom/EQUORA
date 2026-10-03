import { animalCandidates, declutter, MARKER_STEP, placeLabelCandidates, STAMP_RESERVE } from './declutter'

const viewport = { left: 0, top: 0, right: 360, bottom: 600 }
const animal = (id: string, x: number, y: number) => ({
  id,
  x,
  y,
  candidates: animalCandidates(90),
  required: true,
  reserve: STAMP_RESERVE,
})

describe('declutter', () => {
  it('leaves markers that do not touch on their point', () => {
    const out = declutter([animal('a', 100, 100), animal('b', 100, 300)], [], viewport)
    expect(out.get('a')).toMatchObject({ dx: 0, dy: 0 })
    expect(out.get('b')).toMatchObject({ dx: 0, dy: 0 })
  })

  it('stacks animals in one yard, the first one keeps the spot', () => {
    const out = declutter([animal('a', 150, 300), animal('b', 152, 302), animal('c', 149, 301)], [], viewport)
    expect(out.get('a')).toMatchObject({ dx: 0, dy: 0 })
    const moved = [out.get('b')!, out.get('c')!]
    for (const m of moved) expect(Math.abs(m.dy)).toBeGreaterThanOrEqual(MARKER_STEP)
    expect(moved[0].dy).not.toBe(moved[1].dy)
  })

  it('flips the name tab near the right edge', () => {
    const out = declutter([animal('a', 340, 300)], [], viewport)
    expect(out.get('a')).toMatchObject({ dx: 0, dy: 0, flip: true })
  })

  it("a moved marker does not land on another animal's real spot", () => {
    // b would move up onto c's point if c did not keep it free.
    const out = declutter([animal('a', 150, 300), animal('b', 150, 300), animal('c', 150, 250)], [], viewport)
    expect(out.get('c')).toMatchObject({ dx: 0, dy: 0 })
  })

  it('hides an optional label that has no room', () => {
    const label = { id: 'p', x: 100, y: 100, candidates: placeLabelCandidates(60, 14), required: false }
    const wall = { left: 0, top: 0, right: 360, bottom: 600 }
    expect(declutter([label], [wall]).get('p')).toMatchObject({ index: -1 })
    expect(declutter([label]).get('p')).toMatchObject({ index: 0 })
  })
})
