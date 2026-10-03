// Dot-matrix number (DESIGN 5). Only at 40 px or larger, only the one main number per card.
// The dots are drawn for sighted readers. The real value is visually hidden text for screen readers.

const GLYPHS: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '-': ['000', '000', '000', '111', '000', '000', '000'],
  '.': ['0', '0', '0', '0', '0', '0', '1'],
  ':': ['0', '0', '1', '0', '0', '1', '0'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  ' ': ['00', '00', '00', '00', '00', '00', '00'],
}

export interface DotNumberProps {
  /** The number as it should read, already formatted, e.g. "7.4". */
  value: string | number
  /** Height in px. At least 40 (smaller values are raised to 40). Default 48. */
  height?: number
  /** Text for screen readers. Defaults to the value. */
  label?: string
  className?: string
}

export function DotNumber({ value, height = 48, label, className }: DotNumberProps) {
  const text = String(value)
  const h = Math.max(40, height)
  const pitch = h / 7
  const r = pitch * 0.43
  const lit: [number, number][] = []
  const ghost: [number, number][] = []
  let col = 0
  for (const ch of text) {
    const g = GLYPHS[ch] ?? GLYPHS[' ']
    const w = g[0].length
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < w; x++) {
        const p: [number, number] = [col + x, y]
        if (g[y][x] === '1') lit.push(p)
        else ghost.push(p)
      }
    }
    col += w + 1
  }
  const cols = Math.max(1, col - 1)
  const width = cols * pitch
  const at = (n: number) => (n * pitch + pitch / 2).toFixed(1)
  return (
    <span className={['ui-dotnumber', className].filter(Boolean).join(' ')}>
      <svg width={width} height={h} viewBox={`0 0 ${width.toFixed(1)} ${h.toFixed(1)}`} aria-hidden="true" focusable="false">
        <g fill="currentColor" opacity={0.1}>
          {ghost.map(([x, y]) => (
            <circle key={`g${x}-${y}`} cx={at(x)} cy={at(y)} r={(pitch * 0.3).toFixed(2)} />
          ))}
        </g>
        <g fill="currentColor">
          {lit.map(([x, y]) => (
            <circle key={`l${x}-${y}`} cx={at(x)} cy={at(y)} r={r.toFixed(2)} />
          ))}
        </g>
      </svg>
      <span className="visually-hidden">{label ?? text}</span>
    </span>
  )
}
