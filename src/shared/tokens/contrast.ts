// WCAG 2.x relative luminance and contrast ratio for #rrggbb colours.

function channel(v: number): number {
  const s = v / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) throw new Error(`Not a #rrggbb colour: ${hex}`)
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Reads `--name: #hex;` declarations from a CSS text, following simple var() aliases. */
export function parseColorTokens(css: string): Record<string, string> {
  const raw: Record<string, string> = {}
  for (const m of css.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) raw[m[1]] = m[2].trim()
  const out: Record<string, string> = {}
  const resolve = (value: string, depth = 0): string | undefined => {
    if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase()
    const ref = /^var\(--([\w-]+)\)$/.exec(value)
    if (ref && depth < 5 && raw[ref[1]] !== undefined) return resolve(raw[ref[1]], depth + 1)
    return undefined
  }
  for (const [name, value] of Object.entries(raw)) {
    const hex = resolve(value)
    if (hex) out[name] = hex
  }
  return out
}
