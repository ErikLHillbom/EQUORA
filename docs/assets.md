# Assets

Every file the app ships that we did not write as code: where it came from, its licence and its size. Sizes are in bytes on disk.

Budgets (from the build brief): maps under 15 MB, 3D models and stills under 600 KB, audio under 1 MB.

| Folder | Total |
|---|---|
| `public/maps/` | 5,444,221 B (5.2 MB) |
| `public/models3d/` | 536,738 B (524 KB) |
| `public/audio/` | 109,764 B (107 KB) |

## Offline map

Demo area: Yirgacheffe, Gedeo zone, Ethiopia. Town centre 6.162 N, 38.205 E. Box `38.11,6.07,38.29,6.25` (about 20 by 20 km). Made by `scripts/build-map-extract.sh` with the go-pmtiles CLI v1.31.2 (https://github.com/protomaps/go-pmtiles, BSD 3-Clause).

| File | Source | Licence | Size |
|---|---|---|---|
| `public/maps/yirgacheffe.pmtiles` | Protomaps daily basemap build `20261002.pmtiles` (https://build.protomaps.com/20261002.pmtiles), cut to the box, zoom 0 to 15, vector tiles (Protomaps basemap schema v4) | Map data © OpenStreetMap contributors, Open Database License 1.0 (https://www.openstreetmap.org/copyright). Tile build by Protomaps. | 1,049,380 |
| `public/maps/dem.pmtiles` | Mapterhorn planet terrain (https://download.mapterhorn.com/planet.pmtiles), cut to the box, zoom 0 to 12, Terrarium-encoded WebP, 512 px tiles | Mapterhorn terrain, built from open elevation sources including Copernicus GLO-30. Per-source terms: https://mapterhorn.com/attribution. Copernicus DEM: © DLR e.V. 2010 to 2014 and © Airbus Defence and Space GmbH 2014 to 2018, provided under COPERNICUS by the European Union and ESA. | 3,470,607 |

The map shows this attribution: "© OpenStreetMap contributors, Protomaps, Mapterhorn, Copernicus".

Protomaps keeps daily builds for a limited time. If `20261002` is gone, set `PROTOMAPS_BUILD` to a newer key from https://build-metadata.protomaps.dev/builds.json and update this table.

### Map label glyphs

Source: https://github.com/protomaps/basemaps-assets (folder `fonts/`). Noto Sans, SIL Open Font License 1.1. Ranges: Latin (0-255), Latin extended (256-511) and Ethiopic (4608-4863 and 4864-5119, which together cover U+1200 to U+137F, so Amharic place names render).

| File | Size |
|---|---|
| `public/maps/fonts/Noto Sans Regular/0-255.pbf` | 76,044 |
| `public/maps/fonts/Noto Sans Regular/256-511.pbf` | 127,726 |
| `public/maps/fonts/Noto Sans Regular/4608-4863.pbf` | 129,971 |
| `public/maps/fonts/Noto Sans Regular/4864-5119.pbf` | 124,982 |
| `public/maps/fonts/Noto Sans Medium/0-255.pbf` | 77,628 |
| `public/maps/fonts/Noto Sans Medium/256-511.pbf` | 129,635 |
| `public/maps/fonts/Noto Sans Medium/4608-4863.pbf` | 130,918 |
| `public/maps/fonts/Noto Sans Medium/4864-5119.pbf` | 127,330 |

No sprite sheet. Map markers are HTML and SVG.

## 3D animals

| File | Source | Licence | Size |
|---|---|---|---|
| `public/models3d/horse.glb` | Quaternius, "Ultimate Animated Animal Pack", Horse. Downloaded from https://poly.pizza/m/qvTrSG9pZF (pack page: https://quaternius.com/packs/ultimateanimatedanimals.html) | CC0 1.0 (public domain) | 133,032 |
| `public/models3d/donkey.glb` | Quaternius, "Ultimate Animated Animal Pack", Donkey. Downloaded from https://poly.pizza/m/qmX6nhnvp7 | CC0 1.0 (public domain) | 129,520 |

Clips in the original files: Attack_Headbutt, Attack_Kick, Death, Eating, Gallop, Gallop_Jump, Idle, Idle_2, Idle_Headlow, Idle_HitReact_Left, Idle_HitReact_Right, Jump_toIdle, Walk (each twice, once with an `AnimalArmature|` prefix).

Clips kept: Idle (standing), Walk (walking), Eating (grazing), Idle_Headlow (spare calm pose). Every attack, death, jump, gallop and hit clip is removed, so the app cannot show them. There is no lying clip. Lying is built in code from the standing pose (`src/landing/ink/lyingPose.ts`): legs folded, body lowered to the ground, head up.

How the files were made, with glTF-Transform 4.5 (MIT) and meshoptimizer (MIT) run from a scratch folder, not added to the app:

1. Drop every clip except the four above, with their samplers and keyframe data.
2. Bake each material's base colour into a vertex colour, then give the mesh one plain material and join its 8 parts into one draw call. The ink shader reads the vertex colour as pencil tone (dark mane and hooves).
3. Remove textures (there were none).
4. `dedup`, `weld`, `resample` (tolerance 0.001), `prune`, `quantize` (position 14 bit, normal, colour and weight 8 bit), `meshopt` (EXT_meshopt_compression, level medium).

Result: 4,400 vertices (horse) and 4,044 (donkey), one skinned mesh, 50 joints, 4 clips. The original GLB files are about 1.1 MB each.

### Drawings (stills)

Pencil engravings rendered by us from the CC0 models above. One set of images serves both `PostureDrawing` (every card and screen) and the 3D scene while it loads or on phones that do not get it. Mule uses the donkey.

Made by `npx tsx scripts/render-drawings.ts`: the script starts Vite with one extra page that shows `src/landing/HorseScene.tsx` in a 720 by 540 box, opens it in headless Chromium (Playwright, SwiftShader WebGL), takes the canvas at 2x (1440 by 1080), scales it down to 720 by 540, snaps each pixel to ink (#1F1C17) or graphite (#57524A) with 16 opacity steps, and saves WebP with a transparent background. Trotting is the walk clip at 0.88 s, where a diagonal pair of legs swings forward: there is no trot clip, and the gallop was removed from the file.

| File | Size |
|---|---|
| `public/models3d/stills/horse-standing.webp` | 28,302 |
| `public/models3d/stills/horse-walking.webp` | 27,866 |
| `public/models3d/stills/horse-trotting.webp` | 28,906 |
| `public/models3d/stills/horse-grazing.webp` | 27,472 |
| `public/models3d/stills/horse-lying.webp` | 23,758 |
| `public/models3d/stills/donkey-standing.webp` | 29,546 |
| `public/models3d/stills/donkey-walking.webp` | 28,182 |
| `public/models3d/stills/donkey-trotting.webp` | 29,584 |
| `public/models3d/stills/donkey-grazing.webp` | 26,656 |
| `public/models3d/stills/donkey-lying.webp` | 23,914 |

All ten: 274,186 B. The idea of an ink post-process follows Maxime Heckel, "Moebius-style post-processing" (https://blog.maximeheckel.com/posts/moebius-style-post-processing). Our shaders are our own code, see "Drawings rendered from 3D" in docs/decisions.md.

## Tag voice (placeholders)

Machine voices, not checked by a native speaker. They stay marked "Machine voice, needs a native speaker check" in the app until the team records real voices and sets `machineVoice` to false in `src/tag/phrases.ts`.

Made by `scripts/make-voice/make_voice.py` (uv, CPU only) from the text in `src/tag/strings.ts`:
- English: Meta MMS-TTS `facebook/mms-tts-eng` (https://huggingface.co/facebook/mms-tts-eng).
- Amharic: Meta MMS-TTS `facebook/mms-tts-amh` (https://huggingface.co/facebook/mms-tts-amh). The model expects romanised input, so the Ge'ez text goes through uroman (https://github.com/isi-nlp/uroman) first.

Settings: speaking rate 0.9, noise scale 0.5, fixed seed 7, silence trimmed, 120 ms padding, peak at -1 dBFS. Output: mono MP3, 16 kHz, about 40 kbps.

Licence: the MMS-TTS models are CC BY-NC 4.0 (non-commercial, attribution: Pratap et al. 2023, "Scaling speech technology to 1,000+ languages", Meta AI). Treat these files as non-commercial placeholders. The model weights download to the Hugging Face cache on the build machine and are never committed.

| File | Text | Length | Size |
|---|---|---|---|
| `public/audio/en/water.mp3` | Offer water and let it rest. | 2.46 s | 12,096 |
| `public/audio/en/check.mp3` | Look at your animal. Is it eating? Check gums and droppings. | 3.80 s | 18,360 |
| `public/audio/en/urgent.mp3` | Stop work. Get help now. | 2.29 s | 9,000 |
| `public/audio/en/not_sure.mp3` | I cannot tell. Check the animal yourself. | 2.59 s | 12,384 |
| `public/audio/am/water.mp3` | ውሃ አጠጣው፣ እንዲያርፍም ተወው። | 2.41 s | 10,476 |
| `public/audio/am/check.mp3` | እንስሳህን ተመልከት። እየበላ ነው? ድዱን እና ፋንድያውን ፈትሽ። | 4.69 s | 19,764 |
| `public/audio/am/urgent.mp3` | ሥራ አቁም። አሁኑኑ እርዳታ ጥራ። | 3.08 s | 12,564 |
| `public/audio/am/not_sure.mp3` | ማወቅ አልቻልኩም። እንስሳውን ራስህ ፈትሽ። | 3.54 s | 15,120 |

NORMAL plays nothing, so it has no file. If a file is missing or fails to play, the app falls back to the browser's speech synthesis with the same text.
