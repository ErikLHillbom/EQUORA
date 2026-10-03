import { HERD, HOUSEHOLDS } from './herd'
import { HOMES } from './places'

describe('demo herd', () => {
  const animals = HERD.map((m) => m.animal)

  it('has 12 animals: 8 donkeys, 3 horses, 1 mule', () => {
    expect(animals).toHaveLength(12)
    expect(animals.filter((a) => a.species === 'donkey')).toHaveLength(8)
    expect(animals.filter((a) => a.species === 'horse')).toHaveLength(3)
    expect(animals.filter((a) => a.species === 'mule')).toHaveLength(1)
  })

  it('uses the scenario names from the team notes', () => {
    for (const name of ['Mulu', 'Bari', 'Kito', 'Saba', 'Chaltu', 'Gelila']) {
      expect(animals.some((a) => a.name === name)).toBe(true)
    }
  })

  it('keeps body weights in the ranges for small local breeds', () => {
    for (const a of animals) {
      if (a.species === 'donkey') expect(a.bodyWeightKg).toBeGreaterThanOrEqual(120)
      if (a.species === 'donkey') expect(a.bodyWeightKg).toBeLessThanOrEqual(180)
      if (a.species === 'horse') expect(a.bodyWeightKg).toBeGreaterThanOrEqual(250)
      if (a.species === 'horse') expect(a.bodyWeightKg).toBeLessThanOrEqual(350)
    }
  })

  it('has unique ids and tags, and every household has a home', () => {
    expect(new Set(animals.map((a) => a.id)).size).toBe(12)
    expect(new Set(animals.map((a) => a.tagId)).size).toBe(12)
    for (const a of animals) expect(a.tagId).toMatch(/^ES-\d{4}$/)
    for (const h of HOUSEHOLDS) expect(HOMES.some((home) => home.household === h)).toBe(true)
    expect(new Set(animals.map((a) => a.household)).size).toBe(HOUSEHOLDS.length)
  })
})
