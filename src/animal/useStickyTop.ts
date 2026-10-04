import { useLayoutEffect, useRef } from 'react'

/**
 * A sticky column that may be taller than the window. Short columns stick under the top bar.
 * A tall column scrolls with the page until its bottom is in view and then stays, so nothing in
 * it is ever out of reach and there is no second scroll bar. Sets --sticky-top on the element.
 */
export function useStickyTop<T extends HTMLElement>(offset: number, bottomGap: number) {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const top = Math.min(offset, window.innerHeight - el.offsetHeight - bottomGap)
      el.style.setProperty('--sticky-top', `${Math.round(top)}px`)
    }
    update()
    window.addEventListener('resize', update)
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    ro?.observe(el)
    return () => {
      window.removeEventListener('resize', update)
      ro?.disconnect()
    }
  }, [offset, bottomGap])
  return ref
}
