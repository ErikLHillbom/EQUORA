# Equid Sentinel: build brief

Read this first. Then read docs/DESIGN.md, which replaces parts of section 8. Where the two disagree, sections 5, 9, 10 and 11 of this file win.

## 1. Problem

For many rural households in low- and middle-income countries, a donkey or horse is the transport, the water carrier and the farm labour. In Ethiopia a working donkey is worth about USD 567 a year to its household (95% PI 479 to 660), up to 21% of household income, and saves up to 16.5 hours of human labour a week (Asteraye et al. 2026). A replacement donkey costs about USD 75 at market (Asteraye et al. 2024). Losing one removes transport, water and farm work on the same day.

Colic is not the most common problem in working equids, but it is one of the deadliest. At the clinic in Debre Zeit, colic was 10.3% of cases and 15.4% of colic cases died (10 of 65). 63% of the colic cases were donkeys (Worku et al. 2017). Donkeys hide pain. Their first sign is often only dullness.

The problem we solve: owners notice too late. The tag notices the first day an animal departs from its own normal.

Problem statement, in the brief's format:

> Because of this tool, an owner will check a working donkey or horse on the first day its behaviour departs from its own normal, instead of days later when it is down and too sick to save; we know because accelerometers detected induced colic in horses with 91.2% accuracy (Eerdekens et al. 2024) and 15.4% of colic cases at an Ethiopian clinic died (Worku et al. 2017).

## 2. User

- Owner: a smallholder coffee farmer near Yirgacheffe, Gedeo zone, Ethiopia, with one to three donkeys or horses. Basic phone, often away from it on the slope. Speaks Gedeo and Amharic. Reading is not assumed.
- Cooperative or NGO animal health worker: looks after 10 to 200 animals across many households. Has a smartphone. Uses the web app to decide which animal to visit first.

The tag talks to the owner (light and voice). The app serves the health worker and the demo.

## 3. Product

Equid Sentinel is an offline neck tag that learns one animal's normal behaviour and tells the owner when to check it. It never diagnoses. It answers one question: "Which of my animals is behaving differently from its own normal right now?"

The app has these parts:
- Herd: every tagged animal, its state, and which one to visit first.
- Map: where each animal is, today's route over the terrain.
- Animal: today against its normal, trends over time, detected changes, what to do next.
- Tag: the tag's own behaviour, running the real model on real or recorded motion data.
- Statistics: the herd as a ledger.
- About the data: datasets, metrics, and what the data does not cover.

Colic, dehydration, falls and lameness are causes of a departure from normal. We do not build the product around one disease.

## 4. Tag hardware (target, not built this weekend)

- Motion sensor (accelerometer, gyroscope), barometer, temperature. Neck collar.
- A light and a speaker with five or six recorded phrases.
- Heart rate, harness pressure and GPS wait for a later version. The demo map uses simulated positions.
- Parts estimate USD 15 to 25 (rough, unverified). A cooperative or NGO lends the tags.
- For the demo, a phone's own motion sensor stands in for the tag.

## 5. The five states

| State | Trigger | What the owner hears |
|---|---|---|
| NORMAL | Behaviour within the animal's own baseline | Nothing. Green light. |
| WATER | Long work in heat without rest, or the water-debt model passes its threshold | "Offer water and let it rest." |
| CHECK | Activity, lying or eating time departs from the animal's baseline, alone or together | "Look at your animal. Is it eating? Check gums and droppings." |
| URGENT | Repeated rolling or getting up and down within 30 minutes, lying still for a long time, a possible fall, or for donkeys a strong drop in activity and eating together | "Stop work. Get help now." |
| NOT SURE | Baseline shorter than 3 days, data coverage too low, model confidence too low, or the tag has moved or gone stale | "I cannot tell. Check the animal yourself." |

Rules that always hold:
- One lying bout is never an alarm. 43% of Pakistani pack donkeys sometimes lie down after loading (Bukhari et al. 2022). URGENT needs repetition or duration.
- Two species profiles. Horse: rolling, repeated up and down. Donkey: dullness, more lying, less eating.
- The tag says "check", never "colic". A person makes the call.
- Each state has one colour, one shape and one word, always shown together.

## 6. Data

Data we build with:
- Horsing Around (Kamminga et al. 2019, 4TU.ResearchData, CC0). 18 horses, neck collar IMU at 100 Hz, 93,303 labelled 2 s windows. Riding-stable horses. Used to train the activity classifier.
- Our own phone recordings, labelled in the Tag screen recorder.

Data that shows the problem: see section 12, sources.

