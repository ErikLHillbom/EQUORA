import { BrowserRouter, Link, Route, Routes } from 'react-router'
import { AppShell } from './app/AppShell'
import { ROUTES } from './app/routes'
import { LanguageProvider, useT } from './i18n/LanguageContext'
import { HeaderStrip, Paper, buttonClass } from './shared/ui'

function NotFound() {
  const { t } = useT()
  return (
    <Paper>
      <HeaderStrip title={t('shared.screen.notFound')} id="not-found" />
      <Link to="/" className={buttonClass('secondary')}>
        {t('shared.screen.backHome')}
      </Link>
    </Paper>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            {ROUTES.map(({ path, Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  )
}
