// Hand-applied highlights in a state ink (DESIGN 4). One highlight per card at most.
import { useMemo, type ReactNode } from 'react'
import { stateInk } from '../tokens'
import type { StateId } from '../types'
import { pencilLoop, pencilStroke } from './geometry'

export interface PencilCircleProps {
  children: ReactNode
  /** State ink for the circle. Default 'check'. */
  state?: StateId
  /** Seed for the wobble, usually the animal id. */
  id: string
  /** Draw the circle in once when motion is allowed. Default true. */
  drawIn?: boolean
  className?: string
}

/** A pencil circle around the card that needs attention first. Decorative: the state stamp carries the meaning. */
export function PencilCircle({ children, state = 'check', id, drawIn = true, className }: PencilCircleProps) {
  const d = useMemo(() => pencilLoop(id), [id])
  return (
    <div className={['ui-pencilcircle', className].filter(Boolean).join(' ')}>
      {children}
      <svg
        className={['ui-pencilcircle-mark', drawIn ? 'ui-draw-in' : ''].join(' ')}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path d={d} pathLength={1} fill="none" stroke={stateInk(state)} />
      </svg>
    </div>
  )
}

export interface PencilUnderlineProps {
  children: ReactNode
  state?: StateId
  id: string
  className?: string
}

/** A hand-drawn underline under a number that is outside the animal's normal. */
export function PencilUnderline({ children, state = 'check', id, className }: PencilUnderlineProps) {
  const d = useMemo(() => pencilStroke(id, 100, 4), [id])
  return (
    <span className={['ui-underline', className].filter(Boolean).join(' ')}>
      {children}
      <svg className="ui-underline-mark" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d={d} fill="none" stroke={stateInk(state)} />
      </svg>
    </span>
  )
}
