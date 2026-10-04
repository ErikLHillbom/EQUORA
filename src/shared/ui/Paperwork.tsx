// Paper, slips and the small handmade pieces that frame information (DESIGN 6).
import { createElement, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'

export interface PaperProps {
  children: ReactNode
  /** Element to render. Default 'main'. */
  as?: 'main' | 'div' | 'section'
  /** Leave room for the bottom nav. Default true. */
  nav?: boolean
  /** wide: working screens up to --page-max (default). reading: prose up to --reading-max. full: edge to edge. */
  width?: 'wide' | 'reading' | 'full'
  className?: string
}

/** The page column. The grain is on the body behind it, never under text. */
export function Paper({ children, as = 'main', nav = true, width = 'wide', className }: PaperProps) {
  return createElement(
    as,
    {
      className: ['ui-paper', `ui-paper--${width}`, nav ? 'ui-paper--nav' : '', className].filter(Boolean).join(' '),
    },
    children,
  )
}

export interface SlipProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  as?: 'div' | 'section' | 'article' | 'li' | 'aside'
  /** raised: flat paper-raised card (default). kraft: kraft slip, ink text only, short lines. */
  tone?: 'raised' | 'kraft'
  /** Inner padding. Default true. */
  padded?: boolean
}

/** A sheet resting on the desk: flat paper-raised, hairline border, one soft shadow. */
export function Slip({ children, as = 'div', tone = 'raised', padded = true, className, ...rest }: SlipProps) {
  return createElement(
    as,
    {
      className: ['ui-slip', `ui-slip--${tone}`, padded ? 'ui-slip--padded' : '', className].filter(Boolean).join(' '),
      ...rest,
    },
    children,
  )
}

/** Short mono caps label, three words or fewer. The string stays sentence case. */
export function MonoLabel({ children, as = 'span', className }: { children: ReactNode; as?: 'span' | 'p' | 'h3' | 'h4' | 'dt'; className?: string }) {
  return createElement(as, { className: ['ui-label', className].filter(Boolean).join(' ') }, children)
}

export interface TapeProps {
  /** Rotation in degrees. Default -3. */
  angle?: number
  /** Where to stick it on a positioned parent. 'none' leaves positioning to style. Default 'top'. */
  placement?: 'top' | 'top-left' | 'top-right' | 'none'
  style?: CSSProperties
  className?: string
}

/** A strip of translucent tape. Decorative. */
export function Tape({ angle = -3, placement = 'top', style, className }: TapeProps) {
  return (
    <span
      aria-hidden="true"
      className={['ui-tape', `ui-tape--${placement}`, className].filter(Boolean).join(' ')}
      style={{ '--tape-rot': `${angle}deg`, ...style } as CSSProperties}
    />
  )
}

export interface CircledNumeralProps {
  n: number | string
  className?: string
}

/** A mono numeral inside a hand-drawn ellipse rotated -10 degrees. */
export function CircledNumeral({ n, className }: CircledNumeralProps) {
  return (
    <span className={['ui-numeral', className].filter(Boolean).join(' ')}>
      <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
        <path
          d="M33.5 13.2C36.8 20.5 33 30.6 23.6 33.9 14.6 37 5.9 32.6 4.6 24.9 3.3 17 9.4 8.6 18.4 6.6c6.3-1.4 11.6.4 14.3 4.1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          transform="rotate(-10 20 20)"
        />
      </svg>
      <span className="ui-numeral-n">{n}</span>
    </span>
  )
}

export interface NumberedHeadingProps {
  n: number | string
  children: ReactNode
  as?: 'h2' | 'h3'
  id?: string
  className?: string
}

/** Section heading of the case file: circled numeral and a serif heading. */
export function NumberedHeading({ n, children, as = 'h2', id, className }: NumberedHeadingProps) {
  return createElement(
    as,
    { id, className: ['ui-numhead', className].filter(Boolean).join(' ') },
    <CircledNumeral n={n} />,
    <span>{children}</span>,
  )
}

/** Stitched dashed line: a section divider. */
export function StitchDivider({ className }: { className?: string }) {
  return <hr className={['ui-stitch', className].filter(Boolean).join(' ')} />
}

/** Perforated dotted line: between logbook entries, or to mark a tear-off. */
export function Perforation({ className }: { className?: string }) {
  return <hr className={['ui-perforation', className].filter(Boolean).join(' ')} />
}

export interface CaseFolderProps {
  /** Tab label, e.g. the animal's name. Set in mono caps with wide tracking. */
  label: string
  /** Second line on the tab, e.g. the tag number. */
  note?: string
  children: ReactNode
  /** Heading level for the tab label. Default 'h1'. */
  headingLevel?: 'h1' | 'h2'
  className?: string
}

/** A case file: kraft tab with shoulders, kraft back, paper-raised sheet inside. */
export function CaseFolder({ label, note, children, headingLevel = 'h1', className }: CaseFolderProps) {
  return (
    <section className={['ui-folder', className].filter(Boolean).join(' ')}>
      <div className="ui-folder-tab">
        {createElement(headingLevel, { className: 'ui-folder-label' }, label)}
        {note && <span className="ui-folder-note">{note}</span>}
      </div>
      <div className="ui-folder-back">
        <div className="ui-folder-sheet">{children}</div>
      </div>
    </section>
  )
}
