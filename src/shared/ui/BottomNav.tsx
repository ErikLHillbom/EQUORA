// Pill-shaped bottom bar, mono labels, five items at most. Active item shown by a filled ink pill.
import { NavLink } from 'react-router'
import { useT } from '../../i18n/LanguageContext'
import { DEFAULT_NAV, type NavItem } from './helpers'

export interface BottomNavProps {
  items?: readonly NavItem[]
  /** bottom: the pill bar on phones. top: inline links in the desktop top bar. */
  placement?: 'bottom' | 'top'
  className?: string
}

export function BottomNav({ items = DEFAULT_NAV, placement = 'bottom', className }: BottomNavProps) {
  const { t } = useT()
  return (
    <nav
      className={[placement === 'top' ? 'ui-topnav' : 'ui-bottomnav', className].filter(Boolean).join(' ')}
      aria-label={t('shared.nav.label')}
    >
      <ul>
        {items.slice(0, 5).map((it) => (
          <li key={it.to}>
            <NavLink to={it.to} end={it.end} className={placement === 'top' ? 'ui-topnav-link' : 'ui-bottomnav-link'}>
              {t(it.labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
