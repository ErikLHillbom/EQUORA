import type { StringTable } from '../i18n'

// About the data: the datasheet and the honesty slip. Model figures arrive as {placeholders}
// read from metrics.json at runtime, never typed here (SPEC 10). English only for now; Amharic
// falls back to English.
export const strings: StringTable = {
  en: {
    'data.title': 'About the data',
    'data.kicker': 'Datasheet, model {version}',
    'data.coords': 'Training data in figures',
    'data.coords.horses': '{n} horses',
    'data.coords.windows': '{n} windows',
    'data.coords.hz': '{n} Hz',
    'data.coords.window': '{n} s windows',
    'data.intro':
      'This page lists what the tag learned from, how we tested it, and the parts we made up for the demo. Model figures are read from the file the training run wrote.',
    'data.jump': 'Skip to what our data does not cover',
    'data.loading': 'Reading the model figures.',
    'data.error.title': 'Model figures did not load',
    'data.error.body': 'The file models/metrics.json did not load. Sections 2 to 6 do not depend on it.',

    // 1. The model
    'data.model.h': 'The model',
    'data.model.lead':
      'A {kind} of {trees} trees sorts every {seconds} s of neck motion into one of {n} activities: {classes}. It reads the accelerometer only, at {hz} Hz, through {features} features that stay the same when the collar turns.',
    'data.spec.caption': 'Specification',
    'data.spec.kind': 'Model',
    'data.spec.trees': 'Trees',
    'data.spec.treesValue': '{n}, depth up to {depth}',
    'data.spec.classes': 'Activities',
    'data.spec.sensor': 'Input',
    'data.spec.sensorValue': 'Accelerometer only, {hz} Hz',
    'data.spec.window': 'Window',
    'data.spec.windowValue': '{n} s, no overlap',
    'data.spec.features': 'Features',
    'data.spec.size': 'File size',
    'data.spec.sizeValue': '{kb}, {nodes} nodes',
    'data.spec.test': 'Test',
    'data.spec.testValue': 'Leave one horse out',
    'data.spec.horses': 'Horses tested',
    'data.spec.windows': 'Windows tested',
    'data.spec.trained': 'Trained',

    'data.test.h': 'How we tested it',
    'data.test.body':
      'Each round trains on all horses but one and tests on the horse left out, so the model never sees the test horse in training. {horses} horses, {windows} windows.',
    'data.results.caption': 'Results, leave one horse out',
    'data.results.model': 'Model',
    'data.results.accuracy': 'Accuracy',
    'data.results.f1': 'Macro F1',
    'data.results.forest': 'Random forest, shipped',
    'data.results.baseline': 'Logistic regression',
    'data.baseline.note':
      'Logistic regression is a much simpler model. It comes within {gap} points of the forest. The gap is small, and a smaller tag could ship the simpler model and lose little.',
    'data.folds':
      'By horse, accuracy runs from {low} ({lowName}, {lowN} windows) to {high} ({highName}, {highN} windows).',

    'data.perclass.caption': 'Per activity',
    'data.perclass.activity': 'Activity',
    'data.perclass.precision': 'Precision',
    'data.perclass.recall': 'Recall',
    'data.perclass.f1': 'F1',
    'data.perclass.windows': 'Windows',
    'data.perclass.note':
      'Macro F1 gives each activity the same weight. Walking and trotting make up most windows, so accuracy alone would hide a weak activity.',

    'data.confusion.caption': 'Confusion matrix',
    'data.confusion.said': 'Model said',
    'data.confusion.true': 'True',
    'data.confusion.note': 'Rows are the true activity. The largest mix-up: {count} {trueLabel} windows called {predicted}, {share} of all {trueLabel} windows.',

    'data.threshold.h': 'Confidence threshold',
    'data.threshold.body':
      'The tag trusts a window only when the model gives its top activity a probability of at least {threshold}. {coverage} of the test windows clear that bar, and {accuracy} of those are right.',
    'data.threshold.notSure': 'Below this the tag says not sure.',
    'data.rule.recorded': 'Rule as recorded',

    'data.roll.h': 'Rolling',
    'data.roll.failed':
      'We also tried rolling as a fifth activity. Tested on {n} windows, it reached precision {precision} and recall {recall}. A class stays only if both reach {min}. Rolling failed, so the shipped model has no rolling class. A rule on collar tilt handles rolling instead (section 3).',
    'data.roll.kept': 'Rolling passed the test for a class and is part of the shipped model.',

    'data.limits.h': 'Limits of this test',
    'data.limits.body':
      'We chose the forest settings and the threshold on the same predictions we report, so expect slightly lower figures on new horses. Leave one horse out tests new horses of the same kind, with the same collar, in the same stable. It says nothing about donkeys, phones or Ethiopia.',

    // 2. Data we built with
    'data.built.h': 'Data we built with',
    'data.built.lead': 'Real data trained and tested the model. The herd on the other screens is simulated and carries the "Simulated data" stamp.',
    'data.tag.real': 'Real',
    'data.tag.simulated': 'Simulated',
    'data.tag.machine': 'Machine-made',
    'data.tag.asset': 'Open asset',
    'data.licence': 'Licence: {licence}',

    'data.src.horsing.name': 'Horsing Around',
    'data.src.horsing.body':
      'Neck collar motion from riding-stable horses. {n} of the 18 horses carry activity labels. We streamed only the CSV parts of those {n} horses from a 10.96 GB archive: 4.30 GB read, 181 MB kept.',
    'data.src.replay.name': 'Held-out replay horse',
    'data.src.replay.body':
      '{name} is left out of the shipped model, which learned from the other {n} horses. The Tag screen replays collar data from {name}, so the replay shows the model a horse it never saw.',
    'data.src.phone.name': 'Our own phone recordings',
    'data.src.phone.body':
      'The recorder on the Tag screen labels phone motion as standing, walking, grazing, lying or rolling. Recordings stay on the phone. None of them trained the shipped model.',
    'data.src.herd.name': 'Demo herd',
    'data.src.herd.body':
      '{n} animals in {households} households of the Aricha cooperative, with {days} days of hourly behaviour. The animals and every figure about them are made up.',
    'data.src.positions.name': 'Positions',
    'data.src.positions.body': 'Positions are generated along real footpaths. The tag in this version has no GPS.',
    'data.src.scenarios.name': 'Scenarios',
    'data.src.scenarios.body':
      '{n} episodes written into the herd history, among them a dull donkey, a horse with colic and a fall. Colic in the demo is simulated.',
    'data.src.weather.name': 'Weather',
    'data.src.weather.body': 'Hourly air temperature and humidity from NASA POWER for {lat} N, {lon} E.',
    'data.src.weather.filled': 'Hours that POWER has not published yet repeat the most recent day with data.',
    'data.src.routes.name': 'Routes',
    'data.src.routes.body':
      'Footpaths from OpenStreetMap through the Overpass API. Elevation from the Open-Meteo elevation API (Copernicus GLO-90).',
    'data.src.tiles.name': 'Map tiles',
    'data.src.tiles.body':
      'Basemap from Protomaps, built on OpenStreetMap. Terrain from Mapterhorn, built on Copernicus GLO-30. Both are cut to a 20 by 20 km box around Yirgacheffe and ship with the app.',
    'data.src.models.name': '3D animals',
    'data.src.models.body': 'Horse and donkey from the Quaternius Ultimate Animated Animal pack. We removed every attack, death and gallop clip.',
    'data.src.voices.name': 'Tag voices',
    'data.src.voices.body':
      'English and Amharic phrases from Meta MMS-TTS. The Amharic text is machine-translated. A native speaker has not checked the text or the voice.',

    // 3. Rules and assumptions
    'data.rules.h': 'Rules and assumptions',
    'data.rules.lead': 'Some parts of the tag are rules we wrote by hand, and some numbers are our own assumptions.',
    'data.rules.exp.h': 'Lying, rolling and falls',
    'data.rules.exp.body':
      'Horsing Around has no lying label, no falls and only {roll} rolling windows. We tested these three rules on synthetic signals only.',
    'data.rules.lying': 'Lying: the collar tilts far from the upright direction the tag learned while the animal walked, and the animal stays still.',
    'data.rules.rolling':
      'Rolling: repeated large swings of the collar with high energy. On the held-out horse it found a bout in the rolling clip and none in the standing, walking, trotting or grazing clips.',
    'data.rules.fall': 'Possible fall: a hard impact, the collar turns over within seconds, then the animal lies still.',
    'data.rules.water.h': 'Water model',
    'data.rules.water.body':
      'Water debt is the water an animal has lost since it last drank, as a share of its body weight. Horse water needs come from NRC 2007. We found no measured sweat rate for donkeys, so we assume a donkey sweats {factor} times as much as a horse for the same work. Forage covering {forage}% of the need is an assumption too.',
    'data.rules.assumption': 'Assumption',
    'data.rules.baseline.h': 'Baseline',
    'data.rules.baseline.body':
      "Each animal gets its own normal: for every hour of the day, the median and spread of its activity, lying and eating over the last {days} days. A change counts when two signals move more than {zDonkey} spreads from normal for a donkey ({zHorse} for a horse), or when activity stays low for hours (CUSUM). Lying alone never counts.",
    'data.rules.states.caption': 'The five states',
    'data.rules.states.state': 'State',
    'data.rules.states.when': 'When',
    'data.rules.state.normal': "Behaviour within the animal's own normal.",
    'data.rules.state.water': 'Water debt of {pct}% of body weight or more, or over {hours} hours of work without a water stop.',
    'data.rules.state.check': "Activity, lying or eating departs from the animal's own normal.",
    'data.rules.state.urgent':
      'Repeated rolling or getting up and down, lying still far longer than usual, a possible fall, or for donkeys activity and eating both far below normal.',
    'data.rules.state.not_sure': 'Any of these:',
    'data.rules.notSure.baseline': 'Baseline shorter than {days} days',
    'data.rules.notSure.coverage': 'Under {pct}% of the last 24 hours covered',
    'data.rules.notSure.stale': 'No data for over {hours} hours',
    'data.rules.notSure.model': 'Model not sure for over {pct}% of recent minutes',

    // 4. The honesty slip
    'data.gaps.h': 'What our data does not cover',
    'data.gaps.sub': '{n} gaps, and how we would close each one.',
    'data.gaps.close': 'To close it',
    'data.gaps.colic': 'No sensor data from any animal with colic. Colic in the demo is simulated.',
    'data.gaps.colic.close': "Tag animals admitted to an equine clinic and label each episode from the vet's notes.",
    'data.gaps.donkeys':
      'No working donkeys. The only donkey motion study we found had 11 donkeys at pasture, and its data is not public (Congiu et al. 2024).',
    'data.gaps.donkeys.close': 'Record working donkeys with Brooke Ethiopia or The Donkey Sanctuary clinics, labelled on the Tag screen.',
    'data.gaps.place': 'No animals from Ethiopia or any low-income setting. Horsing Around is riding-stable horses in the Netherlands.',
    'data.gaps.place.close': 'Record animals near Yirgacheffe and compare accuracy per activity before trusting the model there.',
    'data.gaps.lying': 'No lying label and no falls. Both come from rules marked Experimental.',
    'data.gaps.lying.close': 'Film animals at rest for a few nights and label lying bouts from the video. Falls need clinic records.',
    'data.gaps.rolling': 'Rolling is rare: {n} windows in the whole training set.',
    'data.gaps.rolling.close': 'Film healthy animals when they roll after work, so labelled rolling does not wait for colic.',
    'data.gaps.eating': 'Eating time is unreliable in donkeys, because they sham eat: they go through the motions with no food taken in.',
    'data.gaps.eating.close': 'Check eating time against watched feeding in a short field study.',
    'data.gaps.baseline': 'A baseline learned on an animal that is already unwell treats unwell as normal. The tag detects change, not health.',
    'data.gaps.baseline.close': 'A health worker checks each animal during its first {days} days of learning.',
    'data.gaps.figure':
      'The 91.2% colic figure comes from front-leg sensors on 8 mares with induced colic, not from a neck tag (Eerdekens et al. 2024).',
    'data.gaps.figure.close': 'A neck-tag study on natural colic cases. We cannot close this one ourselves.',
    'data.gaps.phone': 'The model learned from a neck collar. A phone tied to a halter moves differently.',
    'data.gaps.phone.close': 'Our own recordings on the Tag screen are the start of a phone dataset.',
    'data.gaps.language': 'Amharic text and voices are machine-made. A native speaker has not checked them.',
    'data.gaps.language.close': 'A native speaker from the cooperative reads the strings and records the phrases.',

    // 5. Privacy and guardrails
    'data.privacy.h': 'Privacy and guardrails',
    'data.privacy.local': 'Data stays on the tag and the phone. There is no server.',
    'data.privacy.forward': 'The tag stores its records and forwards them when a signal appears.',
    'data.privacy.outputs': 'The tag has five fixed outputs. It can say nothing else.',
    'data.privacy.noDiagnosis': 'It never names a disease. It asks the owner to look.',
    'data.privacy.person': 'A person makes the call. Owner feedback, such as "Checked: fine", is recorded against each event.',
    'data.privacy.network': 'Once installed, the app makes no network calls. Map tiles ship with it.',

    // 6. Sources
    'data.sources.h': 'Sources',
    'data.sources.value': 'Economic value and households',
    'data.sources.health': 'Colic and health',
    'data.sources.sensors': 'Sensors and detection',
    'data.sources.datasets': 'Datasets',
    'data.sources.context': 'Context',
    'data.sources.ours': 'Our build notes are in docs/data.md, docs/decisions.md and docs/assets.md in the code.',
  },
}
