// The app mark: a small square ink stamp. Square so it never reads as a state shape.
import { useId } from 'react'
import { safeId } from '../shared/ui/geometry'
import { wearProps } from '../shared/ui/helpers'
import { WearDefs } from '../shared/ui/Wear'

export function AppMark({ size = 34 }: { size?: number }) {
  const uid = `mk${safeId(useId())}`
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false" className="app-mark">
      <WearDefs uid={uid} seed="equid-sentinel" voidFrequency={0.12} roughScale={2.5} />
      <g transform="rotate(-2 50 50)">
        <g {...wearProps(uid)}>
          <rect x="6" y="6" width="88" height="88" rx="10" fill="none" stroke="var(--ink)" strokeWidth="9" />
          <rect x="19" y="19" width="62" height="62" rx="4" fill="none" stroke="var(--ink)" strokeWidth="2.5" />
        </g>
      </g>
      <text
        x="50"
        y="51"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--ink)"
        fontFamily="var(--font-mono)"
        fontWeight="600"
        fontSize="34"
        letterSpacing="1"
      >
        ES
      </text>
    </svg>
  )
}
