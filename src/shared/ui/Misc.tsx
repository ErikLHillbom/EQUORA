// The tag light, empty-state notes and the ledger.
import type { CSSProperties, ReactNode } from 'react'
import { useT } from '../../i18n/LanguageContext'
import { stateInk, stateText } from '../tokens'
import type { StateId } from '../types'

export interface LensProps {
  state: StateId
  /** Diameter in px. Default 140. */
  size?: number
  /** Show the state word under the light. Default true. */
  showWord?: boolean
  /** Light off (for example while nothing has played yet). */
  off?: boolean
  className?: string
}

/** The tag light: a lit round lens in the state ink, with the state word. A light, not a stamp. */
export function Lens({ state, size = 140, showWord = true, off = false, className }: LensProps) {
  const { t } = useT()
  const word = t(`shared.state.${state}`)
  const style = { '--lens-ink': stateInk(state), '--lens-size': `${size}px` } as CSSProperties
  return (
    <figure className={['ui-lens', off ? 'ui-lens--off' : '', className].filter(Boolean).join(' ')} style={style} data-state={state}>
      <span className="ui-lens-housing" role="img" aria-label={t('shared.lens.label', { state: word })}>
        <span className="ui-lens-glass" />
      </span>
      {showWord && (
        <figcaption className="ui-lens-word" style={{ color: stateText(state) }}>
          {word}
        </figcaption>
      )}
    </figure>
  )
}

export interface EmptyNoteProps {
  /** One or two short sentences. No apology, no exclamation mark. */
  children: ReactNode
  /** Optional short heading. */
  title?: ReactNode
  /** Slot for a small drawing. It is printed in a halftone screen. */
  drawing?: ReactNode
  className?: string
}

/** Empty, offline and error states, written as a short note. */
export function EmptyNote({ children, title, drawing, className }: EmptyNoteProps) {
  return (
    <aside className={['ui-slip', 'ui-slip--padded', 'ui-emptynote', className].filter(Boolean).join(' ')}>
      {drawing && (
        <div className="ui-emptynote-drawing" aria-hidden="true">
          {drawing}
        </div>
      )}
      <div className="ui-emptynote-text">
        {title && <p className="ui-emptynote-title">{title}</p>}
        <div>{children}</div>
      </div>
    </aside>
  )
}

export interface LedgerProps {
  /** Table caption, shown as a mono label. */
  caption?: ReactNode
  /** thead and tbody. Add className "num" to numeric cells to right-align them. */
  children: ReactNode
  className?: string
}

/** A ledger table: mono columns, hairline rules. Scrolls sideways inside its slip if it must. */
export function Ledger({ caption, children, className }: LedgerProps) {
  return (
    <div className={['ui-ledger-wrap', className].filter(Boolean).join(' ')}>
      <table className="ui-ledger">
        {caption && <caption>{caption}</caption>}
        {children}
      </table>
    </div>
  )
}
