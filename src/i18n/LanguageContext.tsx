import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { t as translate, type Lang } from './index'

interface LanguageValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageValue>({
  lang: 'en',
  setLang: () => {},
  t: (key, params) => translate(key, params, 'en'),
})

function readStoredLang(): Lang {
  try {
    const v = localStorage.getItem('lang')
    return v === 'am' ? 'am' : 'en'
  } catch {
    return 'en'
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang)
  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem('lang', next)
    } catch {
      // Storage can be blocked. The choice then lasts for this visit only.
    }
  }, [])
  const value = useMemo<LanguageValue>(
    () => ({ lang, setLang, t: (key, params) => translate(key, params, lang) }),
    [lang, setLang],
  )
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useT() {
  return useContext(LanguageContext)
}
