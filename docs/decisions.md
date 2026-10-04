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
- Illustrations: pencil engravings rendered from our 3D models, see "Drawings rendered from 3D" below. Mule uses the donkey set.

## Check stamp colour

DESIGN 4 suggested #C98A1B for the CHECK stamp. As a graphic on paper it reached only 2.6:1, under the 3:1 that WCAG 1.4.11 asks for non-text marks. The stamp is now #B67B12. CHECK text stays #8A5A10 (5.2:1 on paper).

## Drawings rendered from 3D

The posture drawings are pencil engravings rendered from our 3D horse and donkey (Quaternius, CC0), one image per species and pose: standing, walking, trotting, grazing, lying. They replace the hand-placed SVG line drawings. Mule uses the donkey. Rolling is never drawn. Files, sizes and the render script are in docs/assets.md.

How the shader draws them (`src/landing/ink/`):
- Smooth normals: the models are flat shaded, so every vertex gets the average normal of the faces that share its position. Light and hatching turn around the body instead of breaking on facets.
- Hatching: graphite (#57524A) strokes drawn on the mesh. Each stroke family is a set of slices through the animal's rest pose, so strokes wrap around the barrel, neck and legs and stay on the body when it moves. The gap between strokes is held at 2.5 to 5 CSS px from a smooth estimate of the slice density, not from per-face derivatives, which showed the facets again. Up to four families at different angles build the tone. Light areas stay paper.
- Tone: the coat is bare paper; darker parts of the model (mane, tail, hooves, eyes) carry more layers of hatching. No flat fills.
- Contour: thin ink (#1F1C17) line from depth jumps, 1.1 to 1.8 CSS px, drifting and lifting a little like a pen. The silhouette is darkest, inner overlaps lighter, creases faint.
- Ground: a soft shadow of level hatching under the hooves.
- Everything renders at 2x and the browser scales it down.

Lying is built in code (`lyingPose.ts`), calm sternal lying with the head up. The old stills showed it wrong: under React StrictMode the scene's cleanup stopped the animation mixer, which puts every animated bone back to rest while the body stayed lowered, so the animal stood sunk into the ground. The cleanup no longer stops the mixer, and a repeated pose effect sets the pose again.

Stale data: the same drawing, faded to light graphite (grayscale, lower contrast and opacity) inside a dashed graphite frame. The state colour is never applied to a drawing.

