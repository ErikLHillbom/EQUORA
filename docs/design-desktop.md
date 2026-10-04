# Demo redesign: computers and drawings

This adds to docs/DESIGN.md. DESIGN.md still holds: ink on paper, colour only for the five states, stamps by shape, serif names, mono labels and numbers, system sans for sentences. Where this file and DESIGN.md disagree on layout or the herd card, this file wins, because it comes from the team's own mockup.

## Breakpoints

Mobile first, `min-width` queries only.

| Range | Name | Layout |
|---|---|---|
| under 640 px | phone | one column, pill nav at the bottom (as now) |
| 640 to 1023 px | tablet | two columns where content allows, pill nav at the bottom |
| 1024 px and up | computer | nav in the top bar, multi-column layouts, no bottom bar |

Page widths come from `Paper`: `width="wide"` (default, up to 1320 px) for working screens, `width="reading"` (760 px) for prose, `width="full"` for the map.

On a computer, use the width. Put related things side by side: a list and its detail, a drawing and its sentence, a chart and its numbers. Never stretch a sentence wider than about 75 characters.

## The animal card (team mockup)

Used on the Herd home for every animal. Built as `src/herd/AnimalCard.tsx`.

```
┌▌───────────────────────────────────────────┐  ← 4 px edge in the state ink
 ▌ Kito                          ⬣ URGENT       (none for normal, graphite for not sure)
 ▌ HORSE · DOMORSO · ES-0415
 ▌ ┌──────────────┐
 ▌ │  drawing of  │   Got down and rolled 4
 ▌ │  what it is  │   times in 30 minutes.
 ▌ │  doing now   │
 ▌ └──────────────┘
 ▌────────────────────────────────────────────
 ▌ ACTIVITY      │ DOING        │ UPDATED
 ▌ -39%          │ Lying        │ 2 min ago
└────────────────────────────────────────────┘
```

- Name in serif, about 2 rem. State stamp with its word at the top right, in the state text colour.
- Meta line in mono caps with wide tracking, graphite: species, household, tag id.
- Drawing on the left (about 200 px wide on a computer), the first reason as one plain sentence on the right in system sans, about 1.1 rem.
- Footer: a hairline, then three cells split by hairlines. Mono caps label, mono value. Activity is the signed change against the animal's own normal over the rules' window (`Learning` while the baseline is short). Doing is the current activity. Updated is the age of the last reading.
- The first card that needs attention gets a small ink tab above its top right corner: "Visit first". It replaces the pencil circle on this screen.
- The whole card is one link to `/animal/:id`, with a visible focus ring and a slight lift on hover where hover exists.
- Grid: 3 columns from 1200 px, 2 from 720 px, 1 below. Gap 32 px on a computer.
- A normal card has no coloured edge. A herd that is all normal stays black and white.

## The drawings

The drawings are pencil engravings rendered from our own 3D horse and donkey (Quaternius, CC0) with the ink shader in `src/landing/ink/`, then saved as images. One per species and pose: standing, walking, trotting, grazing, lying. Mule uses the donkey. Rolling is never drawn.

Style target: fine graphite cross-hatching that follows the form, a thin uneven ink contour, light paper showing through, no flat facets, no hard black fills, a soft hatched shadow under the hooves. Transparent background so it sits on any paper.

`PostureDrawing` keeps its props. It shows the image for the species and pose. Stale data shows the same drawing faded to a light graphite with a dashed outline frame, so old data never looks healthy.

## "What the tag sees now" (Tag screen)

Five tiles in a row on a computer (two or three per row on a phone): standing, walking, grazing, lying, rolling. Each tile shows the drawing and a mono caps label. The tile matching the current activity is marked in ink with a 2 px border and the word "Now". Rolling has no drawing: the tile says "No drawing" in mono, because the app never draws an animal rolling.

## Screens on a computer

- Herd: the "visit first" band as two columns (the 3D ink animal large on the left, the stamp, name, reasons, next step and button on the right), then the state counts as one row, then the card grid.
- Animal: two columns. Left, sticky: the case header, drawing, state, reasons and what to do next. Right: today cards in a 3 or 4 column grid, trends with wide charts, the logbook.
- Tag: two columns. Left: the tag itself (light, phrase, play) and "What the tag sees now". Right: the input (replay or phone) and the pipeline readout.
- Map: full width. The map fills the screen under the top bar; a 400 px paper panel on the left holds the animal list and the selected animal's slip.
- Stats: the ledger at full width with all columns visible, then herd insights in two columns.
- Data and Why: reading width for prose; the datasheet tables may use the wide width.

## Bans (from the impeccable craft floor)

- No eyebrow or kicker above a heading. Context goes under the title.
- No nested cards. No same-size icon-heading-text card grids as page structure.
- No colour outside the states and departures from normal.
- Every number in tabular data uses tabular numerals.
