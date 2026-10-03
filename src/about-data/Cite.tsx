// An inline citation: "(Asteraye et al. 2026)" as a link to the source.
import { sourceById } from './sources'

export function Cite({ id, extra }: { id: string; extra?: string }) {
  const s = sourceById(id)
  return (
    <span className="cite">
      (
      <a href={s.url} target="_blank" rel="noreferrer">
        {s.short}
      </a>
      {extra ? `, ${extra}` : ''})
    </span>
  )
}
