// String table. Every sentence the owner reads lives in a `strings.ts` file inside its domain
// folder and is collected here, so domains never edit one shared file.
//
// A domain's strings.ts looks like:
//   export const strings: StringTable = {
//     en: { 'alerts.check.activityDown': 'Activity {pct}% below {name}\'s normal.' },
//     am: { 'alerts.check.activityDown': '...' },
//   }
// Keys start with the domain name. Strings stay in sentence case (DESIGN 5).
// Placeholders use {name}. Missing Amharic falls back to English.

export type Lang = 'en' | 'am'
export const LANGS: readonly Lang[] = ['en', 'am']

export type StringTable = { en: Record<string, string>; am?: Record<string, string> }

const modules = import.meta.glob<{ strings: StringTable }>('../**/strings.ts', { eager: true })

const tables: Record<Lang, Record<string, string>> = { en: {}, am: {} }
for (const mod of Object.values(modules)) {
  Object.assign(tables.en, mod.strings.en)
  if (mod.strings.am) Object.assign(tables.am, mod.strings.am)
}

export function hasKey(key: string): boolean {
  return key in tables.en
}

export function t(key: string, params: Record<string, string | number> = {}, lang: Lang = 'en'): string {
  const template = tables[lang][key] ?? tables.en[key]
  if (template === undefined) {
    if (import.meta.env.DEV) console.warn(`Missing string: ${key}`)
    return key
  }
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] === undefined ? `{${name}}` : String(params[name]),
  )
}

/** True when the Amharic table has this key. Untranslated text shows in English. */
export function isTranslated(key: string, lang: Lang): boolean {
  return lang === 'en' || key in tables[lang]
}
