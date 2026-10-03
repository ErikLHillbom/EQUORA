import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { FIGURES, tagShares } from './figures'
import WhyScreen from './WhyScreen'

describe('why it matters', () => {
  it('a tag at the top of the parts estimate is under 5% of a donkey year', () => {
    const { ofYearPct } = tagShares()
    expect(ofYearPct).toBeLessThan(5)
    expect(ofYearPct).toBeCloseTo((FIGURES.tagPartsUsd[1] / FIGURES.donkeyValueUsd) * 100, 6)
  })

  it('cites a source next to the figures and ends with the herd and the tag', () => {
    render(
      <MemoryRouter>
        <WhyScreen />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Why it matters', level: 1 })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Asteraye et al. 2026' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Worku et al. 2017' })).toHaveAttribute('href', 'https://pubmed.ncbi.nlm.nih.gov/28401328/')
    expect(screen.getByTestId('why-share')).toHaveTextContent('4.4%')
    expect(screen.getByRole('link', { name: 'See the herd' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Try the tag' })).toHaveAttribute('href', '/tag')
    expect(document.querySelectorAll('svg.ui-posture')).toHaveLength(1)
  })
})
