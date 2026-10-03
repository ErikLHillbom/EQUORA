# About the data

This file covers the data behind the activity classifier and the sensing rules in `src/sensing`. The numbers in the generated section come from `public/models/metrics.json` and the build summaries. `ml/equid_ml/report.py` writes them. Nobody types them by hand.

## Training data

### Dataset

- Name: Horsing Around. Kamminga JW, Janßen LM, Meratnia N, Havinga PJM. 2019. Horsing Around: a dataset comprising horse movement. Data 4(4):131.
- DOI: https://doi.org/10.4121/uuid:2e08745c-4178-4183-8551-f248c992cb14 (4TU.ResearchData).
- Licence: CC0.
- Sensor: one motion sensor on a neck collar, 100 Hz, accelerometer, gyroscope and magnetometer. We use the accelerometer only, so a phone or a cheap tag can run the same model.
- Horses: 18 riding-stable horses. 11 have labels. 7 carry only the label "null" and we skip them.
- The dataset's own count is 93,303 labelled 2 s windows. That count uses 50% overlap and leaves out "null" and "unknown" (`activity_distribution.csv`). We cut our own windows without overlap, so our counts are lower.

### What we checked in the files

- The CSV columns are Ax, Ay, Az, Gx, Gy, Gz, Mx, My, Mz, A3D, G3D, M3D, label, segment, subject. There is no time column. Rows follow each other at 100 Hz.
- Acceleration is in m/s^2. A standing horse reads 9.8 m/s^2. We divide by 9.80665 to get g.
- Labels in the CSV parts use hyphens (`walking-rider`). The distribution file uses underscores. The builder accepts both.
- The magnetometer runs at 12 Hz and is NaN in most rows. We do not use it.

### How we built the windows

1. `ml/equid_ml/fetch_subset.py` lists the remote zip with range requests and streams only the CSV parts of the 11 labelled horses. It keeps labelled rows and drops "null" and "unknown".
2. `scripts/build-features.ts` cuts runs of consecutive rows with the same label and segment into 2 s windows without overlap (200 rows). Each window is averaged in blocks of 4 to 25 Hz (50 samples) and converted to g.
3. The same script computes the features with `src/sensing/features.ts`, the code the app runs. Training and app features cannot drift apart.

### Label mapping

| Our class | Horsing Around labels |
|---|---|
| stand | standing |
| walk | walking-natural, walking-rider |
| trot | trotting-natural, trotting-rider |
| eat | grazing, eating |
| roll | rolling |

Every other label is dropped. Gallop is not working-animal behaviour. Head shake, shaking and scratch-biting are short events inside other activities, not parts of a time budget. Rubbing, fighting, jumping and scared have too few windows. The generated tables below give the counts.

### Features

23 numbers per window, all from the accelerometer, all orientation independent except ODBA:

- Magnitude: mean, standard deviation, min, max, range, 10th, 50th and 90th percentile, skew, kurtosis, mean absolute deviation, mean-crossing rate.
- Dynamic acceleration with gravity taken as the window mean: ODBA, VeDBA, standard deviation and range of the component along gravity, mean of the component across gravity.
- Spectrum of the magnitude: dominant frequency, its power, and the energy in the bands 0 to 1, 1 to 3, 3 to 6 and 6 to 12.5 Hz.

ODBA sums the absolute value per axis, so it changes a little with collar rotation. We keep it because the brief asks for it. `src/sensing/features.test.ts` checks that every other feature stays the same under rotation.

### Rolling

Rolling has very few windows, in this dataset and in others (0.3% of samples in a 10-horse collar study, SPEC 6). As a classifier class it scored low precision and low recall leave-one-horse-out (see below), so it is not in the shipped classifier. The rolling rule in `src/sensing/rules.ts` covers it: repeated large orientation swings with high energy. On the held-out horse, the rule finds a rolling bout in the rolling clip and none in the standing, walking, trotting or grazing clips (`src/sensing/pipeline.test.ts`). The rolling clip joins several short bouts, so this is a check, not a measurement.

### Lying and falls

Horsing Around has no lying label and no falls. The lying and fall rules in `src/sensing/rules.ts` are tested on synthetic signals only. The app marks them Experimental.

### Limits of the evaluation

- The forest settings (6 options) and the confidence threshold were chosen on the same leave-one-horse-out predictions that we report. Expect slightly lower numbers on new horses.
- Classes are unbalanced. Walk and trot make up most windows. Macro F1 weighs each class the same.
- Leave-one-horse-out tests new horses of the same kind, with the same collar and the same stable. It says nothing about donkeys, phones or Ethiopia.
- The confidence threshold has a floor of 0.5. The 90% accuracy target is met at every threshold we tried, so the floor sets it.

## Results

<!-- generated:start (ml/equid_ml/report.py) -->

### What we downloaded

- Archive: `data.zip`, 10,963,052,937 bytes. Listed with HTTP range requests, never downloaded whole.
- Streamed: 4.30 GB of compressed CSV parts from the 11 horses with labels. Each part was filtered in memory.
- Kept on disk: 181 MB (labelled rows only, columns Ax, Ay, Az, label, segment).

