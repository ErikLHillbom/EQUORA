// Public API of the simulation domain: the demo herd, its history, positions, places and weather.
// Everything here is simulated and must carry the "Simulated data" stamp on screen (SPEC 10).

export {
  getHerd,
  getBudgets,
  getFixes,
  getDetectedChanges,
  homeOfAnimal,
  clearSimulationCache,
  HISTORY_DAYS,
  FIX_DAYS,
  HARVEST_START,
} from './generate'
export { HERD, HOUSEHOLDS, herdMember, GELILA_TAG_SINCE, type HerdMember, type Profile } from './herd'
export {
  PLACES,
  HOMES,
  ARICHA,
  ARICHA_WATER,
  MARKET,
  CLINIC,
  TOWN_CENTRE,
  DEMO_BBOX,
  placeById,
  homeOf,
  distanceKm,
  bearingDeg,
  type HomePlace,
} from './places'
export { ROUTES, ROUTE_SOURCE, ROUTE_NETWORK, getRoute, pointAt, type Route, type RoutePoint } from './routes'
export { getWeather, weatherAt, type WeatherSeries, type WeatherHour } from './weather'
export { SCENARIOS, type Scenario } from './scenarios'

/** Every number from this domain is simulated. */
export const SIMULATED = true
