// Token helpers for TypeScript. The values live in tokens.css as CSS custom properties.
import type { StateId } from '../types'

/** Stamp and line ink for a state, as a CSS value. */
export function stateInk(state: StateId): string {
  return `var(--state-${state})`
}

/** Text ink for a state (passes 4.5:1 on paper and paper-raised). */
export function stateText(state: StateId): string {
  return `var(--state-${state}-text)`
}

/** Each state has its own stamp shape, so a greyscale screen still shows every state (DESIGN 8). */
export const STATE_SHAPE = {
  normal: 'circle',
  water: 'drop',
  check: 'triangle',
  urgent: 'octagon',
  not_sure: 'dashedCircle',
} as const satisfies Record<StateId, string>

export type StateShape = (typeof STATE_SHAPE)[StateId]
