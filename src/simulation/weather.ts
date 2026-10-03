// Hourly weather for Yirgacheffe from NASA POWER, built by scripts/fetch-weather.ts.

import weatherJson from './weather.json'

export interface WeatherSeries {
  /** Epoch ms (UTC) of the first hour. */
  start: number
  stepMs: number
  tempC: number[]
  rh: number[]
  /** First hour that repeats earlier days instead of measured data, or null. */
  filledFrom: number | null
  source: string
  notes: string[]
}

export interface WeatherHour {
  tempC: number
  rh: number
}

const series = weatherJson as unknown as WeatherSeries

export function getWeather(): WeatherSeries {
  return series
}

/**
 * Weather for the hour containing t. Before the series it uses the first day; after it, the same
 * hour of the last day.
 */
export function weatherAt(t: number, w: WeatherSeries = series): WeatherHour {
  let i = Math.floor((t - w.start) / w.stepMs)
  const n = w.tempC.length
  if (i < 0) i = ((i % 24) + 24) % 24
  if (i >= n) i = n - 24 + ((i - (n - 24)) % 24)
  return { tempC: w.tempC[i], rh: w.rh[i] }
}
