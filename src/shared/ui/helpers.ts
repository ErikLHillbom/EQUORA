// Non-component helpers for the primitives (kept apart so fast refresh works).

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary'

/** Class names for a button look, for links that should look like buttons (e.g. a router Link). */
export function buttonClass(variant: ButtonVariant = 'secondary', block = false): string {
  return ['ui-button', `ui-button--${variant}`, block ? 'ui-button--block' : ''].filter(Boolean).join(' ')
}

/** Props to spread on an SVG group that should look pressed by hand (see WearDefs). */
export function wearProps(uid: string) {
  return { className: 'ui-wear', filter: `url(#${uid}-rough)`, mask: `url(#${uid}-wear)` }
}

export interface NavItem {
  to: string
  /** String table key for the label. */
  labelKey: string
  /** Match only the exact path (for "/"). */
  end?: boolean
}

export const DEFAULT_NAV: readonly NavItem[] = [
  { to: '/', labelKey: 'shared.nav.herd', end: true },
  { to: '/map', labelKey: 'shared.nav.map' },
  { to: '/tag', labelKey: 'shared.nav.tag' },
  { to: '/stats', labelKey: 'shared.nav.stats' },
  { to: '/data', labelKey: 'shared.nav.data' },
]
