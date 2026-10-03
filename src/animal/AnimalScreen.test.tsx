import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { DEMO_NOW } from '../shared/lib/clock'
import { CaseFileView } from './AnimalScreen'
import { feedbackStore } from './feedback'

function show(id: string) {
  return render(
    <MemoryRouter>
      <CaseFileView id={id} now={DEMO_NOW} />
    </MemoryRouter>,
  )
}

describe('animal case file', () => {
  it('Bari: check stamp, reasons, next steps and the simulated stamp', () => {
    show('bari')
    expect(screen.getByRole('heading', { level: 1, name: 'Bari' })).toBeInTheDocument()
    const header = document.querySelector('.animal-header') as HTMLElement
    expect(within(header).getByText('Check')).toBeInTheDocument()
    expect(within(header).getByText(/Activity 32% below Bari's normal/)).toBeInTheDocument()
    expect(screen.getAllByText('Simulated data').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'What to do next' })).toBeInTheDocument()
    expect(screen.getByText(/Look at Bari before evening work/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Show on map' })).toHaveAttribute('href', '/map?animal=bari')
    expect(screen.getByText('What the tag cannot see')).toBeInTheDocument()
  })

  it('Mulu: calm, no next steps, every card has a normal', () => {
    show('mulu')
    expect(screen.queryByRole('heading', { name: 'What to do next' })).toBeNull()
    expect(screen.getAllByText(/^Normal for Mulu:/)).toHaveLength(7)
    expect(document.querySelectorAll('.ui-underline')).toHaveLength(0)
  })

  it('Chaltu: water plans side by side', () => {
    show('chaltu')
    expect(screen.getByRole('heading', { name: 'Water plans' })).toBeInTheDocument()
    expect(screen.getByText('If work continues')).toBeInTheDocument()
    expect(screen.getByText('If Chaltu rests at water')).toBeInTheDocument()
    expect(document.querySelectorAll('.ui-underline')).toHaveLength(1)
  })

  it('Gelila: learning stamp, no normal yet', () => {
    show('gelila')
    expect(screen.getByText("Learning Gelila's normal. Day 2 of 5.")).toBeInTheDocument()
    expect(screen.getAllByText('Normal not learned yet').length).toBeGreaterThan(0)
  })

  it('lying readouts carry the Experimental stamp', () => {
    show('kito')
    expect(screen.getAllByText('Experimental').length).toBeGreaterThanOrEqual(2)
  })

  it('an unknown id gets a note and a link back', () => {
    show('nobody')
    expect(screen.getByText('No animal with this tag in the herd.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the herd' })).toHaveAttribute('href', '/')
  })

  it('records feedback, stamps it and stores it for the change', async () => {
    show('kito')
    const group = await screen.findByRole('group', { name: /Answer for the change on/ })
    fireEvent.click(within(group).getByRole('button', { name: 'Called for help' }))
    await waitFor(() => expect(screen.getByText('Saved on this phone.')).toBeInTheDocument())
    expect(screen.queryByRole('group', { name: /Answer for the change on/ })).toBeNull()
    await waitFor(async () => {
      const saved = await feedbackStore().forAnimal('kito')
      expect(saved.map((r) => r.feedback)).toEqual(['called_help'])
    })
  })
})
