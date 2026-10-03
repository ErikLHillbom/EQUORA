Equid Sentinel: design brief

This is an addendum to the build brief. Read docs/SPEC.md first, then this. Save this text unchanged as docs/DESIGN.md in the same commit as SPEC.md, and read it again at the start of every phase that touches the UI.

1. Which rules win

This document replaces parts of SPEC section 8 (design), listed in section 3 below. Everything else in SPEC still holds. Where the two seem to conflict, these always win over this document: the five states and their meaning (SPEC 5), the writing rules (SPEC 9), the honesty rules (SPEC 10), and the build order (SPEC 11). Design never blocks the chain. If an asset is missing, the screen falls back to flat paper and ink and still works.

The images attached with this brief are references for look and feel. Never copy, trace, embed or commit them. They belong to other artists. Make our own assets as described in sections 7 and 8.

2. The idea

Equid Sentinel should look like a field notebook kept by a careful animal health worker. Paper, pencil, ink, rubber stamps, a strip of tape. The surface is made by hand. The numbers are exact.

That contrast is the point. The people who use this work with their hands and with real animals, and the records they already trust are paper cards, logbooks and stamped forms. A glossy tech dashboard says "this was made somewhere else". A well-kept notebook says "someone paid attention to your animal". Quiet, exact and well spaced, as SPEC asks, but warm.

Every handmade element must either carry information or frame it. If a texture or drawing does neither, remove it.

3. What changes from SPEC section 8

Replaced:
- Fonts. Use two self-hosted open-licence web fonts (a serif and a mono) plus the system sans for running text. See section 5.
- Decoration. Paper texture, stamps and hand-drawn illustrations are allowed, within the budgets in section 10.

Kept exactly: light theme only, high contrast for sunlight, large touch targets (at least 48 px), no decorative animation, reduced-motion respected, every screen usable at 360 px, state shown by shape, colour and word together, no emoji, nothing the tag does not measure.

4. Colour

The page is ink on paper. Colour appears only when it means something. This is how we keep pops of colour without breaking the states: the colour pops are the states.

Paper and ink tokens (starting values, verify contrast and adjust):
- paper #F5F0E6 (page)
- paper-raised #FBF8F2 (cards, slips)
- kraft #C9B08A (folder tabs, the honesty slip, nothing with body text on it)
- rule #D9D1C2 (hairlines, grid)
- ink #1F1C17 (text, line drawings)
- graphite #57524A (secondary text, pencil shading)

State inks. Each has a stamp value and a text value. The text value must reach at least 4.5:1 on paper and paper-raised:
- NORMAL green, about #2E6A3A
- WATER blue, about #1F4E9A
- CHECK ochre: stamp about #C98A1B, text about #8A5A10
- URGENT red, about #A8261E
- NOT SURE grey, about #5F5F5F

Rules:
- Decorative elements are printed in ink, graphite or kraft only. No red, blue, ochre or green anywhere unless it marks a state or something that departs from normal.
- NORMAL is the quiet state: an outlined stamp in green. WATER, CHECK and URGENT are filled stamps. NOT SURE is a dashed outline. A herd that is all normal should look calm and mostly black and white. Colour on the screen should mean "look here".
- Where colour highlights, it looks hand applied: a pencil circle around the card that needs attention first, a hand-drawn underline under a number that is outside the animal's normal, the part of a trend line that leaves the normal band redrawn in the state ink. One highlight per card at most.
- Put the tokens in shared/ as CSS custom properties. Write a test that computes contrast for every text token on every surface and fails below the limits above.

5. Type

- Serif for screen titles and animal names. Pick an open-licence face with sturdy serifs that stays readable at small sizes, for example Source Serif 4 or Newsreader. Check the licence.
- Mono for labels, numbers, times, coordinates and pipeline readouts, for example IBM Plex Mono or JetBrains Mono. Check the licence.
- System sans for running text and every sentence the owner reads.
- Short labels (three words or fewer) may be set in mono caps with wide letter spacing through CSS. The strings themselves stay in sentence case in the string table. Never set a full sentence in caps.
- Big numbers on today's cards may use a dot-matrix look, only at 40 px or larger and only for the one main number per card. Cut it first if the font budget is tight.
- No script or handwriting fonts. Text must be easy for someone reading English as a second language.
- Self-host and subset the fonts as woff2. No font CDN at runtime: SPEC allows no network calls except map tiles.

