import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { checkText } from '../../scripts/check-copy'
import { strings } from './strings'

// No WebGL in jsdom: the screen must fall back to the note and the animal list.
vi.mock('./offline', () => ({
  ensureMapSources: vi.fn(() => Promise.reject(new Error('no tiles'))),
  MAP_MISSING_KEY: 'map.offline.missing',
}))
vi.mock('maplibre-gl', () => ({
  Map: vi.fn(),
  Marker: vi.fn(),
  AttributionControl: vi.fn(),
}))
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

const { default: MapScreen } = await import('./MapScreen')

function renderAt(url: string) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  return render(
    <MemoryRouter initialEntries={[url]}>
      <MapScreen />
    </MemoryRouter>,
  )
}

describe('MapScreen without a map', () => {
  it('shows the missing tiles note, the simulated data stamp and the urgent animal', () => {
    renderAt('/map')
    expect(screen.getByText('Map tiles for this area are not saved on this phone.')).toBeInTheDocument()
    expect(screen.getByText('Simulated data')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Kito' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open case file' })).toHaveAttribute('href', '/animal/kito')
  })

  it('selects the animal in ?animal=', () => {
    renderAt('/map?animal=bari')
    expect(screen.getByRole('heading', { name: 'Bari' })).toBeInTheDocument()
  })

  it('the list selects an animal and the panel closes', () => {
    renderAt('/map')
    expect(screen.getAllByRole('button', { pressed: false }).length).toBeGreaterThanOrEqual(11)
    fireEvent.click(screen.getByRole('button', { name: /^Chaltu/ }))
    expect(screen.getByRole('heading', { name: 'Chaltu' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('heading', { name: 'Chaltu' })).not.toBeInTheDocument()
  })
})

describe('map strings', () => {
  it('follow the writing rules', () => {
    for (const [key, text] of Object.entries(strings.en)) {
      expect(checkText(text, key)).toEqual([])
      expect(text).not.toMatch(/!/)
    }
  })
})
