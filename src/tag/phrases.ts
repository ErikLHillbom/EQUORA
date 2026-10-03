// The tag's voice: one fixed phrase per state (SPEC 5). NORMAL plays nothing.
// The tag can say nothing else (SPEC 7). Text lives in ./strings.ts, audio in public/audio/.
import type { Lang } from '../i18n'
import type { StateId } from '../shared/types'

export interface Phrase {
  state: StateId
  /** String table key for the words, or null for NORMAL, which says nothing. */
  textKey: string | null
  /** Recorded audio per language, or null when the state is silent. */
  audio: Record<Lang, string> | null
  /**
   * True while the audio is a machine voice not yet recorded or checked by a native speaker.
   * The UI must say so (SPEC 10). When a file is missing or fails to play, the UI falls back to
   * the browser's speech synthesis with the text from the string table.
   */
  machineVoice: Record<Lang, boolean>
}

const base = import.meta.env.BASE_URL ?? '/'
const audio = (key: string): Record<Lang, string> => ({
  en: `${base}audio/en/${key}.mp3`,
  am: `${base}audio/am/${key}.mp3`,
})
// Placeholder voices from Meta MMS-TTS (CC BY-NC 4.0), see docs/assets.md.
const MACHINE: Record<Lang, boolean> = { en: true, am: true }

export const PHRASES: Record<StateId, Phrase> = {
  normal: { state: 'normal', textKey: null, audio: null, machineVoice: { en: false, am: false } },
  water: { state: 'water', textKey: 'tag.phrase.water', audio: audio('water'), machineVoice: MACHINE },
  check: { state: 'check', textKey: 'tag.phrase.check', audio: audio('check'), machineVoice: MACHINE },
  urgent: { state: 'urgent', textKey: 'tag.phrase.urgent', audio: audio('urgent'), machineVoice: MACHINE },
  not_sure: {
    state: 'not_sure',
    textKey: 'tag.phrase.not_sure',
    audio: audio('not_sure'),
    machineVoice: MACHINE,
  },
}

export function phraseFor(state: StateId): Phrase {
  return PHRASES[state]
}

/** URL of the phrase audio for a state and language, or null when the tag stays silent. */
export function phraseAudioUrl(state: StateId, lang: Lang): string | null {
  return PHRASES[state].audio?.[lang] ?? null
}

/** True when the phrase for this state and language is a machine voice that needs a check. */
export function isMachineVoice(state: StateId, lang: Lang): boolean {
  return PHRASES[state].machineVoice[lang]
}

/** Key for the "machine voice, needs a native speaker check" label. */
export const MACHINE_VOICE_KEY = 'tag.voice.machine'
