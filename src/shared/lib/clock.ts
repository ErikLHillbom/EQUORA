// The demo runs on a fixed clock so every screen, test and screenshot agrees.
// Saturday 3 October 2026, 14:20 in Yirgacheffe (UTC+3).

export const TZ_OFFSET_MS = 3 * 60 * 60 * 1000
export const DEMO_NOW = Date.UTC(2026, 9, 3, 11, 20, 0)

export const MINUTE = 60 * 1000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

/** Local hour of day (0 to 23) in Ethiopia for an epoch time. */
export function localHour(t: number): number {
  return new Date(t + TZ_OFFSET_MS).getUTCHours()
}

/** Start of the local day (midnight UTC+3) containing t, as epoch ms. */
export function localDayStart(t: number): number {
  const shifted = t + TZ_OFFSET_MS
  return shifted - (shifted % DAY) - TZ_OFFSET_MS
}

/** Start of the hour containing t. */
export function hourStart(t: number): number {
  return t - (t % HOUR)
}

/** "14:20" in local time. */
export function formatTime(t: number): string {
  const d = new Date(t + TZ_OFFSET_MS)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

/** "2026-10-03" in local time, for date stamps. */
export function formatDate(t: number): string {
  return new Date(t + TZ_OFFSET_MS).toISOString().slice(0, 10)
}