What the data does not cover (scored, say it in the app and the video):
- No sensor data from any animal with colic. Colic episodes in the demo are simulated and labelled.
- No working donkeys. The only donkey accelerometer study we found used 11 donkeys at pasture and its data is not public.
- No animals from Ethiopia or any low-income setting.
- Horsing Around has no lying label. Lying detection is a rule, marked Experimental.
- Rolling is rare in every dataset (0.3% of samples in a 10-horse collar study).
- Eating time is unreliable in donkeys, because they sham eat.
- A baseline learned on an animal that is already unwell treats unwell as normal. The tag detects change, not health.
- The colic accuracy figure (91.2%) comes from front-leg sensors on 8 mares with induced colic, not from a neck tag.

## 7. AI and guardrails

The AI:
- A small activity classifier (stand, walk, trot, eat, roll) on 2 s windows of motion data, orientation-independent features, a random forest of about 30 trees. Trained on Horsing Around, evaluated leave-one-horse-out. Exported as a small JSON file for the app and a C header for a microcontroller.
- A per-animal baseline: median and spread of activity, lying and eating for each hour of the day, over the last 14 days.
- Change detection on that baseline (robust z-score and CUSUM) combined across signals.
- A short forecast: expected behaviour for the next hours, and a water-debt projection from workload and weather.

Why not something simpler: an SMS service or a spreadsheet cannot watch an animal all day. The signal is a change in one animal's own pattern, which only a model running on the animal can learn.

Guardrails:
- Five fixed outputs. The tag can say nothing else.
- A NOT SURE state for short baselines, low confidence and stale data.
- No diagnosis, ever. The tag asks the owner to look.
- A person always makes the call. Owner feedback ("Checked: fine") is recorded against each event.
- Data stays on the tag and the phone. Store and forward when a signal appears.

## 8. Design

Superseded in part by docs/DESIGN.md. What stays from this section:
- Quiet, exact and well spaced.
- Light theme only, high contrast for sunlight.
- Touch targets at least 48 px.
- No decorative animation. prefers-reduced-motion respected.
- Every screen usable at 360 px wide.
- State shown by shape, colour and word together.
- No emoji.
- Show nothing the tag does not measure.

## 9. Writing rules

Sources: Wikipedia, "Signs of AI writing"; Kobak et al. 2024, "Delving into ChatGPT usage in academic writing through excess vocabulary".

Write like this:
- Short concrete sentences, one claim each. Active voice. Plain verbs: is, has, sends, drops.
- Every number has a unit and a source. Keep ranges and "up to" as the source states them.
- Name things: donkey, owner, clinic. Not "stakeholders" or "users".
- An alert says what was seen, which animal, and what to do.
- Sentence case for every heading, label and button.
- Straight quotes.

Never use these words: delve, tapestry, testament, landscape, realm, journey, intricate, nuanced, meticulous, pivotal, crucial, vital, robust, seamless, seamlessly, leverage, harness, empower, unlock, elevate, enhance, foster, bolster, garner, underscore, showcase, streamline, holistic, synergy, paradigm, transformative, revolutionize, game-changer, cutting-edge, state-of-the-art, groundbreaking, innovative, vibrant, profound, comprehensive, ever-evolving, additionally, furthermore, moreover, notably, importantly.

Never use these constructions:
- Em dashes. Use a period, comma, colon or parentheses.
- "Not just X but Y", "it's not X, it's Y".
- Lists of three for rhythm. List what is real.
- "Serves as", "stands as", "represents" when "is" works.
- A trailing "-ing" clause that adds fake analysis ("..., highlighting the need for").
- Vague attribution ("studies show"). Name the study.
- "It's important to note", "In summary", "In conclusion".
- Rhetorical questions, exclamation marks, emoji, decorative bold, Title Case Headings.
- Apologies in empty or error states.

`npm run check-copy` searches strings and docs for em dashes and the banned words.

## 10. Honesty rules

- Every screen that shows simulated data carries the "Simulated data" stamp.
- Lying, rolling and head-position readouts carry the "Experimental" stamp.
- Metrics on screen are read from metrics.json, produced by the training run. Never typed by hand.
- Every figure in the app has a source in section 12 or in docs/data.md.
- Machine-made translations and voices are labelled until a native speaker checks them.
- We say what the tag cannot see: droppings, gums, sweating, heart rate. The CHECK phrase asks the owner to look at these.
- Never claim the tag detects colic. It detects change.

## 11. Build order

