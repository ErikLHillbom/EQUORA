// Figures quoted on the "Why it matters" page, as their sources state them (SPEC 1 and 12).

export const FIGURES = {
  // Asteraye et al. 2026
  donkeyValueUsd: 567,
  donkeyValuePi: [479, 660] as const,
  incomeSharePct: 21,
  labourHoursWeek: 16.5,
  // Asteraye et al. 2024 (CSA 2020 for the herd sizes)
  donkeyPriceUsd: 74.8,
  donkeyPriceRange: [47.6, 98] as const,
  horsePriceUsd: 151.8,
  donkeysMillion: 10.7,
  horsesMillion: 2.1,
  // Worku et al. 2017
  colicSharePct: 10.3,
  colicCases: 65,
  colicDied: 10,
  colicDonkeyPct: 63,
  // Merridale-Punter et al. 2024, CABI One Health
  womenInterviewed: 10,
  // Bukhari et al. 2022
  lieAfterLoadingPct: 43.4,
  // FAO
  cherryHours: 12,
  // SPEC 4: rough and unverified
  tagPartsUsd: [15, 25] as const,
} as const

export type Figures = typeof FIGURES

/** Top of the tag parts estimate as a share of a donkey's yearly value and of a new donkey's price. */
export function tagShares(f: Figures = FIGURES) {
  const top = f.tagPartsUsd[1]
  return {
    ofYearPct: (top / f.donkeyValueUsd) * 100,
    ofPricePct: (top / f.donkeyPriceUsd) * 100,
  }
}
