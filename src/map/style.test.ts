import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import { buildMapStyle, MAP_INK } from './style'

// State inks (DESIGN 4). The base map must never use them.
const STATE_INKS = ['#2E6A3A', '#1F4E9A', '#C98A1B', '#8A5A10', '#A8261E']
const PAPER_AND_INK = new Set(Object.values(MAP_INK).map((c) => c.toUpperCase()))

function colours(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string' && /^#[0-9a-f]{3,8}$|^rgba?\(/i.test(value)) out.push(value)
  else if (Array.isArray(value)) value.forEach((v) => colours(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => colours(v, out))
  return out
}

describe('buildMapStyle', () => {
  for (const lang of ['en', 'am'] as const) {
    it(`is a valid MapLibre style (${lang})`, () => {
      const style = buildMapStyle({ lang, baseUrl: 'http://localhost/' })
      expect(validateStyleMin(style)).toEqual([])
    })
  }

  it('uses only paper and ink colours', () => {
    const style = buildMapStyle({ baseUrl: 'http://localhost/' })
    const used = colours([style.layers.map((l) => ('paint' in l ? l.paint : {})), style.sky])
    for (const c of used) {
      expect(STATE_INKS).not.toContain(c.toUpperCase())
      expect(PAPER_AND_INK.has(c.toUpperCase()), `unexpected colour ${c}`).toBe(true)
    }
  })

  it('needs no sprite and only the fonts we ship', () => {
    const style = buildMapStyle({ baseUrl: 'http://localhost/' })
    expect(style.sprite).toBeUndefined()
    const fonts = new Set(JSON.stringify(style.layers).match(/Noto Sans[\w ]*/g))
    expect([...fonts].sort()).toEqual(['Noto Sans Medium', 'Noto Sans Regular'])
    for (const l of style.layers) {
      if (l.type === 'symbol') expect(l.layout?.['icon-image']).toBeUndefined()
    }
  })

  it('has terrain and hillshade on separate DEM sources', () => {
    const style = buildMapStyle({ baseUrl: 'http://localhost/' })
    expect(style.terrain?.source).toBe('terrain')
    const hill = style.layers.find((l) => l.type === 'hillshade')
    expect(hill && 'source' in hill && hill.source).toBe('hillshade')
    expect(buildMapStyle({ terrain: false, baseUrl: 'http://localhost/' }).terrain).toBeUndefined()
  })
})