6. Texture

- One paper grain on the page background only, from an SVG noise filter or one small tiled image.
- Text never sits on grain. Cards and slips are flat paper-raised with one soft shadow, like a sheet resting on a desk.
- Stamps get one shared ink-wear mask so they look pressed by hand. The mask touches the border and fill, not the letters, and the word inside stays fully legible.
- Allowed details, each used where it has a job:
  - stitched dashed line as a section divider
  - perforated dotted line between entries in the "Detected changes" logbook
  - a strip of translucent tape holding the drawing on the Animal screen
  - faint graph-paper grid behind charts only
  - deckled or torn edge on the header strip only
  - halftone grain on empty-state drawings
- Under prefers-contrast: more, remove grain and wear masks entirely.

7. Illustrations

Draw the animals by what the tag sees, not as decoration. One drawing per species and activity:
- horse: standing, walking, trotting, grazing, lying
- donkey: standing, walking, trotting, grazing, lying
- mule: use the donkey set for now and note it in docs/decisions.md

Each card shows the drawing of what the animal is doing right now. The Tag screen shows the current posture large. A drawing is information.

Style: single-colour ink line with a slightly uneven hand-made line, some pencil shading, clearly a sketch. SVG, under 8 KB each.

Sources, in order of preference:
1. The team's own drawings, scanned and vectorised. If files appear in public/art/, use them.
2. Simplified drawings based on Eadweard Muybridge's "The Horse in Motion" (1878, public domain) and other public-domain engravings. Record the source of each in docs/decisions.md.
3. Until art exists, plain silhouettes behind the same component, marked as placeholders in decisions.md.

Never draw an animal in pain, rolling or collapsed. Lying is drawn as calm lying. The state stamp carries the alarm, not the drawing.

When an animal's data is stale, its drawing turns to a graphite outline with no fill, so old data never looks healthy.

Not in this app: galloping horses as decoration, cowboys, carousels, unicorns, "Estd." badges, banners and ribbons, western or American vintage cues. Several references contain these. Take their texture and hand, not their subject.

8. Stamps

The state badge is a rubber stamp. Each state has its own shape, so a greyscale screenshot still shows every state:
- NORMAL: circle, outlined
- WATER: water drop, filled
- CHECK: triangle, filled
- URGENT: octagon, filled
- NOT SURE: circle, dashed outline

The state word always sits inside or next to the stamp. Two sizes: inline (with the word beside it) and large (Animal header, Tag screen). Rotate the border by up to 2 degrees, fixed per animal from its id, never random on each render. Keep the word level.

Other stamps, in ink or graphite, never in state colours:
- "Simulated data": rectangular stamp in the top corner of every screen that shows simulated data. This is the honesty label from SPEC 10.
- "Experimental": on lying, rolling and head-position readouts.
- "Learning Mulu's normal. Day 2 of 5."
- Date stamps on logbook entries, in mono, like a date stamper.
- Owner feedback: "Checked: fine", "Checked: not eating" and so on, stamped onto the event once recorded.

Build stamps as SVG components that take their text from the string table, so translation stays a data change.

9. Screens

How the references map onto the screens:

Navigation. A pill-shaped bottom bar in paper-raised with mono labels, as in the 2x2 tile and "Menu" reference. Five or fewer items. The app mark is a small stamp. Do not use any reference logo or glyph as ours.

Animals (home). Header strip: product name in serif, and a justified mono block with the demo area's real coordinates, as in the coordinate-block reference. Then a row of five stamps with a count each. Then cards as paper slips: posture drawing on the left, name in serif, species in mono, state stamp, one-line reason, "Updated 2 min ago" in mono. The first card that needs attention gets a pencil circle in its state ink. For large herds (over about 30), switch to a compact row without the drawing.

