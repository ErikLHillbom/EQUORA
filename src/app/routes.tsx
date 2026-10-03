// Route table. Every screen is a lazy chunk.
// To plug in a real screen, replace its placeholder import with the domain's screen module, e.g.
//   { path: '/', Component: lazy(() => import('../herd/HerdScreen')) },
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

const fromPlaceholders = (name: keyof typeof import('./placeholders')) =>
  lazy(() => import('./placeholders').then((m) => ({ default: m[name] })))

export interface AppRoute {
  path: string
  Component: LazyExoticComponent<ComponentType>
}

export const ROUTES: readonly AppRoute[] = [
  { path: '/', Component: fromPlaceholders('HerdPlaceholder') },
  { path: '/map', Component: fromPlaceholders('MapPlaceholder') },
  { path: '/animal/:id', Component: fromPlaceholders('AnimalPlaceholder') },
  { path: '/tag', Component: lazy(() => import('../tag/TagScreen')) },
  { path: '/stats', Component: fromPlaceholders('StatsPlaceholder') },
  { path: '/data', Component: lazy(() => import('../about-data/DataScreen')) },
  { path: '/why', Component: lazy(() => import('../landing/WhyScreen')) },
  // Hidden component sheet. Not in the nav.
  { path: '/specimen', Component: lazy(() => import('../dev/SpecimenScreen')) },
]

/** Screens without the bottom nav. */
export const NO_NAV_PATHS: readonly string[] = ['/specimen']