1. Setup: scaffold, docs, shared types.
2. The chain, before any screen: real sensor windows in, features, classifier, baseline, rules, one of five states out, a phrase played. Tested.
3. Design tokens, primitives and the specimen page.
4. Tag screen on the chain.
5. Herd, Animal, Map, Statistics, About the data.
6. Forecasts and recommendations on the Animal screen.
7. 3D horse on the home screen, drawings, texture polish.
8. Offline (PWA), budgets, copy check, screenshots, deploy.

Design never blocks the chain. If an asset is missing, ship flat paper and ink.

## 12. Sources

Economic value
- Asteraye GB, Jobling R, Jemberu WT, et al. 2026. Estimating the economic value of working donkeys in Ethiopia. Preventive Veterinary Medicine 254:106926. https://doi.org/10.1016/j.prevetmed.2026.106926
- Asteraye GB et al. 2024. Population, distribution, biomass, and economic value of equids in Ethiopia. PLOS ONE. https://doi.org/10.1371/journal.pone.0295388 (donkey USD 74.8, range 47.6 to 98; horse USD 151.8; 10.7 million donkeys and 2.1 million horses, CSA 2020)
- Brooke. Working equids data. https://www.thebrooke.org/our-work/data-working-equids (116 million equids worldwide)
- UN News 2025, World Horse Day, citing WOAH and FAO. https://news.un.org/en/story/2025/07/1165370 (112 million working equids support about 600 million people)

Colic and health
- Worku Y et al. 2017. Equine colic: clinical epidemiology and associated risk factors in and around Debre Zeit. Tropical Animal Health and Production. https://pubmed.ncbi.nlm.nih.gov/28401328/
- Benedetti B et al. 2024. A retrospective study on working equids admitted to an equine clinic in Cairo. Animals 14(5):817. https://doi.org/10.3390/ani14050817
- The Donkey Sanctuary. Colic in donkeys. https://www.thedonkeysanctuary.org.uk/for-owners/owners-resources/colic-in-donkeys
- Mathewos M et al. 2021. Gastrointestinal helminthiasis in horses and donkeys of Hawassa. Vet Med Int. https://doi.org/10.1155/2021/6686688 (78.5%; donkeys 91.9%, horses 63.7%)
- Getahun YA et al. 2024. Equine helminths in Gamo Gofa Zone. J Vet Sci. https://pubmed.ncbi.nlm.nih.gov/38834511/ (90.4%)
- Merridale-Punter MS et al. 2022. Working equid lameness: systematic review and meta-analysis. Animals 12(22):3100. https://pubmed.ncbi.nlm.nih.gov/36428328/ (lameness 29.9%, 95% CI 17 to 47; gait abnormality 62.9%, 95% CI 31 to 87)
- Merridale-Punter MS et al. 2024. Equipment-related wounds in working equids of Oromia. Animal Welfare 33:e42. https://pubmed.ncbi.nlm.nih.gov/39600354/ (72.6% of 369)
- Bukhari SSUH et al. 2022. Welfare concerns for mounted load carrying by working donkeys in Pakistan. Front Vet Sci. https://doi.org/10.3389/fvets.2022.886020 (332 owners; 87.4% carried more than half bodyweight; 43.4% sometimes lie down after loading)

Sensors and detection
- Eerdekens A et al. 2024. Automatic early detection of induced colic in horses using accelerometer devices. Equine Vet J 56(6):1229-1242. https://pubmed.ncbi.nlm.nih.gov/38318654
- Giannone et al. 2025. Scoping review of technology to monitor horse behaviour and health. J Equine Vet Sci 155. https://pubmed.ncbi.nlm.nih.gov/41242474/
- Eerdekens A et al. 2020. Resampling and data augmentation for equine behaviour classification. Comput Electron Agric 168 (25 Hz result).
- Congiu et al. 2024. Tri-axial accelerometer data to predict behaviour of grazing donkeys. Comput Electron Agric 227:109582.
- Auer U et al. 2021. Review of horse time budgets. https://pmc.ncbi.nlm.nih.gov/articles/PMC8002676/

Datasets
- Kamminga JW et al. 2019. Horsing Around: a dataset comprising horse movement. Data 4(4):131. https://doi.org/10.4121/uuid:2e08745c-4178-4183-8551-f248c992cb14

Context
- FAO, n.d. Annex 6: Coffee growing in Ethiopia (doc X6939E). https://www.fao.org/4/x6939e/X6939e12.htm (12 hours to get cherries to a pulpery)
- NASA POWER hourly API. https://power.larc.nasa.gov/docs/services/api/temporal/hourly/
