# Model notes

How the tag decides what to say, in plain words. Every number has a source or is marked ASSUMPTION. The code is in `src/baseline`, `src/alerts`, `src/forecast` and `src/simulation`.

The tag detects change from one animal's own normal. It never diagnoses. A baseline learned on an animal that is already unwell treats unwell as normal.

## Signals

The tag stores one time budget per hour: minutes standing, walking, trotting, eating, rolling and lying, plus lying bouts, up and down transitions, rolls, possible falls, distance, climb, work minutes, temperature and minutes at a known water point (`HourBudget` in `src/shared/types.ts`).

From each hour the baseline takes these signals (`signalValue` in `src/baseline/signals.ts`):

- Free minutes: minutes with data that were not work. Work hours are set by the owner, so behaviour signals only count hours with at least 15 free minutes. A Sunday off does not look like dullness, and a dull donkey still shows in the hours after work.
- Activity: share of upright free minutes spent walking, trotting, eating or rolling. Eating counts as active because a dull donkey stops eating and walking and just stands. We use classifier minutes, not ODBA, because minutes mean the same for every animal and ODBA depends on how the collar sits.
- Eating: eating minutes per 60 upright free minutes.
- Lying: lying minutes per 60 free minutes.
- Activity and eating leave lying out on purpose. Otherwise one lying bout would lower activity and eating and raise lying at once, and look like a CHECK. One lying bout must never alarm alone: 43% of pack donkey owners in Pakistan say their donkeys sometimes lie down after loading (Bukhari et al. 2022).
- Workload, 0 to 100: 70 points for a full hour of work plus up to 30 for climbing (1 point per 5 m). ASSUMPTION: a ranking aid, not a physiological measure.
- Distance (km), climb (m) and temperature (deg C) as recorded.
- Water debt comes from the water model below, not from the budget.

## Baseline

Each animal has its own normal for each signal and each local hour of the day (`computeBaseline`).

- Window: the 14 whole days before today. Today is left out, so a change that started this morning does not become its own normal.
- Middle: the median of the values for that hour.
- Spread: 1.4826 times the median absolute deviation, which equals the standard deviation for normal data and ignores a few odd days. With 1-hour cells, the spread pools the deviations of the hour and its two neighbours, because 14 values give a noisy MAD. The spread has a floor so it is never 0: activity 0.04, lying 3 min, eating 4 min, workload 5, distance 0.2 km, climb 10 m, temperature 0.5 deg C.
- Young baselines: with fewer than 7 days of data, hours share 4-hour bins. From 7 days, each hour stands alone.
- Busy hours: if most days worked through an hour, the cell borrows the neighbouring hours until it has 4 values.
- A day counts as a day of data with at least 6 hours of at least 50% coverage.
- Learning: the stamp shows "Day {day} of 5", counted from the day the tag was fitted, until 5 days have passed. Below 3 days of data the state is NOT SURE.

Trend charts (`dailySeries`) give one value per day with a normal band from the 14 days before that day. The band is median plus or minus 1.28 spread, which holds about 80% of values for roughly normal data (P10 to P90).

## The five states

`assess` in `src/alerts/assess.ts` checks the rules in this order and stops at the first that fires.

### 1. URGENT

These rules need no baseline.

- Possible fall: the tag flags impact, a fast orientation change, then lying. URGENT for 2 hours unless a later hour shows normal movement (at least 10 min walking and under half the hour lying). The fall time is estimated as the minutes before lying in that hour.
- Getting up and down 3 or more times, or rolling 2 or more times, within one clock hour. SPEC 5 asks for 30 minutes. Hourly budgets cannot see inside the hour; the tag itself would apply the 30-minute window to its event log.
- Lying still longer than twice the animal's longest normal lying bout in the last 14 days, or that bout plus 60 minutes, whichever is longer.
- Donkeys and mules: activity z below -3 and eating z below -2 in each of the last 3 free hours. Donkeys hide pain and dullness is often the first sign (The Donkey Sanctuary).

### 2. NOT SURE

- Fewer than 3 days of data.
- No data for over 2 hours (stale).
- Under 60% coverage in the last 24 hours.
- Over 30% of the last 3 hours labelled unknown by the classifier.

### 3. CHECK

The last 2 to 4 free hours within the last 6 hours are combined. For each behaviour signal: z = (observed - median) / spread per hour, averaged with free minutes as weights.

- CHECK when two signals depart in the direction of concern (activity down, eating down, lying up), at least one of them activity or eating.
- Or activity or eating alone departs strongly.
- Or a one-sided CUSUM on activity z over the last 12 hours passes its limit: S = max(0, S - z - k), alarm at S of 5 or more, z clipped to plus or minus 3, k = 1. The research suggestion was k = 0.5. On the simulated herd k = 0.5 (h 4.5 to 5) gave 1 to 1.4 false alarms per animal per week, because hourly activity spreads wider than a normal curve. With k = 1 there were 10 alarms in 12 animals over 120 days, and a drop to z = -3 still fires after about 3 hours.
- Horses and mules: 2 up-and-downs and a roll within an hour.
- Lying alone is never enough.

Species profiles (`src/alerts/profiles.ts`):

