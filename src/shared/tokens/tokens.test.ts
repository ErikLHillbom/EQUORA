/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { contrastRatio, parseColorTokens } from './contrast'
import { STATES } from '../types'

// Read from disk: Vitest does not load CSS contents through imports.
const css = readFileSync(join(process.cwd(), 'src/shared/tokens/tokens.css'), 'utf8')
const tokens = parseColorTokens(css)
const surfaces = ['paper', 'paper-raised'] as const
const textTokens = Object.keys(tokens).filter((name) => name.endsWith('-text') || name.startsWith('text-'))

describe('design tokens', () => {
  it('defines paper, ink and a text value for every state', () => {
    for (const name of ['paper', 'paper-raised', 'kraft', 'rule', 'ink', 'graphite']) {
      expect(tokens[name], name).toMatch(/^#[0-9a-f]{6}$/)
    }
    for (const state of STATES) {
      expect(tokens[`state-${state}`], state).toBeDefined()
      expect(tokens[`state-${state}-text`], state).toBeDefined()
    }
    expect(textTokens.length).toBeGreaterThanOrEqual(7)
  })

  for (const surface of surfaces) {
    it(`every text token reaches 4.5:1 on ${surface}`, () => {
      for (const name of textTokens) {
        const ratio = contrastRatio(tokens[name], tokens[surface])
        expect(ratio, `${name} on ${surface}: ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
      }
    })
  }

  it('ink is far above the minimum on both surfaces', () => {
    for (const surface of surfaces) expect(contrastRatio(tokens.ink, tokens[surface])).toBeGreaterThanOrEqual(12)
  })

  it('paper text on an ink button and ink labels on kraft pass 4.5:1', () => {
    expect(contrastRatio(tokens['paper-raised'], tokens.ink)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(tokens.ink, tokens.kraft)).toBeGreaterThanOrEqual(4.5)
  })

  it('every state stamp ink reaches 3:1 on paper as a graphic (WCAG 1.4.11)', () => {
    for (const state of STATES) {
      for (const surface of surfaces) {
        const ratio = contrastRatio(tokens[`state-${state}`], tokens[surface])
        expect(ratio, `${state} on ${surface}: ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('prints the ratios for the record', () => {
    const lines = textTokens.map(
      (n) =>
        `${n} ${tokens[n]}: ${contrastRatio(tokens[n], tokens.paper).toFixed(2)} / ${contrastRatio(tokens[n], tokens['paper-raised']).toFixed(2)}`,
    )
    expect(lines.length).toBe(textTokens.length)
    if (process.env.PRINT_CONTRAST) console.log(lines.join('\n'))
  })
})
