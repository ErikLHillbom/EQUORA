import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import metricsText from '../../public/models/metrics.json?raw'
import DataScreen from './DataScreen'
import { accuracyGapPoints, dec, foldRange, int, kb, largestConfusion, pct, ruleThreshold, type DatasheetMetrics } from './metrics'
import { SOURCE_GROUPS, sourceById } from './sources'
import { strings } from './strings'

const m = JSON.parse(metricsText) as DatasheetMetrics

describe('datasheet number formats', () => {
  it('formats shares, decimals, counts and sizes', () => {
    expect(pct(0.9612)).toBe('96.1%')
    expect(dec(0.9505)).toBe('0.951')
    expect(int(49045)).toBe('49,045')
    expect(kb(123201)).toBe('120.3 KB')
  })

  it('derives the largest mix-up, the horse range and the rule threshold from metrics.json', () => {
    const mix = largestConfusion(m)
    const { labels, matrix } = m.confusion
    const offDiagonal = matrix.flatMap((row, i) => row.filter((_, j) => j !== i))
    expect(mix.count).toBe(Math.max(...offDiagonal))
    expect(matrix[labels.indexOf(mix.trueLabel)][labels.indexOf(mix.predicted)]).toBe(mix.count)
    const { low, high } = foldRange(m)
    expect(low.accuracy).toBe(Math.min(...m.perFold.map((f) => f.accuracy)))
    expect(high.accuracy).toBe(Math.max(...m.perFold.map((f) => f.accuracy)))
    expect(ruleThreshold('keep roll if precision and recall are both >= 0.3')).toBe('0.3')
    expect(Number(accuracyGapPoints(m))).toBeCloseTo((m.accuracy - m.baseline.accuracy) * 100, 1)
  })
})

describe('sources', () => {
  it('every source links over https and ids are unique', () => {
    const all = SOURCE_GROUPS.flatMap((g) => g.sources)
    expect(new Set(all.map((s) => s.id)).size).toBe(all.length)
    for (const s of all) expect(s.url).toMatch(/^https:\/\//)
    expect(sourceById('worku2017').short).toBe('Worku et al. 2017')
    expect(() => sourceById('nope')).toThrow()
  })

  it('every group heading has a string', () => {
    for (const g of SOURCE_GROUPS) expect(strings.en[g.titleKey]).toBeTruthy()
  })
})

describe('DataScreen', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows the accuracy read from metrics.json and the honesty slip', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(metricsText)))
    render(<DataScreen />)
    expect(await screen.findByTestId('metric-accuracy')).toHaveTextContent(pct(m.accuracy))
    expect(screen.getByTestId('metric-f1')).toHaveTextContent(dec(m.macroF1))
    expect(screen.getByTestId('baseline-accuracy')).toHaveTextContent(pct(m.baseline.accuracy))

    const slip = document.getElementById('data-gaps')!
    expect(within(slip).getByRole('heading', { name: /What our data does not cover/ })).toBeInTheDocument()
    expect(within(slip).getAllByRole('listitem')).toHaveLength(10)
    const roll = m.rollDecision.withRoll!.support
    expect(within(slip).getByText(`Rolling is rare: ${roll} windows in the whole training set.`)).toBeInTheDocument()
  })

  it('still shows the rest of the page when metrics.json does not load', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    render(<DataScreen />)
    expect(await screen.findByText('Model figures did not load')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /What our data does not cover/ })).toBeInTheDocument()
    expect(screen.queryByTestId('metric-accuracy')).toBeNull()
  })
})