| Species | Departure | Strong alone | Dullness URGENT rule |
|---|---|---|---|
| Donkey | abs(z) 2 | abs(z) 3 | yes |
| Horse | abs(z) 2.5 | abs(z) 3.5 | no |
| Mule | abs(z) 2 | abs(z) 3 | yes |

Mule: we found no study. ASSUMPTION: horse rules for rolling and up-downs (they apply to every species), donkey sensitivity for dullness.

### 4. WATER

- Water debt of 3% of body weight or more.
- Or 4 hours of work or more since the last water stop. Source: EURCAW Ruminants and Equines, guidance on the welfare of working equids in tourism (rest at least every 4 hours, for at least 30 minutes, with water), https://www.eurcaw-ruminants-equines.eu/guidance-on-the-welfare-of-working-equids-in-tourism/.
- Or, in heat past the "reduce work" comfort index, 3 hours of work without water while working now.

Bands: under 3% fine, 3 to 5% offer water, 5 to 8% concern, over 8% the sentence says the deficit is high. URGENT stays reserved for behaviour signs.

### 5. NORMAL

Everything else.

## Logbook

`detectChanges` walks the history hour by hour with the same rules and the baseline of each day. It records a change into WATER, CHECK or URGENT, a rise to a more severe state, and the return to normal after 2 normal hours. NOT SURE hours are skipped. `mergeFeedback` copies the owner's answer ("Checked: fine", "Called for help") from recorded entries within 4 hours. On the simulated herd it finds every scripted event within 3 hours. Counting those, it records 0 to 6 changes per animal in 180 days, mostly CHECK. Those are the "Checked: fine" kind of false alarm a person must answer.

## Forecast

`forecastSignal` gives the next 12 hours of a signal:

- p50 = the animal's median for that hour of day times r. r is an EWMA of observed / normal over the last 24 hours, alpha 0.2. Hours with a normal close to 0 (midday lying) are skipped for r.
- r drifts back toward 1 with a half-life of 12 hours. ASSUMPTION: we do not assume a change lasts forever or ends at once.
- Band: median plus or minus 1.28 spread, scaled by r, widened by sqrt(1 + 1/n) for a cell built from n days and by sqrt(1 + k/12) for k hours ahead.
- Behaviour forecasts describe free time only. They say nothing about future work.

## Water model

`src/forecast/water.ts`. The deficit is the water lost since the last full drink, in litres, shown as % of body weight (1 L of water is about 1 kg).

