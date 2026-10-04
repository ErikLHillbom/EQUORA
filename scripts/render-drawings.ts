// Renders the pencil drawings in public/models3d/stills/ from our own 3D models.
//
// 1. Starts the Vite dev server with one extra page that shows HorseScene (src/landing/HorseScene.tsx)
//    for a species and pose in a 720 by 540 box. HorseScene draws at 2x, so the canvas is
//    1440 by 1080 px.
// 2. Opens it in headless Chromium (Playwright), with SwiftShader WebGL, and waits until the scene
//    says it is ready.
// 3. Takes the canvas at 2x with a transparent background and scales it down to 720 by 540 in the
//    browser.
// 4. Snaps every pixel to one of the two drawing colours (ink or graphite) and its opacity to a
//    few steps, then saves WebP with transparency. The opacity is stored losslessly, so fewer steps
//    is what makes the file small. Starts at 16 steps and takes fewer until the file is under 40 KB.
//
// Usage: npx tsx scripts/render-drawings.ts [--only horse-lying,donkey-walking] [--preview dir]
// With --preview, it also writes each saved drawing as PNG on paper at full size and at 200 px
// wide, for looking at. Needs Chromium for Playwright: npx playwright install chromium.
// Port: E2E_PORT, default 5531.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium, type Page } from '@playwright/test'
import { createServer, type Plugin } from 'vite'

const SPECIES = ['horse', 'donkey'] as const
const POSES = ['standing', 'walking', 'trotting', 'grazing', 'lying'] as const
const WIDTH = 720
const HEIGHT = 540
const PORT = Number(process.env.E2E_PORT ?? 5531)
const MAX_BYTES = 40 * 1024
const STEPS = [16, 12, 10, 8, 6]
const OUT = join(process.cwd(), 'public', 'models3d', 'stills')
const PAPER = '#F5F0E6'
const INK = [0x1f, 0x1c, 0x17]
const GRAPHITE = [0x57, 0x52, 0x4a]

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const ENTRY_ID = 'virtual:render-drawings-entry'

// The page: HorseScene alone in a fixed box, on a transparent page. StrictMode as in the app.
const ENTRY = `
import { createElement as h, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import HorseScene from '/src/landing/HorseScene.tsx'
const q = new URLSearchParams(location.search)
const box = { width: '${WIDTH}px', height: '${HEIGHT}px' }
createRoot(document.getElementById('root')).render(
  h(StrictMode, null, h('div', { id: 'box', style: box }, h(HorseScene, { species: q.get('species'), pose: q.get('pose'), label: '' }))),
)
`

const HTML = `<!doctype html>
<html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent}</style></head>
<body><div id="root"></div><script type="module" src="/@id/${ENTRY_ID}"></script></body></html>`

function harness(): Plugin {
  return {
    name: 'render-drawings-harness',
    resolveId(id) {
      return id === ENTRY_ID ? `\0${ENTRY_ID}` : undefined
    },
    load(id) {
      return id === `\0${ENTRY_ID}` ? ENTRY : undefined
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/__render')) return next()
        const html = await server.transformIndexHtml(req.url, HTML)
        res.setHeader('Content-Type', 'text/html')
        res.end(html)
      })
    },
  }
}

interface EncodeOptions {
  /** data: URL of the source image. */
  src: string
  type: 'image/webp' | 'image/png'
  width: number
  /** Opacity steps; 0 keeps the pixels as they are. */
  steps: number
  /** Draw on paper instead of transparent (previews only). */
  paper: boolean
}

/** Scales an image down in the browser, snaps its colours if asked, and encodes it. */
async function encode(page: Page, options: EncodeOptions): Promise<Buffer> {
  const dataUrl = await page.evaluate(
    async ({ src, type, width, steps, paper, paperColour, ink, graphite }) => {
      const img = new Image()
      img.src = src
      await img.decode()
      const height = Math.round((width * img.height) / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      if (paper) {
        ctx.fillStyle = paperColour
        ctx.fillRect(0, 0, width, height)
      }
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)
      if (steps > 0) {
        const data = ctx.getImageData(0, 0, width, height)
        const p = data.data
        for (let i = 0; i < p.length; i += 4) {
          const a = Math.round((p[i + 3] / 255) * (steps - 1)) / (steps - 1)
          // Darker than halfway between graphite and ink is ink.
          const l = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]
          const c = a === 0 ? [0, 0, 0] : l < 56 ? ink : graphite
          p[i] = c[0]
          p[i + 1] = c[1]
          p[i + 2] = c[2]
          p[i + 3] = Math.round(a * 255)
        }
        ctx.putImageData(data, 0, 0)
      }
      return canvas.toDataURL(type, 0.8)
    },
    { ...options, paperColour: PAPER, ink: INK, graphite: GRAPHITE },
  )
  return Buffer.from(dataUrl.split(',')[1], 'base64')
}

async function main() {
  const only = arg('only')
  const preview = arg('preview')
  if (preview) mkdirSync(preview, { recursive: true })

  const server = await createServer({
    plugins: [harness()],
    server: { port: PORT, strictPort: true },
    logLevel: 'warn',
  })
  await server.listen()
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  })
  const context = await browser.newContext({
    viewport: { width: WIDTH + 40, height: HEIGHT + 40 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`  browser error: ${m.text()}`)
  })
  page.on('pageerror', (e) => console.log(`  page error: ${e.message}`))

  let total = 0
  try {
    for (const species of SPECIES) {
      for (const pose of POSES) {
        const name = `${species}-${pose}`
        if (only && !only.split(',').includes(name)) continue
        await page.goto(`http://localhost:${PORT}/__render?species=${species}&pose=${pose}`)
        await page.locator('[data-ready="true"]').waitFor({ timeout: 60_000 })
        // Two more frames, so the shown frame is the settled pose.
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
        const png = await page.locator('#box canvas').screenshot({ omitBackground: true })
        const src = `data:image/png;base64,${png.toString('base64')}`

        let webp: Buffer = Buffer.alloc(0)
        let steps = 0
        for (steps of STEPS) {
          webp = await encode(page, { src, type: 'image/webp', width: WIDTH, steps, paper: false })
          if (webp.length <= MAX_BYTES) break
        }
        writeFileSync(join(OUT, `${name}.webp`), webp)
        total += webp.length
        console.log(`${name}.webp  ${webp.length} B  ${steps} opacity steps`)

        if (preview) {
          const saved = `data:image/webp;base64,${webp.toString('base64')}`
          writeFileSync(join(preview, `${name}.png`), await encode(page, { src: saved, type: 'image/png', width: WIDTH, steps: 0, paper: true }))
          writeFileSync(join(preview, `${name}-200.png`), await encode(page, { src: saved, type: 'image/png', width: 200, steps: 0, paper: true }))
        }
      }
    }
    console.log(`total ${total} B`)
  } finally {
    await browser.close()
    await server.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
