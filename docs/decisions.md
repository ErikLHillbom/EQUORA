# Decisions

Each entry: what we chose, and why. Newest at the bottom.

## Stack

Vite, React 19, TypeScript, static PWA, no backend. The tag works offline and so does the app. Vercel serves the static build. The only runtime network calls allowed are map tiles, and we ship those too.

## Code split by domain

Folders follow the business (sensing, baseline, alerts, forecast, herd, animal, map, tag), not the technical layer. A change to how CHECK works stays inside `src/alerts`.

## String tables per domain

Each domain has a `strings.ts`. `src/i18n` collects them with `import.meta.glob`. Translating the app is a data change.

## Local language: Amharic

Amharic is the working language of Ethiopia and is spoken across Gedeo zone next to Gedeo. It has public speech data (FLEURS, Common Voice) and a Meta MMS voice. The tag only plays five or six fixed phrases, so a less-supported language such as Gedeo needs six recordings and a string table, with no speech model at all.

The Amharic strings and placeholder audio were made without a native speaker. They are marked "machine voice, needs a native speaker check" in the app until someone checks them.

## ML pipeline

One feature implementation, in TypeScript (`src/sensing/features.ts`). A Node script uses it to build the training table from the raw data, and the app uses it at runtime. The features cannot drift apart.

Training, evaluation and export run in Python with uv (pinned lockfile). scikit-learn random forest, evaluated leave-one-horse-out. Exported as JSON for the app and as a C header (emlearn) for a future microcontroller tag.

## 3D horse

VAREN (CVPR 2024) is not used. Its licence forbids sharing the model or anything made from it, renders included, with third parties. We use the Quaternius "Ultimate Animated Animals" horse and donkey (CC0) with an ink-and-hatching post-process (after Maxime Heckel, "Moebius-style post-processing").

## Map

MapLibre GL with PMTiles. Basemap from Protomaps (OpenStreetMap, ODbL), terrain from Mapterhorn (Copernicus GLO-30). Both cut to a 20 by 20 km box around Yirgacheffe and shipped with the app.

## Design choices (DESIGN 11)

- Serif: Source Serif 4 (SIL Open Font License 1.1).
- Mono: IBM Plex Mono (SIL Open Font License 1.1).
- Sans: the system font stack. Android ships Noto Sans Ethiopic for Amharic.
- Colours: DESIGN 4 starting values, adjusted where the contrast test fails. Final values live in `src/shared/tokens/tokens.css`.
- Illustrations: placeholder silhouettes until our own drawings exist. Mule uses the donkey set.