- Maintenance water, horses: 5 L per 100 kg per day at 20 deg C, rising linearly to 12 L at 35 deg C, flat outside that range (NRC 2007, Nutrient Requirements of Horses).
- Maintenance, donkeys: 8 to 10 L per 100 kg per day over the same range; about 20 L a day for a working donkey in heat. Sources: Aganga et al. 2000, Livestock Research for Rural Development 12(2), https://www.lrrd.org/lrrd12/2/agan122.htm; Veterinary Care of Donkeys, nutrition chapter, IVIS, https://www.ivis.org/library/veterinary-care-of-donkeys/nutrition-and-feeding-of-donkeys-0.
- Mules: halfway between. ASSUMPTION.
- Forage water: 30% of the maintenance need comes from forage and does not build up as debt. ASSUMPTION. Without it every donkey would pass 3% each night between the last and first drink, which owners do not see.
- Sweat while working: horses 0.5 to 1 L per 100 kg per hour at slow draught work, set by the climb rate (0.5 on the flat, 1 at 200 m climbed per hour of work). Scaled down from sport-horse figures of 10 to 15 L per hour in hot conditions (The Horse, Fluids and electrolytes, https://thehorse.com/14113/fluids-and-electrolytes/), because working pace is slow. The scaling is an ASSUMPTION. Only walking and trotting work minutes count.
- Heat: plus 10% sweat per deg C above 25. ASSUMPTION. Times 1.25 past comfort index 150 and 1.5 past 180.
- Donkeys sweat half as much as horses for the same work. ASSUMPTION: we found no measured figure. Donkeys keep water better than horses, so half is a placeholder to replace with data. Mules 0.75, also an ASSUMPTION.
- Drinking: at a known water point the animal drinks back its deficit at up to 1.5 L per minute. ASSUMPTION. Home troughs count as known water points.
- Start: the model runs over the last 36 hours from zero debt. Any water stop resets most of it.
- Comfort index for horses: deg F plus relative humidity %. Under 130 normal, 150 reduce work, 180 stop work. Sources: US Polo Association, equine heat index warning, https://www.uspolo.org/news-social/news/equine-heat-index-warning; US Equestrian heat alert recommendations, https://www.usef.org/media/press-releases/heat-alert-clarification-recommendations-for. For donkeys the index is likely conservative, and the sentence says so.
- The comfort index only counts from 25 deg C. ASSUMPTION. On cool, humid highland mornings (20 deg C, 85% humidity) the sum passes 150 while no animal is heat stressed.

What-if plans (`whatIf`): continue work (until 18:00, with the recent share and intensity of work), rest now (no work, no water), rest at water (walk to the nearest water point at 4 km/h, drink, rest). The forecast band for water debt is plus or minus 15% at 6 hours, growing with the square root of time. ASSUMPTION: the water model has no measured error.

## Recommendations

`recommend` turns the state, the reasons, the water projection and the last position into sentences with a time and a place. It never names a disease. It says look, check and call help. Examples from the demo herd at 14:20:

- "Go to Kito now. Last position: 1.2 km north of the market, 6 minutes ago. Check if Kito can stand."
- "Stop Chaltu at the Aricha water point before 15:15. If work continues, Chaltu's water deficit passes 5% of body weight at about 16:00."
- "Look at Bari before evening work. Is Bari eating? Check gums and droppings. Dullness is the first sign of colic in donkeys."

The stop time is 40 minutes before the projected 5% crossing, rounded down to a quarter hour. Positions name the nearest market or washing station within 3 km, then water points, then any place. Params named `place` and `dir` hold English text; `placeKey` and `dirKey` hold string keys, and `recommendationText` uses them for Amharic.

## The simulated herd

`src/simulation`. Every screen that shows it carries the "Simulated data" stamp.

- 12 animals of the Aricha cooperative in 5 households: 8 donkeys, 3 horses, 1 mule. Ethiopia has about 10.7 million donkeys and 2.1 million horses (Asteraye et al. 2024, CSA 2020). Body weights: donkeys 120 to 180 kg, horses 250 to 350 kg, mule 250 kg. ASSUMPTION: local breeds are small.
- Time budgets: free-ranging horses eat 51 to 67% of the day, stand 13 to 29%, lie 4 to 16% and move 4 to 13% (Auer et al. 2021). Domestic adult horses lie about 5% (3 to 15%), in 2 to 5 bouts, mostly at night. Working donkeys at rest in Pakistan stood 78%, walked 6% and lay 12% (our research notes). Each simulated animal has its own eating, walking and lying habit and its own noise.
- Work: coffee cherries to the Aricha washing station from 15 September (harvest season is October to December; early cherries arrive in September, ASSUMPTION), market loads on Tuesdays and Saturdays before that, cart shuttles in town, water carrying, rides to market, firewood from the north slope. Sunday is a rest day except for water carrying. Cherries must reach the washing station within about 12 hours (FAO).
- Owners water animals at home at about 06:15, 13:00, 18:00 and 21:00 when the animal is home. ASSUMPTION.
- Lying: 2 to 4 bouts a night, sometimes a short bout after work, rare day bouts.
- Missing data: about 5% of days lose 1 to 4 hours, and many hours lose a minute or two.
- Today's scenarios: Bari walked slowly to Aricha this morning and has been dull since (activity about 32% below her normal, more lying, less eating): CHECK. Kito fell at about 14:14 on the way home from the market, 1.2 km north of it, and has not moved since: URGENT. Chaltu carried cherries to Aricha all morning with no water stop and is on a third trip in the afternoon: WATER. Gelila's tag went on on 1 October at 16:00: NOT SURE, day 2 of 5.
- Past scenarios: Saba got up and down 4 times and rolled twice in the evening 19 days ago; the owner called for help; normal the next day. Four dull afternoons that owners answered "Checked: fine" or "Treated", and one long ride without water.
- The generator is deterministic (seeded by animal id and day), builds all 12 animals in about 130 ms and memoises them.

## Map and weather data

- Places: Yirgacheffe town centre (OSM node 1150967112). OSM has no feature named Aricha in the demo box. The Aricha washing station is an unnamed coffee site next to the river (OSM way 917803753), 1.5 km north-east of town: APPROXIMATE. The water point is the nearest river bank (OSM way 467889976): APPROXIMATE. The market, the town tap and the animal health post have no OSM feature: APPROXIMATE. Homes are invented, placed on tracks near real kebele names from OSM.
- Routes: `scripts/build-routes.ts` took 1,207 roads and tracks from the Overpass API (OpenStreetMap, ODbL), found the shortest path between each home and Aricha, the water point and the market, plus a market to Aricha cart route and a north slope route (17 routes), simplified them to 6 m and fetched each vertex's elevation from the Open-Meteo elevation API (Copernicus DEM GLO-90). `routes.json` is 21 KB. OSM in this area has few footpaths, so the routes follow roads and tracks.
- Weather: `scripts/fetch-weather.ts` took hourly air temperature and humidity at 2 m from the NASA POWER hourly API for 6.162 N 38.205 E, 6 April to 2 October 2026, local solar time. The grid cell sits at 1,850 m; temperatures were moved to 1,900 m at -6.5 deg C per km (-0.32 deg C). POWER had no data yet for 1 and 2 October; those days and the demo day, 3 October, repeat 30 September hour by hour. `weather.json` is 34 KB. Local solar time is stored as Ethiopian time (UTC+3); the 27-minute shift is smaller than one step.

## What this does not cover

- No sensor data from any animal with colic. The scenarios are simulated.
- The thresholds were tuned on simulated data. They need real working donkeys before anyone trusts the false alarm rate.
- The water model is a chain of averages and assumptions. It ranks risk; it does not measure hydration. The tag cannot see sweating, gums or droppings.
