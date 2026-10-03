import { STATES } from '../shared/types'
import { PHRASES, phraseAudioUrl } from './phrases'
import { strings } from './strings'

// Lazy glob: only the file names are read, nothing is loaded.
const audioFiles = new Set(
  Object.keys(import.meta.glob('../../public/audio/*/*.mp3')).map((k) => k.replace('../../public', '')),
)

describe('tag phrases', () => {
  it('has one phrase per state and NORMAL is silent', () => {
    expect(Object.keys(PHRASES).sort()).toEqual([...STATES].sort())
    expect(PHRASES.normal.textKey).toBeNull()
    expect(phraseAudioUrl('normal', 'en')).toBeNull()
  })

  it('has text in both languages and an audio file on disk for every spoken phrase', () => {
    for (const state of STATES) {
      const p = PHRASES[state]
      if (!p.textKey) continue
      expect(strings.en[p.textKey]).toBeTruthy()
      expect(strings.am?.[p.textKey]).toBeTruthy()
      for (const lang of ['en', 'am'] as const) {
        const url = phraseAudioUrl(state, lang)!
        expect(audioFiles.has(url), url).toBe(true)
      }
    }
  })

  it('keeps the SPEC 5 wording in English', () => {
    expect(strings.en['tag.phrase.urgent']).toBe('Stop work. Get help now.')
    expect(strings.en['tag.phrase.water']).toBe('Offer water and let it rest.')
  })
})
