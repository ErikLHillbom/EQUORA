import { expect, test, type Page } from '@playwright/test'

// Herd home and Statistics at 360 px and on a computer (1440 x 900): no sideways scroll, big touch
// targets, screenshots in colour and greyscale so every state can be checked by shape and word.

/** Interactive elements smaller than 48 x 48 px. */
async function smallTargets(page: Page) {
  return page.evaluate(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    return els
      .filter((el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed')
      .map((el) => {
        const r = el.getBoundingClientRect()
        return { text: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) }
      })
      .filter((r) => r.w < 48 || r.h < 48)
  })
}

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  // Give the 3D scene a moment when there is one; the page must not depend on it.
  if ((await page.locator('.herd-figure canvas').count()) > 0) {
    await page
      .locator('.herd-figure [data-ready="true"]')
      .waitFor({ timeout: 8_000 })
      .catch(() => undefined)
  }
}

test.describe('herd home', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Equora', level: 1 })).toBeVisible({ timeout: 30_000 })
  })

  test('answers who to visit first', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Visit first' })).toBeVisible()
    const go = page.getByRole('link', { name: /^Go to / })
    await expect(go).toBeVisible()
    await expect(go).toHaveAttribute('href', /^\/animal\//)
    await expect(page.getByText('Simulated data').first()).toBeVisible()
  })

  test('has a card for every animal and one Visit first tab', async ({ page }) => {
    await expect(page.locator('.herd-cards > li')).toHaveCount(12)
    await expect(page.locator('.herd-cards a.acard[href^="/animal/"]')).toHaveCount(12)
    // Every card has the footer of the mockup: activity, doing, updated.
    await expect(page.locator('.herd-cards .acard__foot dt')).toHaveCount(36)
    const tab = page.locator('.herd-cards .acard__tab')
    await expect(tab).toHaveCount(1)
    await expect(tab).toHaveText('Visit first')
    // The tab sits on the first card, and that card needs attention.
    const first = page.locator('.herd-cards > li').first().locator('a.acard')
    await expect(first.locator('.acard__tab')).toHaveCount(1)
    await expect(first).not.toHaveAttribute('data-state', 'normal')
    // A normal card has no coloured edge.
    for (const card of await page.locator('a.acard[data-state="normal"]').all()) {
      expect(await card.evaluate((el) => getComputedStyle(el).borderLeftWidth)).toBe('1px')
    }
  })

  test('a count filters the list', async ({ page }) => {
    await page.locator('a.herd-count[data-state="normal"]').click()
    await expect(page).toHaveURL(/state=normal/)
    const n = await page.locator('a.herd-count[data-state="normal"] .herd-count__n').textContent()
    await expect(page.locator('.herd-cards > li')).toHaveCount(Number(n))
    await page.getByRole('button', { name: 'Show all animals' }).click()
    await expect(page.locator('.herd-cards > li')).toHaveCount(12)
  })

  test('works without WebGL', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 } })
    await context.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === 'webgl2' || type === 'webgl') return null
        return (orig as (...a: unknown[]) => unknown).call(this, type, ...rest)
      } as typeof orig
    })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.locator('img.herd-figure__still')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('.herd-figure canvas')).toHaveCount(0)
    await context.close()
  })

  test('nothing overflows at 360 px and targets are 48 px', async ({ page }) => {
    await settle(page)
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    expect(await smallTargets(page)).toEqual([])
  })

  test('screenshots', async ({ page }) => {
    await settle(page)
    await page.screenshot({ path: 'e2e/screenshots/herd-360.png', fullPage: true })
    await page.screenshot({ path: 'e2e/screenshots/herd-360-top.png' })
    await page.locator('#herd-animals').scrollIntoViewIfNeeded()
    await page.evaluate(() => document.getElementById('herd-animals')?.scrollIntoView())
    await page.screenshot({ path: 'e2e/screenshots/herd-360-list.png' })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.addStyleTag({ content: 'html { filter: grayscale(1); }' })
    await page.screenshot({ path: 'e2e/screenshots/herd-360-grey.png', fullPage: true })
  })
})

