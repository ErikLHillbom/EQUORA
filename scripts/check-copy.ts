// Searches strings and docs for em dashes and banned words (SPEC 9).
// Usage: npm run check-copy
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

export const BANNED_WORDS = [
  'delve', 'tapestry', 'testament', 'landscape', 'realm', 'journey', 'intricate', 'nuanced',
  'meticulous', 'pivotal', 'crucial', 'vital', 'robust', 'seamless', 'seamlessly', 'leverage',
  'harness', 'empower', 'unlock', 'elevate', 'enhance', 'foster', 'bolster', 'garner',
  'underscore', 'showcase', 'streamline', 'holistic', 'synergy', 'paradigm', 'transformative',
  'revolutionize', 'game-changer', 'cutting-edge', 'state-of-the-art', 'groundbreaking',
  'innovative', 'vibrant', 'profound', 'comprehensive', 'ever-evolving', 'additionally',
  'furthermore', 'moreover', 'notably', 'importantly',
]

const BANNED_PHRASES = ["it's important to note", 'in summary', 'in conclusion', 'not just']

export interface Finding {
  file: string
  line: number
  problem: string
}

export function checkText(text: string, file = ''): Finding[] {
  const findings: Finding[] = []
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    const lower = line.toLowerCase()
    if (line.includes('—')) findings.push({ file, line: i + 1, problem: 'em dash' })
    for (const word of BANNED_WORDS) {
      const re = new RegExp(`(^|[^a-z-])${word.replace(/-/g, '\\-')}([^a-z-]|$)`)
      if (re.test(lower)) findings.push({ file, line: i + 1, problem: `banned word "${word}"` })
    }
    for (const phrase of BANNED_PHRASES) {
      if (lower.includes(phrase)) findings.push({ file, line: i + 1, problem: `banned phrase "${phrase}"` })
    }
  })
  return findings
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else out.push(path)
  }
  return out
}

// SPEC.md section 9 and this script list the banned words on purpose, so they are skipped.
const SKIP = new Set(['docs/SPEC.md', 'docs/DESIGN.md'])

function main() {
  const root = process.cwd()
  const files = [
    ...walk(join(root, 'src')).filter((f) => /strings\.ts$/.test(f)),
    ...walk(join(root, 'docs')).filter((f) => f.endsWith('.md')),
    join(root, 'README.md'),
  ].filter((f) => {
    try {
      statSync(f)
    } catch {
      return false
    }
    return !SKIP.has(relative(root, f).replace(/\\/g, '/'))
  })
  const findings = files.flatMap((f) => checkText(readFileSync(f, 'utf8'), relative(root, f)))
  for (const f of findings) console.log(`${f.file}:${f.line}  ${f.problem}`)
  if (findings.length > 0) {
    console.log(`\n${findings.length} problem(s).`)
    process.exit(1)
  }
  console.log(`Checked ${files.length} files. No em dashes or banned words.`)
}

if (process.argv[1]?.endsWith('check-copy.ts')) main()
