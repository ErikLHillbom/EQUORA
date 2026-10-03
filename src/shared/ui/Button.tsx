// Buttons: at least 48 px tall, always-visible focus ring. One primary per screen.
import type { ButtonHTMLAttributes } from 'react'
import { buttonClass, type ButtonVariant } from './helpers'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary: ink fill, one per screen. secondary: ink outline. tertiary: underlined text. */
  variant?: ButtonVariant
  /** Full width. */
  block?: boolean
}

export function Button({ variant = 'secondary', block = false, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={[buttonClass(variant, block), className].filter(Boolean).join(' ')} {...rest} />
}

export interface RoundButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Accessible name, e.g. t('shared.play'). */
  label: string
  icon?: 'play' | 'pause' | 'stop'
  /** Diameter in px, at least 56. Default 64. */
  size?: number
}

function Icon({ icon }: { icon: 'play' | 'pause' | 'stop' }) {
  if (icon === 'pause')
    return (
      <>
        <rect x="7" y="5" width="4" height="14" rx="1" />
        <rect x="13" y="5" width="4" height="14" rx="1" />
      </>
    )
  if (icon === 'stop') return <rect x="6" y="6" width="12" height="12" rx="1.5" />
  return <path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2Z" />
}

/** The solid round ink button, for play on the Tag screen. */
export function RoundButton({ label, icon = 'play', size = 64, className, type = 'button', style, ...rest }: RoundButtonProps) {
  const d = Math.max(56, size)
  return (
    <button
      type={type}
      aria-label={label}
      className={['ui-roundbutton', className].filter(Boolean).join(' ')}
      style={{ width: d, height: d, ...style }}
      {...rest}
    >
      <svg viewBox="0 0 24 24" width={d * 0.42} height={d * 0.42} fill="currentColor" aria-hidden="true" focusable="false">
        <Icon icon={icon} />
      </svg>
    </button>
  )
}