| Horse | Rows at 100 Hz | Labelled rows kept |
|---|---|---|
| Bacardi | 12,036,230 | 620,452 |
| Driekus | 11,953,447 | 1,173,045 |
| Galoway | 12,359,963 | 2,836,643 |
| Happy | 11,865,871 | 2,723,864 |
| Niro | 5,158,052 | 12,550 |
| Noortje | 2,299,298 | 3,736 |
| Pan | 7,837,331 | 36,307 |
| Patron | 11,909,761 | 1,473,973 |
| Sense | 4,788,262 | 292,697 |
| Viva | 8,438,602 | 230,371 |
| Zafir | 6,726,119 | 1,284,759 |

Mean acceleration magnitude over the windows we kept: 1.1604 g (input in m/s^2, divided by 9.80665). Walking and trotting raise the mean above 1 g; the builder stops if it falls outside 0.8 to 1.25 g.

### Windows per class

| Class | 2 s windows | In the classifier |
|---|---|---|
| stand | 2,963 | yes |
| walk | 21,687 | yes |
| trot | 14,326 | yes |
| eat | 10,069 | yes |
| roll | 37 | no, rule only |

Dropped labels:

| Label | 2 s windows | Why |
|---|---|---|
| galloping-rider | 2,190 | gallop is not working-animal behaviour |
| head-shake | 463 | a short event inside other activities, not a time budget activity |
| scratch-biting | 161 | a short event inside other activities |
| galloping-natural | 58 | gallop is not working-animal behaviour and is rare at a neck collar |
| fighting | 17 | too few windows, not a time budget activity |
| shaking | 14 | a short event inside other activities |
| jumping | 9 | riding sport, not working-animal behaviour |
| rubbing | 3 | too few windows |
| scared | 3 | too few windows |

### Results, leave-one-horse-out

Each fold trains on all horses but one and tests on the one left out. 11 horses, 49,045 windows, classes stand, walk, trot, eat.

| Model | Accuracy | Macro F1 |
|---|---|---|
| Random forest (shipped) | 96.1% | 0.951 |
| Logistic regression (baseline) | 95.8% | 0.945 |

| Class | Precision | Recall | F1 | Windows | Baseline F1 |
|---|---|---|---|---|---|
| stand | 0.903 | 0.946 | 0.924 | 2,963 | 0.911 |
| walk | 0.973 | 0.959 | 0.966 | 21,687 | 0.965 |
| trot | 0.992 | 0.986 | 0.989 | 14,326 | 0.991 |
| eat | 0.912 | 0.934 | 0.922 | 10,069 | 0.914 |

Confusion matrix (rows are the true class):

|  | predicted stand | predicted walk | predicted trot | predicted eat |
|---|---|---|---|---|
| true stand | 2,804 | 9 | 0 | 150 |
| true walk | 4 | 20,807 | 114 | 762 |
| true trot | 0 | 197 | 14,129 | 0 |
| true eat | 297 | 371 | 0 | 9,401 |

Accuracy per held-out horse:

| Horse left out | Windows | Accuracy |
|---|---|---|
| Viva | 1,065 | 99.2% |
| Happy | 12,746 | 97.9% |
| Zafir | 5,700 | 98.0% |
| Pan | 178 | 98.9% |
| Driekus | 5,441 | 94.1% |
| Galoway | 13,089 | 95.0% |
| Patron | 6,742 | 96.2% |
| Bacardi | 2,789 | 91.7% |
| Niro | 60 | 88.3% |
| Sense | 1,217 | 96.4% |
| Noortje | 18 | 100.0% |

### Shipped model

- Random forest, 30 trees, max depth 10, at least 50 windows per leaf, balanced class weights. Selection: smallest forest within 0.005 macro F1 of the best.
- Trained on 10 horses. Driekus is left out, so the Tag screen replays a horse the model never saw.
- `public/models/activity-v1.json`: 123,201 bytes, 4,450 nodes.
- Confidence threshold: 0.5. Rule: lowest top-class probability, from 0.5 up, with accuracy >= 0.9 on the leave-one-horse-out windows above it. Windows above it: 99.7%, with accuracy 96.3%. Windows below it are NOT SURE in the app.

- Rolling as a classifier class: precision 0.09, recall 0.32 on 37 windows. Rule: keep roll if leave-one-horse-out precision and recall are both >= 0.3. Kept: no.

- Replay fixtures from Driekus: windows per clip stand 90, walk 90, trot 90, eat 90, roll 13; 111,900 bytes in `public/replay/`.

<!-- generated:end -->

## What this data does not cover

- No lying label. Lying detection is a rule, marked Experimental.
- Riding-stable horses in the Netherlands, much of it ridden. No working animals under pack or cart load.
- No donkeys and no mules. Donkeys move differently and sham eat, so eating time may not carry over.
- No animal with colic or any other illness.
- Rolling is rare: the generated table gives the window count, from 3 horses.
- No falls.
- A neck collar, not a phone. A phone held in a hand or tied to a halter moves differently.
- Standing has far fewer windows than walking or trotting.

## Reproduce

```
cd ml
uv sync
uv run python -m equid_ml.fetch_subset
cd ..
npx tsx scripts/build-features.ts --replay-subject Driekus
cd ml
uv run python -m equid_ml.train
uv run python -m equid_ml.export
uv run python -m equid_ml.report
```
