// App shell: top bar with the mark and the language switch, the screen, and the nav.
// Phones get the pill bar at the bottom; computers get the same links in the top bar.
import { Suspense, useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import type { Lang } from '../i18n'
import { useT } from '../i18n/LanguageContext'
import { BottomNav } from '../shared/ui'
import { AppMark } from './AppMark'
import { NO_NAV_PATHS } from './routes'
import './app.css'

function LanguageSwitch() {
  const { lang, setLang, t } = useT()
  const options: { id: Lang; short: string; nameKey: string }[] = [
    { id: 'en', short: 'EN', nameKey: 'shared.lang.en' },
    { id: 'am', short: 'አማ', nameKey: 'shared.lang.am' },
  ]
  return (
    <div className="app-lang" role="group" aria-label={t('shared.lang.label')}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className="app-lang-option"
          aria-pressed={lang === o.id}
          aria-label={t(o.nameKey)}
          lang={o.id}
          onClick={() => setLang(o.id)}
        >
          {o.short}
        </button>
      ))}
    </div>
  )
}

/** Layout route. Renders the matched screen through <Outlet />. */
export function AppShell() {
  const { lang, t } = useT()
  const { pathname } = useLocation()
  const nav = !NO_NAV_PATHS.includes(pathname)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app">
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <Link to="/" className="app-home" aria-label={t('shared.app.home')}>
            <AppMark />
            <span className="app-name">Equora</span>
          </Link>
          {nav && <BottomNav placement="top" className="app-topnav" />}
          <LanguageSwitch />
        </div>
      </header>
      {lang === 'am' && <p className="app-machine-note">{t('shared.lang.machine')}</p>}
      <Suspense fallback={<div className="app-loading" />}>
        <Outlet />
      </Suspense>
      {nav && <BottomNav />}
    </div>
  )
}
