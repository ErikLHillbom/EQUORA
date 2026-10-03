# Plan

The build order follows SPEC 11. The chain comes first. Screens come after the design primitives exist.

## Code layout

One app, split by business domain. Each folder holds its own logic, tests, strings and screens. Domains share only `src/shared/types.ts`, the clock and the design primitives.

| Folder | What it owns |
|---|---|
| `src/sensing` | Window features, activity classifier, lying and rolling rules, phone motion recorder, replay of recorded data |
| `src/baseline` | Hourly time budgets, each animal's normal per hour of day (median and spread), learning progress |
| `src/alerts` | The five states, the rules that pick one, change detection (median-based z-score, CUSUM), reasons |
| `src/forecast` | Expected behaviour for the next hours, water debt, what-if, recommendations |
| `src/simulation` | The demo herd, scenarios, routes, weather |
| `src/herd` | Home screen, animal cards, statistics ledger, herd insights |
| `src/animal` | The case file: today, trends, detected changes, owner feedback |
| `src/map` | Paper map, stamp markers, routes, offline tiles |
| `src/tag` | The tag as an object: light, voice, pipeline readout, recorder |
| `src/landing` | 3D ink horse, why-it-matters page |
| `src/about-data` | Datasheet and the honesty slip |
| `src/shared` | Types, clock, random, design tokens, primitives, charts |
| `src/i18n` | String table loader and language switch |
| `ml/` | Python training, evaluation and export (uv) |
| `scripts/` | Feature table builder, weather fetch, map extract, copy check |

## Order

1. Setup: scaffold, briefs, shared contracts. Done.
2. In parallel: ML pipeline, design system, core chain logic, map and 3D assets.
3. Tag screen end to end on the real classifier.
4. In parallel: home with 3D horse, animal case file, map, statistics and datasheet.
5. Offline, drawings, copy check, budgets, screenshots, deploy.

## Design

DESIGN.md is the rulebook. In short:
- Ink on paper. Colour only for the five states.
- Each state has a stamp shape: circle (normal), drop (water), triangle (check), octagon (urgent), dashed circle (not sure).
- Serif for names and titles, mono for numbers and labels, system sans for sentences.
- Primitives first, shown on a hidden specimen page at `/specimen`, screenshot at 360 px before any screen.
- Every screen built only from primitives. Missing art falls back to flat paper and ink.

## Demo

- Place: Yirgacheffe, Gedeo zone, Ethiopia (6.162 N, 38.205 E). Aricha washing station nearby.
- Clock: fixed at Saturday 3 October 2026, 14:20 local time (`src/shared/lib/clock.ts`).
- Herd: 12 animals of the Aricha cooperative, simulated and labelled.
- Scenarios: a dull donkey, a horse colic episode, a fall.
