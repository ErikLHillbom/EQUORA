import type { StringTable } from '../i18n'

// The five owner phrases (SPEC 5). NORMAL says nothing.
// The Amharic lines are machine-made and need a native speaker check (SPEC 10). Until then the
// app shows "machine voice, needs a native speaker check" next to them.
// Screen labels below the phrases are English only for now; Amharic falls back to English.
export const strings: StringTable = {
  en: {
    'tag.phrase.water': 'Offer water and let it rest.',
    'tag.phrase.check': 'Look at your animal. Is it eating? Check gums and droppings.',
    'tag.phrase.urgent': 'Stop work. Get help now.',
    'tag.phrase.not_sure': 'I cannot tell. Check the animal yourself.',
    'tag.phrase.normal': 'Green light. The tag stays silent.',
    'tag.voice.machine': 'Machine voice, needs a native speaker check',

    'tag.title': 'Tag',
    'tag.device': 'The tag',
    'tag.play': 'Play the phrase',
    'tag.voiceOn': 'Speak on change',
    'tag.input': 'Motion in',
    'tag.source.replay': 'Replay',
    'tag.source.phone': 'This phone',
    'tag.pipeline': 'What the tag computed',
    'tag.pipeline.note':
      'Every 2 seconds of motion goes through the activity model on this phone. Lying, rolling and falls come from rules on the tilt of the collar. Nothing leaves the phone.',

    'tag.readout.activity': 'Activity',
    'tag.readout.confidence': 'Model confidence',
    'tag.readout.posture': 'Posture',
    'tag.readout.source': 'Window from',
    'tag.readout.windows': 'Windows processed',
    'tag.readout.notSure': 'Windows not sure',
    'tag.readout.lyingBouts': 'Lying bouts',
    'tag.readout.upDowns': 'Down and up',
    'tag.readout.rolling': 'Rolling bouts',
    'tag.readout.falls': 'Possible falls',
    'tag.readout.animalTime': 'Animal time',
    'tag.readout.lastUpdate': 'Last update',
    'tag.posture.standing': 'Upright',
    'tag.posture.lying': 'Lying',
    'tag.posture.unknown': 'Learning',
    'tag.from.recorded': 'Recorded horse',
    'tag.from.synthetic': 'Synthetic',
    'tag.from.phone': 'This phone',

    'tag.tape.label': 'Last windows',
    'tag.tape.key':
      'S standing, W walking, T trotting, E eating, L lying, R rolling, ? not sure. Dashed boxes are synthetic windows.',

    'tag.scenarios': 'Scenarios',
    'tag.scenario.normal': 'A normal morning',
    'tag.scenario.water': 'Long work, no water stop',
    'tag.scenario.dull': 'A dull donkey',
    'tag.scenario.colic': 'Down and up, rolling',
    'tag.scenario.fall': 'A fall on the slope',
    'tag.scenario.recorded': 'recorded motion',
    'tag.scenario.partSynthetic': 'partly synthetic',
    'tag.scenario.synthStamp': 'Synthetic motion',
    'tag.scenario.normal.about':
      'Real collar recordings of a horse the model never saw: walking, grazing, standing. Played on Mulu, whose history says this is normal.',
    'tag.scenario.water.about':
      'Real walking and trotting from the same horse, played on Chaltu after a morning of carrying coffee cherries with no water stop.',
    'tag.scenario.dull.about':
      'Real standing windows with synthetic lying, played on Bari. Little movement and almost no eating, below her own normal. In donkeys this is often the first sign of colic.',
    'tag.scenario.colic.about':
      'Real rolling windows between synthetic lying down and getting up, three times in about 10 minutes, played on Saba. No dataset has colic, so this is a simulation of the signs.',
    'tag.scenario.fall.about':
      'Real walking, then a synthetic impact and a fast turn of the collar, then no movement. Played on Kito.',

    'tag.start': 'Start replay',
    'tag.pause': 'Pause',
    'tag.replayAgain': 'Replay again',
    'tag.runToEnd': 'Run to the end',
    'tag.reset': 'Reset',
    'tag.progress': '{done} of {total} windows, {pct}%. Played at {speed} times real time.',
    'tag.loadError': 'The activity model is not saved on this phone yet. Open the app once with a signal.',

    'tag.phone.about':
      'Hold the phone or strap it to a neck collar. Its motion sensor stands in for the tag, and the same model runs on its readings. The history it compares against is Mulu\'s.',
    'tag.phone.start': 'Start the motion sensor',
    'tag.phone.stop': 'Stop',
    'tag.phone.rate': 'Sensor rate {hz} Hz, resampled to 25 Hz.',
    'tag.phone.unsupported': 'This browser gives no motion sensor readings. Try a phone.',
    'tag.phone.denied': 'Motion sensor access was refused. Allow it in the browser settings.',

    'tag.record.title': 'Label a recording',
    'tag.record.about':
      'Tap what the animal is doing to record it, tap again to stop. Recordings stay on this phone and are sent when there is a signal.',
    'tag.record.recording': 'Recording',
    'tag.record.tap': 'Tap to record',
    'tag.record.saved': 'Saved {min} minutes.',
    'tag.record.pending': '{n} recordings waiting to be sent.',

    'tag.reason.lowConfidence': 'The model is unsure about {pct}% of the last windows.',
  },
  am: {
    // Needs a native speaker check.
    'tag.phrase.water': 'ውሃ አጠጣው፣ እንዲያርፍም ተወው።',
    // Needs a native speaker check.
    'tag.phrase.check': 'እንስሳህን ተመልከት። እየበላ ነው? ድዱን እና ፋንድያውን ፈትሽ።',
    // Needs a native speaker check.
    'tag.phrase.urgent': 'ሥራ አቁም። አሁኑኑ እርዳታ ጥራ።',
    // Needs a native speaker check.
    'tag.phrase.not_sure': 'ማወቅ አልቻልኩም። እንስሳውን ራስህ ፈትሽ።',
    // Needs a native speaker check.
    'tag.voice.machine': 'የማሽን ድምፅ ነው፤ በአፍ መፍቻ ተናጋሪ መረጋገጥ አለበት',
  },
}
