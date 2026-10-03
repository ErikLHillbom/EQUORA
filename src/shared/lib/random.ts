// Deterministic randomness. Same seed, same herd, same stamps, every render.

/** 32-bit FNV-1a hash of a string, for seeding from ids. */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32: small, fast, good enough for simulation. Returns floats in [0, 1). */
export function createRng(seed: number | string): () => number {
  let a = typeof seed === 'string' ? hashString(seed) : seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard normal draw (Box-Muller) from a uniform rng. */
export function gaussian(rng: () => number): number {
  const u = Math.max(rng(), 1e-12)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** A fixed angle in degrees in [-max, max] for an id, e.g. stamp rotation. */
export function seededAngle(id: string, max: number): number {
  const r = createRng(`angle:${id}`)()
  return (r * 2 - 1) * max
}
