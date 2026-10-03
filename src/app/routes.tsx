// Route table. Every screen is a lazy chunk owned by its domain folder.
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export interface AppRoute {
  path: string
  Component: LazyExoticComponent<ComponentType>
}

export const ROUTES: readonly AppRoute[] = [
  { path: '/', Component: lazy(() => import('../herd/HerdScreen')) },
  { path: '/map', Component: lazy(() => import('../map/MapScreen')) },
  { path: '/animal/:id', Component: lazy(() => import('../animal/AnimalScreen')) },
  { path: '/tag', Component: lazy(() => import('../tag/TagScreen')) },
  { path: '/stats', Component: lazy(() => import('../herd/StatsScreen')) },
  { path: '/data', Component: lazy(() => import('../about-data/DataScreen')) },
  { path: '/why', Component: lazy(() => import('../landing/WhyScreen')) },
  // Hidden component sheet. Not in the nav.
  { path: '/specimen', Component: lazy(() => import('../dev/SpecimenScreen')) },
]

/** Screens without the bottom nav. */
export const NO_NAV_PATHS: readonly string[] = ['/specimen']
