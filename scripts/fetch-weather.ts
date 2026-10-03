// Builds src/simulation/weather.json: hourly air temperature and humidity for Yirgacheffe.
//
// Source: NASA POWER hourly API (https://power.larc.nasa.gov/docs/services/api/temporal/hourly/),
// parameters T2M (deg C at 2 m) and RH2M (% at 2 m), point 6.162 N 38.205 E, time-standard LST.
//
// What this script does to the data:
// - Lapse rate: POWER reports the elevation of its grid cell. The temperature is moved from that
//   elevation to the town's 1,900 m with -6.5 deg C per km (standard atmosphere). Humidity is kept.
// - LST is local solar time (about UTC+2.5 at 38.2 E). We store it as Ethiopian local time
//   (UTC+3); the 27 minute shift is smaller than one hourly step.
// - Missing hours (fill value -999, POWER lags a few days behind) and the demo day, 3 October
//   2026, reuse the same hour of the most recent days that have data. The JSON lists them.
//
// Usage: npx tsx scripts/fetch-weather.ts

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const LAT = 6.162
const LON = 38.205
const TARGET_ELEVATION_M = 1900
const LAPSE_C_PER_KM = -6.5
const DAYS = 180
/** Last day to fetch (local). The demo day comes after it. */
const LAST_DAY = { y: 2026, m: 10, d: 2 }
const DEMO_DAY = { y: 2026, m: 10, d: 3 }
const TZ_OFFSET_MS = 3 * 60 * 60 * 1000
const HOUR = 3600 * 1000
const DAY = 24 * HOUR

function ymd(t: number): string {
  const d = new Date(t)
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
}

/**
 * Fills each missing value (NaN) with the same hour of the closest earlier day that has data.
 * Returns the indices that were filled.
 */
export function fillFromRecentDays(values: number[], hoursPerDay = 24): number[] {
  const filled: number[] = []
  for (let i = 0; i < values.length; i++) {
    if (!Number.isNaN(values[i])) continue
    for (let j = i - hoursPerDay; j >= 0; j -= hoursPerDay) {
      if (!Number.isNaN(values[j])) {
        values[i] = values[j]
        filled.push(i)
        break
      }
    }
  }
  return filled
}

export function lapseCorrection(cellElevationM: number, targetElevationM = TARGET_ELEVATION_M): number {
  return ((targetElevationM - cellElevationM) / 1000) * LAPSE_C_PER_KM
}

async function main() {
  // Local midnight of the first day, as a UTC epoch: local days are stored as UTC dates here.
  const lastDayUtc = Date.UTC(LAST_DAY.y, LAST_DAY.m - 1, LAST_DAY.d)
  const firstDayUtc = lastDayUtc - (DAYS - 1) * DAY
  const url =
    'https://power.larc.nasa.gov/api/temporal/hourly/point?parameters=T2M,RH2M&community=AG' +
    `&latitude=${LAT}&longitude=${LON}&start=${ymd(firstDayUtc)}&end=${ymd(lastDayUtc)}` +
    '&format=JSON&time-standard=LST'
  console.log(`Fetching ${url}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`NASA POWER HTTP ${res.status}`)
  const json = (await res.json()) as {
    geometry: { coordinates: [number, number, number] }
    header: { fill_value: number }
    properties: { parameter: { T2M: Record<string, number>; RH2M: Record<string, number> } }
  }
  const cellElevationM = json.geometry.coordinates[2]
  const fill = json.header.fill_value
  const correction = Number.isFinite(cellElevationM) ? lapseCorrection(cellElevationM) : 0

  const demoDayUtc = Date.UTC(DEMO_DAY.y, DEMO_DAY.m - 1, DEMO_DAY.d)
  const hours = Math.round((demoDayUtc + DAY - firstDayUtc) / HOUR)
  const temp: number[] = []
  const rh: number[] = []
  for (let i = 0; i < hours; i++) {
    const t = firstDayUtc + i * HOUR
    const d = new Date(t)
    const key = `${ymd(t)}${String(d.getUTCHours()).padStart(2, '0')}`
    const T = json.properties.parameter.T2M[key]
    const H = json.properties.parameter.RH2M[key]
    temp.push(T === undefined || T === fill ? NaN : T + correction)
    rh.push(H === undefined || H === fill ? NaN : H)
  }
  const filledT = fillFromRecentDays(temp)
  fillFromRecentDays(rh)
  const startEpoch = firstDayUtc - TZ_OFFSET_MS
  const firstFilled = filledT.length ? startEpoch + filledT[0] * HOUR : null

  const out = {
    source: 'NASA POWER hourly API, T2M and RH2M, community AG, time-standard LST.',
    lat: LAT,
    lon: LON,
    cellElevationM,
    targetElevationM: TARGET_ELEVATION_M,
    lapseCorrectionC: Number(correction.toFixed(2)),
    notes: [
      `Temperature moved from the grid cell's ${cellElevationM} m to ${TARGET_ELEVATION_M} m at ${LAPSE_C_PER_KM} deg C per km.`,
      'Local solar time stored as Ethiopian local time (UTC+3).',
      `${filledT.length} hours had no data yet (POWER lags a few days) or are the demo day, 3 October 2026. They repeat the same hour of the most recent day with data.`,
    ],
    /** Epoch ms (UTC) of the first hour: local midnight at the start of the first day. */
    start: startEpoch,
    stepMs: HOUR,
    /** First hour that is filled rather than measured, epoch ms, or null. */
    filledFrom: firstFilled,
    tempC: temp.map((v) => Math.round(v * 10) / 10),
    rh: rh.map((v) => Math.round(v)),
  }
  const file = join(process.cwd(), 'src/simulation/weather.json')
  const text = JSON.stringify(out)
  writeFileSync(file, text)
  console.log(
    `Wrote ${file}: ${hours} hours, ${filledT.length} filled, cell ${cellElevationM} m, correction ${correction.toFixed(2)} C, ${(text.length / 1024).toFixed(1)} KB`,
  )
}

if (process.argv[1]?.endsWith('fetch-weather.ts')) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
