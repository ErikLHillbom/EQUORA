import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { BandChart } from '../charts'
import { STATES } from '../types'
import { BottomNav, DotNumber, PostureDrawing, RectStamp, StateStamp, TodayCard } from './index'
import { pencilLoop } from './geometry'

describe('shared primitives', () => {
  it('every state stamp shows its word as real text', () => {
    render(
      <>
        {STATES.map((s) => (
          <StateStamp key={s} state={s} id="mulu" />
        ))}
      </>,
    )
    for (const word of ['Normal', 'Water', 'Check', 'Urgent', 'Not sure']) expect(screen.getByText(word)).toBeInTheDocument()
  })

  it('a stamp without the word carries it as its accessible name', () => {
    render(<StateStamp state="urgent" showWord={false} id="mulu" />)
    expect(screen.getByRole('img', { name: 'Urgent' })).toBeInTheDocument()
  })

  it('stamps are seeded: the same id gives the same wear and rotation', () => {
    const a = render(<StateStamp state="check" id="a1" />).container.innerHTML
    const b = render(<StateStamp state="check" id="a1" />).container.innerHTML
    const strip = (s: string) => s.replace(/st[^"#)]*?-(rough|voids|wear)/g, 'X')
    expect(strip(a)).toBe(strip(b))
    expect(pencilLoop('x')).toBe(pencilLoop('x'))
  })

  it('rect stamps read from the string table', () => {
    render(
      <>
        <RectStamp kind="simulated" />
        <RectStamp kind="learning" name="Mulu" day={2} of={5} />
        <RectStamp kind="feedback" feedback="not_eating" id="c1" />
      </>,
    )
    expect(screen.getByText('Simulated data')).toBeInTheDocument()
    expect(screen.getByText("Learning Mulu's normal. Day 2 of 5.")).toBeInTheDocument()
    expect(screen.getByText('Checked: not eating')).toBeInTheDocument()
  })

  it('the dot-matrix number keeps the real value for screen readers', () => {
    render(<DotNumber value="7.4" />)
    expect(screen.getByText('7.4')).toHaveClass('visually-hidden')
  })

  it('a today card outside the range says so and shows the normal', () => {
    render(<TodayCard label="Distance" value={2.1} unit="km" name="Mulu" low={6} high={8} state="check" id="d" />)
    expect(screen.getByText('Normal for Mulu: 6.0 to 8.0 km')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Today 2.1 is outside the normal 6.0 to 8.0.' })).toBeInTheDocument()
  })

  it('posture drawings show the rendered still for the species and pose, mule as donkey', () => {
    const { container } = render(<PostureDrawing species="mule" pose="lying" stale width={160} />)
    expect(screen.getByRole('img', { name: 'Mule, lying, old data' })).toBeInTheDocument()
    const img = container.querySelector('img')!
    expect(img.getAttribute('src')).toMatch(/models3d\/stills\/donkey-lying\.webp$/)
    expect(img).toHaveAttribute('width', '160')
    expect(img).toHaveAttribute('height', '120')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('alt', '')
    render(<PostureDrawing species="horse" pose="trotting" />)
    expect(screen.getByRole('img', { name: 'Horse, trotting' }).querySelector('img')!.getAttribute('src')).toMatch(/horse-trotting\.webp$/)
  })

  it('a stale posture drawing differs from a fresh one: faded and framed', () => {
    const fresh = render(<PostureDrawing species="horse" pose="standing" />).container.firstElementChild!
    const stale = render(<PostureDrawing species="horse" pose="standing" stale />).container.firstElementChild!
    expect(fresh).not.toHaveClass('ui-posture--stale')
    expect(stale).toHaveClass('ui-posture--stale')
  })

  it('a decorative posture drawing is hidden from screen readers', () => {
    const { container } = render(<PostureDrawing species="donkey" pose="grazing" decorative />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('the bottom nav has five links and marks the current page', () => {
    render(
      <MemoryRouter initialEntries={['/map']}>
        <BottomNav />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('link')).toHaveLength(5)
    expect(screen.getByRole('link', { name: 'Map' })).toHaveAttribute('aria-current', 'page')
  })

  it('the band chart has an accessible title', () => {
    const t0 = Date.UTC(2026, 9, 3, 0)
    const data = Array.from({ length: 12 }, (_, i) => ({ t: t0 + i * 3600000, value: i === 8 ? 12 : 5, low: 4, high: 7 }))
    render(<BandChart data={data} title="Activity today" desc="Activity rose above normal at 11:00." />)
    expect(screen.getByRole('img', { name: 'Activity today' })).toBeInTheDocument()
  })
})
