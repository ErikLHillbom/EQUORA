// Plays the tag's phrase for a state. Recorded audio first; if the file is missing or cannot play,
// the browser's own speech synthesis reads the same text. NORMAL says nothing.
import type { Lang } from '../i18n'
import type { StateId } from '../shared/types'
import { phraseAudioUrl } from './phrases'

let current: HTMLAudioElement | null = null

export function stopVoice(): void {
  current?.pause()
  current = null
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}

function speak(text: string, lang: Lang): void {
  if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang === 'am' ? 'am-ET' : 'en-GB'
  u.rate = 0.9
  speechSynthesis.speak(u)
}

/** Resolves when playback has started (or fallen back to speech). */
export async function playPhrase(state: StateId, lang: Lang, text: string): Promise<'audio' | 'speech' | 'silent'> {
  stopVoice()
  const url = phraseAudioUrl(state, lang)
  if (!url) return 'silent'
  try {
    const audio = new Audio(url)
    current = audio
    await audio.play()
    return 'audio'
  } catch {
    speak(text, lang)
    return 'speech'
  }
}
