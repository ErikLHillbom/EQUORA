// Header strip with a deckled bottom edge (the only torn edge in the app) and a coordinate block.
import { createElement, useMemo, type CSSProperties, type ReactNode } from 'react'
import { createRng } from '../lib/random'

function deckle(seed: string, points = 36): string {
  const rng = createRng(`deckle:${seed}`)
  const pts: string[] = ['0 0', '100% 0']
  for (let i = points; i >= 0; i--) {
    const x = (i / points) * 100
    const y = 1 + rng() * 5 + (i % 2) * rng() * 2
    pts.push(`${x.toFixed(2)}% calc(100% - ${y.toFixed(1)}px)`)
  }
  return `polygon(${pts.join(', ')})`
}

export interface HeaderStripProps {
  /** Screen title in serif. */
  title: ReactNode
  /** Small mono caps line above the title. */
  kicker?: ReactNode
  /** Slot under the title, usually a CoordinateBlock. */
  children?: ReactNode
  /** Slot at the top right, e.g. the Simulated data stamp. */
  aside?: ReactNode
  /** Heading level of the title. Default 'h1'. */
  headingLevel?: 'h1' | 'h2'
  /** Seed for the deckled edge. */
  id?: string
  className?: string
}

export function HeaderStrip({ title, kicker, children, aside, headingLevel = 'h1', id = 'header', className }: HeaderStripProps) {
  const clip = useMemo(() => deckle(id), [id])
  return (
    <header className={['ui-header', className].filter(Boolean).join(' ')}>
      <div className="ui-header-sheet" style={{ '--deckle': clip } as CSSProperties}>
        <div className="ui-header-top">
          <div className="ui-header-titles">
            {kicker && <p className="ui-label ui-header-kicker">{kicker}</p>}
            {createElement(headingLevel, { className: 'ui-header-title' }, title)}
          </div>
          {aside && <div className="ui-header-aside">{aside}</div>}
        </div>
        {children && <div className="ui-header-body">{children}</div>}
      </div>
    </header>
  )
}

export interface CoordinateBlockProps {
  /** Short cells, e.g. ['6.162 N', '38.205 E', 'Yirgacheffe', 'Gedeo zone']. Set in mono caps by CSS. */
  cells: readonly string[]
  /** Columns. Default 2. */
  columns?: 2 | 3 | 4
  /** Accessible name, e.g. "Demo area". */
  label?: string
  className?: string
}

/** Justified mono block with dashed column guides, like a surveyor's coordinate block. */
export function CoordinateBlock({ cells, columns = 2, label, className }: CoordinateBlockProps) {
  return (
    <div
      className={['ui-coords', className].filter(Boolean).join(' ')}
      style={{ '--coord-cols': columns } as CSSProperties}
      role="group"
      aria-label={label}
    >
      {cells.map((c, i) => (
        <span key={i} className={i % columns === 0 ? 'ui-coords-cell is-row-start' : 'ui-coords-cell'}>
          {c}
        </span>
      ))}
    </div>
  )
}
