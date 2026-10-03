// Shared ink wear for stamps (DESIGN 6, 8): a rough edge and a few voids, seeded by an id.
// The mask touches the border and the fill only. Words are HTML text outside the masked group.
// Under prefers-contrast: more, CSS removes the filter and mask (.ui-wear).
import { noiseSeed } from './geometry'

/** Threshold for the void mask. alpha = K * noise - B, so voids appear where noise < B / K. */
const VOID_K = 14
const VOID_B = 5.2

export interface WearDefsProps {
  /** Unique, url-safe id prefix for this SVG. */
  uid: string
  /** Seed text, usually the animal id. Same seed, same wear. */
  seed: string
  /** Noise frequency of the voids in user units. Bigger means smaller voids. */
  voidFrequency?: number
  /** Noise frequency of the rough edge. */
  roughFrequency?: number
  /** Displacement of the rough edge in user units. */
  roughScale?: number
  /** Mask and filter region, in user units. */
  region?: { x: number | string; y: number | string; width: number | string; height: number | string }
}

export function WearDefs({
  uid,
  seed,
  voidFrequency = 0.09,
  roughFrequency = 0.55,
  roughScale = 2,
  region = { x: -10, y: -10, width: 120, height: 120 },
}: WearDefsProps) {
  const s = noiseSeed(seed)
  return (
    <defs>
      <filter id={`${uid}-rough`} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency={roughFrequency} numOctaves={2} seed={s} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={roughScale} xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter
        id={`${uid}-voids`}
        filterUnits="userSpaceOnUse"
        x={region.x}
        y={region.y}
        width={region.width}
        height={region.height}
      >
        <feTurbulence type="fractalNoise" baseFrequency={voidFrequency} numOctaves={3} seed={s + 11} />
        <feColorMatrix type="matrix" values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${VOID_K} 0 0 0 -${VOID_B}`} />
      </filter>
      <mask
        id={`${uid}-wear`}
        maskUnits="userSpaceOnUse"
        x={region.x}
        y={region.y}
        width={region.width}
        height={region.height}
      >
        <rect
          x={region.x}
          y={region.y}
          width={region.width}
          height={region.height}
          fill="#fff"
          filter={`url(#${uid}-voids)`}
        />
      </mask>
    </defs>
  )
}
