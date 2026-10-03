// Placeholder screens for routes owned by other domains. Each domain replaces its own
// lazy import in src/app/routes.tsx with its real screen.
import { useT } from '../i18n/LanguageContext'
import { HeaderStrip, Paper } from '../shared/ui'

function Placeholder({ titleKey }: { titleKey: string }) {
  const { t } = useT()
  return (
    <Paper>
      <HeaderStrip title={t(titleKey)} id={titleKey} />
    </Paper>
  )
}

export function HerdPlaceholder() {
  return <Placeholder titleKey="shared.screen.herd" />
}

export function MapPlaceholder() {
  return <Placeholder titleKey="shared.screen.map" />
}

export function AnimalPlaceholder() {
  return <Placeholder titleKey="shared.screen.animal" />
}

export function TagPlaceholder() {
  return <Placeholder titleKey="shared.screen.tag" />
}

export function StatsPlaceholder() {
  return <Placeholder titleKey="shared.screen.stats" />
}

export function DataPlaceholder() {
  return <Placeholder titleKey="shared.screen.data" />
}

export function WhyPlaceholder() {
  return <Placeholder titleKey="shared.screen.why" />
}
