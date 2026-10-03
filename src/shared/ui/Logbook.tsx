// The "Detected changes" logbook: date stamp, small state stamp, one sentence, perforated line between entries.
import type { ReactNode } from 'react'
import type { FeedbackId, StateId } from '../types'
import { DateStamp, RectStamp, StateStamp } from './Stamp'

export interface LogbookProps {
  children: ReactNode
  /** Accessible name of the list, e.g. "Detected changes". */
  label?: string
  className?: string
}

/** An ordered list of entries. Perforations sit between entries. */
export function Logbook({ children, label, className }: LogbookProps) {
  return (
    <ol className={['ui-logbook', className].filter(Boolean).join(' ')} aria-label={label}>
      {children}
    </ol>
  )
}

export interface LogbookEntryProps {
  /** When the change was detected, epoch ms. */
  at: number
  state: StateId
  /** One plain sentence: what was seen. */
  children: ReactNode
  /** Seed for the stamps, usually the change id. */
  id: string
  /** Owner feedback, stamped onto the entry once recorded. */
  feedback?: FeedbackId
  /** Slot for feedback buttons, shown while there is no feedback yet. */
  actions?: ReactNode
}

export function LogbookEntry({ at, state, children, id, feedback, actions }: LogbookEntryProps) {
  return (
    <li className="ui-logentry">
      <div className="ui-logentry-meta">
        <DateStamp at={at} id={`${id}:date`} />
        <StateStamp state={state} id={id} />
      </div>
      <p className="ui-logentry-text">{children}</p>
      {feedback ? (
        <div className="ui-logentry-feedback">
          <RectStamp kind="feedback" feedback={feedback} id={id} />
        </div>
      ) : (
        actions && <div className="ui-logentry-actions">{actions}</div>
      )}
    </li>
  )
}
