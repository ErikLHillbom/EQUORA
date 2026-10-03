# Equid Sentinel

An offline neck tag for working donkeys and horses. It learns one animal's normal behaviour and tells the owner when to check it. It never diagnoses.

Built for the World Bank "Small AI for Development" hackathon (Hack-Nation, agriculture sector, October 2026). The demo area is the coffee country around Yirgacheffe, Gedeo zone, Ethiopia.

## The problem in one sentence

Because of this tool, an owner will check a working donkey or horse on the first day its behaviour departs from its own normal, instead of days later when it is down and too sick to save; we know because accelerometers detected induced colic in horses with 91.2% accuracy (Eerdekens et al. 2024) and 15.4% of colic cases at an Ethiopian clinic died (Worku et al. 2017).

## What the tag says

| State | When | What the owner hears |
|---|---|---|
| Normal | Behaviour within the animal's own normal | Nothing. Green light. |
| Water | Long work in heat without a water stop | "Offer water and let it rest." |
| Check | Activity, lying or eating departs from the animal's normal | "Look at your animal. Is it eating? Check gums and droppings." |
| Urgent | Repeated lying down and getting up, rolling, a fall, or a donkey that has gone dull | "Stop work. Get help now." |
| Not sure | Too little history, stale data, or the model is unsure | "I cannot tell. Check the animal yourself." |

The phrases play in Amharic or English. The Amharic text and voices are machine-made and marked as such until a native speaker checks them.

## How it works

1. Every 2 seconds of neck motion (accelerometer, 25 Hz) becomes 23 orientation-independent features.
2. A random forest of 30 trees classifies the window as standing, walking, trotting or eating. Rules on the tilt of the collar add lying, rolling and falls (marked Experimental: no public dataset labels them).
3. The tag keeps hourly time budgets and learns, per hour of the day, the median and spread of the animal's own activity, lying, eating and workload over the last 14 days.
4. Rules compare the current hours with that normal, with separate profiles for horses and donkeys (donkeys show dullness first), and pick one of five states.
5. A water-debt model projects the next hours from workload and weather, and the app turns all of it into next steps with times and places.

The model file is 123 KB. Tested leave-one-horse-out on 11 horses and 49,045 windows: accuracy 96.1%, macro F1 0.951. A logistic regression gets 95.8%, so most of the value is in the features and the per-animal baseline. Full results, data sources and what the data does not cover are in [docs/data.md](docs/data.md) and on the app's Data screen.

## Run it

```
npm install
npm run dev
```

Open http://localhost:5173. The Tag screen replays real collar recordings of a horse the model never saw, or uses your phone's own motion sensor.

```
npm test            # unit tests, including the full chain from windows to states
npm run e2e         # Playwright screenshots at 360 px
npm run check-copy  # no em dashes or banned words in strings and docs
npm run build       # offline PWA in dist/
```

Retrain the model (needs uv and about 4 GB of download, see docs/data.md):

```
cd ml && uv sync && uv run python -m equid_ml.fetch_subset && cd ..
npx tsx scripts/build-features.ts --replay-subject Driekus
cd ml && uv run python -m equid_ml.train && uv run python -m equid_ml.export && uv run python -m equid_ml.report
```

## Code

One app, split by business domain. Each folder holds its logic, tests, strings and screens.

| Folder | What it owns |
|---|---|
| `src/sensing` | Features, the activity model, lying, rolling and fall rules, phone sensor, recordings |
| `src/baseline` | Each animal's normal per hour of day |
| `src/alerts` | The five states and the rules that pick one, the logbook |
| `src/forecast` | Expected behaviour, water debt, what-if plans, next steps |
| `src/simulation` | The demo herd of 12 animals, real routes and weather |
| `src/tag` | The tag as an object: light, voice, pipeline readout, recorder |
| `src/herd`, `src/animal`, `src/map`, `src/about-data`, `src/landing` | The other screens |
| `src/shared` | Types, clock, design tokens and primitives |
| `ml/` | Python training, evaluation and export (uv, scikit-learn, emlearn) |

Rules for the build are in [docs/SPEC.md](docs/SPEC.md), the design rules in [docs/DESIGN.md](docs/DESIGN.md), choices and their reasons in [docs/decisions.md](docs/decisions.md), and every asset with its licence in [docs/assets.md](docs/assets.md).

## Honest limits

- Proven on horses, not donkeys. The training data comes from riding-stable horses in the Netherlands.
- No sensor data from any animal with colic. The colic, dull donkey and fall scenarios in the demo are simulated and labelled.
- The herd, its history and its positions are simulated. The weather, the routes and the map are real.
- The tag detects change, not disease. A person always makes the call.