Animal. A case file, as in the manila folder reference. A kraft tab at the top with the animal's name and tag number. Sections numbered with circled numerals: 1 Today, 2 Trends, 3 Detected changes.
- Header: large stamp, reasons as plain sentences, learning stamp if relevant.
- Today: cards laid out like the pixel fitness reference, but light. Small mono caps label, one big number, then "Normal for Mulu: 6 to 8 km", then a short dot bar showing where today sits inside or outside that range. A number outside the range gets the hand-drawn underline in the state ink.
- Trends: graph-paper grid, the normal band as pencil hatching, the actual value as an ink line, the part outside the band redrawn in the state ink. The range switch (today, 7 days, 30 days, 6 months) as mono tabs.
- Detected changes: a logbook. Date stamp, small state stamp, one sentence, perforated line between entries. Feedback buttons are large outlined buttons, as in the cream checkout reference.

Map. The map stays readable first. Use a muted, warm base style so it sits on the paper, with hillshade in graphite tones. No grain on the map canvas. Markers are the state stamp shapes with the name on a small paper tab. Today's route is a dashed pencil line. The tap panel is a paper slip. The URGENT camera move jumps instead of flying when reduced motion is on.

Tag. This screen is the physical tag, so it looks like an object, not a page. A large round light rendered as a lit lens in the state ink: this is a light, not a stamp. The current phrase in large serif. The play button is a solid round ink button, as in the leather-and-paper reference. Below, the pipeline readout in mono, laid out like the coordinate block: activity, posture, windows processed, last update. The recorder uses big tiles, as in the 2x2 tile reference, for standing, walking, grazing, lying and rolling. Recording is shown by a word and a shape, never by colour alone.

About the data. A datasheet: mono tables, hairline rules, the model metrics read from metrics.json. "What our data does not cover" sits on a kraft slip held on with tape. It is the most hand-made element in the app, because the judges score it and it should be the thing they remember.

Statistics. A ledger: mono columns, hairline rules, a stamp beside each animal's current state.

Empty, offline and error states. Written as short notes with a small halftone drawing. Example for missing map tiles: "Map tiles for this area are not saved on this phone." No apology and no exclamation mark.

10. Budgets and checks

- Fonts: 100 KB total. Textures and masks: 60 KB total. Illustrations: 80 KB total.
- Every text token passes the contrast test from section 4.
- Screenshot every screen at 360 px wide and look at it. Then look at a greyscale version and confirm every state is still clear from shape and word.
- Check that no colour ink appears where nothing departs from normal.
- Check that no text sits on grain.
- Search changed text for em dashes and the banned words from SPEC 9.

11. Order of work

- Setup phase: include a short design section in docs/plan.md, and list in docs/decisions.md the fonts, colour values and illustration source you chose.
- Before the Tag screen phase: build the tokens and primitives in shared/ (paper, slip, stamp, today card, buttons, tabs, logbook entry), plus a hidden specimen page that shows all of them, like the component sheet reference. Screenshot it and check it before building any screen.
- Every screen after that is built only from those primitives.
- Final drawings and texture polish belong to the last phase. Placeholders are fine until then.

12. How to read the references

I will attach two groups of images.

Structure (layout, type, components):
- Coordinate block with dashed column guides and a textured region silhouette: header strip, grid, mono data blocks.
- Mono caps tiles and a pill menu: navigation and recorder tiles.
- Cream checkout with serif headings and hairline rules: lists, forms, buttons, spacing.
- Grey embossed component sheet: take only the pressed state and the always-visible focus ring. Do not copy its grey-on-grey look, it fails in sunlight.
- Manila folders with circled numerals: the Animal screen as a case file.
- Paper sheet on leather with a raised card: how slips rest on the page, and the solid round button.
- Pixel fitness app: today cards. Take the light version only.

Skin (texture, drawing, colour):
- Paper, kraft, photocopy, halftone, grit and perforation textures: the grain and wear in section 6.
- Stitched textile and collage: dividers, tape and the honesty slip.
- Many horse drawings in pencil, ink, watercolour, dot-matrix and scribble: the line quality for section 7, and how a few colour drawings among black ones draw the eye. That is how our state colours should feel.
- Stamped logos and badges: stamp shapes and ink wear for section 8. Ignore their vintage western wording.
- Hand-drawn circles around groups of horses: the pencil-circle highlight in section 4.
- Graph paper with red ink sketches and a blue plotted-data poster: the chart grid and the hand-drawn highlights.
