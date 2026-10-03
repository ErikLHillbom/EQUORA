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

## Check stamp colour

DESIGN 4 suggested #C98A1B for the CHECK stamp. As a graphic on paper it reached only 2.6:1, under the 3:1 that WCAG 1.4.11 asks for non-text marks. The stamp is now #B67B12. CHECK text stays #8A5A10 (5.2:1 on paper).

## Posture drawings are placeholders

The ten posture drawings (horse and donkey, five poses each) are simple silhouettes made in code, about 1.5 KB each, marked `data-placeholder`. The mule uses the donkey set. They will be replaced by our own drawings or by drawings based on Muybridge's "The Horse in Motion" (1878, public domain).

## Posture drawing sources

The ten posture drawings are now our own line drawings. They replace the placeholder silhouettes described in the two notes above. The mule still uses the donkey set.

How they are made: each animal is 10 to 14 pen strokes, written as points in `src/shared/ui/postures.ts` and drawn in code as filled ink ribbons that swell in the middle and taper to round ends. The hand-made wobble comes from seeded jitter on the points, so a drawing is the same on every render. Dark ink sits only on the mane, the tail tip and the hooves. Light hatching sits on the far legs and under the belly. No file in `public/art/` is used.

Sources for each drawing. No image was traced. Muybridge's plates are public domain.

- Horse, walking: leg positions from Eadweard Muybridge, "Animal Locomotion" (1887), the horse walk plates. Near fore in the air with the knee bent about 35 degrees, far hind pushing off behind, three hooves down.
- Horse, trotting: leg positions from Muybridge, "The Horse in Motion" (1878), the trotting series (Abe Edgington). Diagonal pair lifted, the other diagonal under the body. No gallop.
- Horse, standing, grazing and lying: no Muybridge plate. Our own drawing with the same body and leg lengths as the walk and trot.
- Donkey, all five poses: our own drawing. The leg angles for walking and trotting are the horse angles above. The donkey proportions follow our review notes: ears about 1.6 times the head width with rounded tips, a short upright mane, a straight back, a deeper body, a larger head, a cord tail with an end tuft, thinner legs with small upright hooves, a dorsal stripe and a shoulder cross.

The horse is drawn as a small, lean working horse, as kept around Yirgacheffe, and not as a sport horse.

Stale data: the drawing turns into thin broken graphite lines (1.1 units, dashed), with no ink, no hatching and no dark masses. The state colour is never applied to a drawing.

Size, measured as SVG path text: 4.1 to 7.1 KB per drawing, about 61 KB for all ten. The stale outline is 1.3 to 2.3 KB per drawing. A unit test fails if one drawing reaches 8 KB or the set reaches 80 KB.
