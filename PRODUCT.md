# Product

Equid Sentinel is an offline neck tag for working donkeys and horses, and the app that goes with it. The tag learns one animal's normal behaviour and tells the owner when to check it. It never diagnoses.

## Who uses it

- Owners: smallholder coffee farmers near Yirgacheffe, Ethiopia, with one to three animals. They hear the tag (a light and five recorded phrases in Amharic). Reading is not assumed.
- Animal health workers at a cooperative or NGO: they look after 10 to 200 animals and use the app on a phone in the field or a computer at the office to decide which animal to visit first.
- Hackathon judges (World Bank Small AI for Development, October 2026): they watch a short video and open the app on a computer.

## What success looks like

The health worker knows within seconds which animal to visit first and what to do there. The judge sees a working chain from real motion data to one of five states, and trusts it because the app says what it cannot do.

## Constraints

- Works offline after one visit. No network calls except map tiles, which are shipped too.
- Five fixed states: Normal, Water, Check, Urgent, Not sure. Shape, colour and word together.
- Light theme only, readable in sunlight, touch targets at least 48 px, usable at 360 px wide.
- Writing rules and honesty rules in docs/SPEC.md sections 9 and 10.

## Where the design lives

- docs/DESIGN.md: the field-notebook visual world (paper, ink, stamps).
- docs/design-desktop.md: the demo redesign for computers, the animal card and the drawings.
- src/shared/tokens and src/shared/ui: tokens and primitives.
