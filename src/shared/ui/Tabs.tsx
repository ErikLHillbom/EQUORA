// Mono tabs (range switch: today, 7 days, 30 days, 6 months). Accessible tablist with arrow keys.
import { useRef, type KeyboardEvent } from 'react'

export interface TabItem {
  id: string
  label: string
}

export interface TabsProps {
  /** Accessible name of the tab list, e.g. "Time range". */
  label: string
  items: readonly TabItem[]
  /** Selected item id. */
  value: string
  onChange: (id: string) => void
  /** id of the panel these tabs control (aria-controls). */
  controls?: string
  /** Prefix for tab element ids, so a panel can use aria-labelledby={`${idPrefix}-${value}`}. */
  idPrefix?: string
  className?: string
}

export function Tabs({ label, items, value, onChange, controls, idPrefix = 'tab', className }: TabsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = items.findIndex((it) => it.id === value)
    let next = -1
    if (e.key === 'ArrowRight') next = (i + 1) % items.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    if (next < 0) return
    e.preventDefault()
    onChange(items[next].id)
    refs.current[next]?.focus()
  }
  return (
    <div role="tablist" aria-label={label} className={['ui-tabs', className].filter(Boolean).join(' ')} onKeyDown={onKeyDown}>
      {items.map((it, i) => {
        const selected = it.id === value
        return (
          <button
            key={it.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            id={`${idPrefix}-${it.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={controls}
            tabIndex={selected ? 0 : -1}
            className="ui-tab"
            onClick={() => onChange(it.id)}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
