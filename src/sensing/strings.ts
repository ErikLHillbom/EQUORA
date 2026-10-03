import type { StringTable } from '../i18n/index.ts'

// The Amharic strings below are machine-made, without a native speaker.
// They stay marked "machine-made, needs a native speaker check" in the app until someone checks them.

export const strings: StringTable = {
  en: {
    'sensing.activity.stand': 'Standing',
    'sensing.activity.walk': 'Walking',
    'sensing.activity.trot': 'Trotting',
    'sensing.activity.eat': 'Eating',
    'sensing.activity.roll': 'Rolling',
    'sensing.activity.lie': 'Lying',
    'sensing.activity.unknown': 'Not sure',

    'sensing.posture.standing': 'Upright',
    'sensing.posture.lying': 'Lying',
    'sensing.posture.unknown': 'Still learning upright',

    'sensing.event.lieDown': 'Lay down',
    'sensing.event.getUp': 'Got up',
    'sensing.event.roll': 'Rolled',
    'sensing.event.fall': 'Possible fall',

    'sensing.confidence': '{pct}% sure',
    'sensing.notSure': 'Not sure. The model is below its confidence threshold.',
    'sensing.experimental': 'Experimental',
    'sensing.experimental.why': 'Lying, rolling and falls come from rules. No labelled lying data exists for this collar.',

    'sensing.motion.unsupported': 'This phone has no motion sensor the browser can read.',
    'sensing.motion.denied': 'Motion access is off. Turn it on in the browser settings to record.',
    'sensing.motion.rate': 'Phone sensor at {hz} Hz, resampled to 25 Hz.',

    'sensing.replay.source': 'Recorded collar data from {subject}, a horse the shipped model never saw.',
    'sensing.recordings.saved': 'Recording saved on this phone.',
    'sensing.recordings.pending': '{count} recordings wait to be sent.',
  },
  am: {
    'sensing.activity.stand': 'መቆም',
    'sensing.activity.walk': 'መራመድ',
    'sensing.activity.trot': 'ሶምሶማ',
    'sensing.activity.eat': 'መብላት',
    'sensing.activity.roll': 'መንከባለል',
    'sensing.activity.lie': 'መተኛት',
    'sensing.activity.unknown': 'እርግጠኛ አይደለም',

    'sensing.posture.standing': 'ቆሟል',
    'sensing.posture.lying': 'ተኝቷል',

    'sensing.event.lieDown': 'ተኛ',
    'sensing.event.getUp': 'ተነሳ',
    'sensing.event.roll': 'ተንከባለለ',
    'sensing.event.fall': 'ሊሆን የሚችል መውደቅ',

    'sensing.experimental': 'የሙከራ',
  },
}