test.describe('on a computer', () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })

  test('herd home: two-column visit first band, three card columns', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Equora', level: 1 })).toBeVisible({ timeout: 30_000 })
    await settle(page)
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    expect(await smallTargets(page)).toEqual([])
    // The drawing and the text of the Visit first band sit side by side.
    const fig = await page.locator('.herd-figure').boundingBox()
    const text = await page.locator('.herd-first__text').boundingBox()
    expect(fig && text && fig.x + fig.width <= text.x + 1 && Math.abs(fig.y - text.y) < 2).toBe(true)
    // Three cards per row, 32 px apart.
    const xs = await page.locator('.herd-cards > li').evaluateAll((els) => els.slice(0, 4).map((el) => Math.round(el.getBoundingClientRect().x)))
    expect(new Set(xs.slice(0, 3)).size).toBe(3)
    expect(xs[3]).toBe(xs[0])
    expect(await page.locator('.herd-cards').evaluate((el) => getComputedStyle(el).columnGap)).toBe('32px')
    // The drawing on a card is about 200 px wide.
    const w = await page.locator('.acard__figure').first().evaluate((el) => el.getBoundingClientRect().width)
    expect(w).toBeGreaterThan(150)
    expect(w).toBeLessThanOrEqual(200)

    await page.screenshot({ path: 'e2e/screenshots/herd-1440.png' })
    await page.screenshot({ path: 'e2e/screenshots/herd-1440-full.png', fullPage: true })
    await page.locator('#herd-animals').evaluate((el) => el.scrollIntoView())
    await page.screenshot({ path: 'e2e/screenshots/herd-1440-cards.png' })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.addStyleTag({ content: 'html { filter: grayscale(1); }' })
    await page.screenshot({ path: 'e2e/screenshots/herd-1440-grey.png', fullPage: true })
  })

  test('statistics: the whole ledger without scrolling, insights beside the top list', async ({ page }) => {
    await page.goto('/stats')
    await expect(page.getByRole('heading', { name: 'Statistics', level: 1 })).toBeVisible({ timeout: 30_000 })
    await page.evaluate(() => document.fonts.ready)
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    expect(await smallTargets(page)).toEqual([])
    const scroll = await page.locator('.stats-scroll').evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(scroll).toBeLessThanOrEqual(0)
    await expect(page.locator('.stats-scrollhint')).toBeHidden()
    const a = await page.locator('#stats-insights-h').boundingBox()
    const b = await page.locator('#stats-top-h').boundingBox()
    expect(a && b && Math.abs(a.y - b.y) < 2 && b.x > a.x).toBe(true)

    await page.screenshot({ path: 'e2e/screenshots/stats-1440.png' })
    await page.screenshot({ path: 'e2e/screenshots/stats-1440-full.png', fullPage: true })
    await page.addStyleTag({ content: 'html { filter: grayscale(1); }' })
    await page.screenshot({ path: 'e2e/screenshots/stats-1440-grey.png', fullPage: true })
  })
})

test.describe('statistics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/stats')
    await expect(page.getByRole('heading', { name: 'Statistics', level: 1 })).toBeVisible({ timeout: 30_000 })
    await page.evaluate(() => document.fonts.ready)
  })

  test('ledger has a row per animal and computed insights', async ({ page }) => {
    await expect(page.locator('.stats-ledger tbody tr')).toHaveCount(12)
    await expect(page.locator('.stats-insights li')).not.toHaveCount(0)
    await expect(page.getByText('Simulated data').first()).toBeVisible()
  })

  test('nothing overflows at 360 px and targets are 48 px', async ({ page }) => {
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    expect(await smallTargets(page)).toEqual([])
  })

  test('screenshots', async ({ page }) => {
    await page.screenshot({ path: 'e2e/screenshots/stats-360.png', fullPage: true })
    await page.screenshot({ path: 'e2e/screenshots/stats-360-top.png' })
    await page.addStyleTag({ content: 'html { filter: grayscale(1); }' })
    await page.screenshot({ path: 'e2e/screenshots/stats-360-grey.png', fullPage: true })
  })
})
