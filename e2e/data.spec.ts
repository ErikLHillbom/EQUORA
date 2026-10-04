import { expect, test, type Page } from '@playwright/test'

// About the data and Why it matters: no sideways scroll at 360 px, model figures read from
// metrics.json, and screenshots in colour and greyscale for review.

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

async function shoot(page: Page, name: string) {
  await page.screenshot({ path: `e2e/screenshots/${name}-360.png`, fullPage: true })
  await page.addStyleTag({ content: 'html { filter: grayscale(1); }' })
  await page.screenshot({ path: `e2e/screenshots/${name}-360-grey.png`, fullPage: true })
}

test.describe('about the data', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/data')
    await expect(page.getByRole('heading', { name: 'About the data', level: 1 })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('metric-accuracy')).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
  })

  test('nothing overflows at 360 px', async ({ page }) => {
    await noOverflow(page)
  })

  test('the accuracy on screen is the one in metrics.json', async ({ page, request }) => {
    const metrics = await (await request.get('/models/metrics.json')).json()
    await expect(page.getByTestId('metric-accuracy')).toHaveText(`${(metrics.accuracy * 100).toFixed(1)}%`)
    await expect(page.getByTestId('metric-f1')).toHaveText(metrics.macroF1.toFixed(3))
    await expect(page.getByTestId('baseline-accuracy')).toHaveText(`${(metrics.baseline.accuracy * 100).toFixed(1)}%`)
  })

  test('the honesty slip lists the gaps', async ({ page }) => {
    const slip = page.locator('#data-gaps')
    await expect(slip.getByRole('heading', { name: 'What our data does not cover' })).toBeVisible()
    await expect(slip.getByText('No sensor data from any animal with colic', { exact: false })).toBeVisible()
    await slip.scrollIntoViewIfNeeded()
    await slip.screenshot({ path: 'e2e/screenshots/data-gaps-360.png' })
  })

  test('screenshots', async ({ page }) => {
    await shoot(page, 'data')
  })
})

test.describe('why it matters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/why')
    await expect(page.getByRole('heading', { name: 'Why it matters', level: 1 })).toBeVisible({ timeout: 30_000 })
    await page.evaluate(() => document.fonts.ready)
  })

  test('nothing overflows at 360 px', async ({ page }) => {
    await noOverflow(page)
  })

  test('ends with a way to the herd and the tag', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'See the herd' })).toHaveAttribute('href', '/')
    await expect(page.getByRole('link', { name: 'Try the tag' })).toHaveAttribute('href', '/tag')
  })

  test('screenshots', async ({ page }) => {
    await shoot(page, 'why')
  })
})

// Computers (1440 x 900): the datasheet uses the width, prose stays at a reading measure.
test.describe('on a computer', () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })

  async function shootWide(page: Page, name: string) {
    await page.screenshot({ path: `e2e/screenshots/${name}-desktop.png` })
    await page.screenshot({ path: `e2e/screenshots/${name}-desktop-full.png`, fullPage: true })
    await page.addStyleTag({ content: 'html { filter: grayscale(1); }' })
    await page.screenshot({ path: `e2e/screenshots/${name}-desktop-full-grey.png`, fullPage: true })
  }

  /** Widest line of running text in px, so no sentence runs much past 75 characters. */
  async function widestProse(page: Page, selector: string) {
    return page.locator(selector).evaluateAll((els) => Math.max(...els.map((e) => e.getBoundingClientRect().width)))
  }

  test('about the data: two-column model section and the gaps in two columns', async ({ page }) => {
    await page.goto('/data')
    await expect(page.getByTestId('metric-accuracy')).toBeVisible({ timeout: 30_000 })
    await page.evaluate(() => document.fonts.ready)
    await noOverflow(page)
    // The model numbers sit on the left, the baseline and confusion matrix on the right.
    const spec = await page.locator('.ds-spec').boundingBox()
    const confusion = await page.locator('.ds-confusion').boundingBox()
    const baseline = await page.getByTestId('baseline-accuracy').boundingBox()
    expect(confusion!.x).toBeGreaterThan(spec!.x + spec!.width)
    expect(baseline!.x).toBeGreaterThan(spec!.x + spec!.width)
    // The ten gaps fill two columns on the kraft slip.
    const gaps = page.locator('.ds-gap')
    await expect(gaps).toHaveCount(10)
    // The slip is turned a little, so each column's x drifts by a few px.
    const xs = await gaps.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().x))
    const mid = (Math.min(...xs) + Math.max(...xs)) / 2
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(400)
    expect(xs.filter((x) => x < mid)).toHaveLength(5)
    // Sentences stay at a reading width.
    expect(await widestProse(page, '.ds-intro, .ds-lead, .ds-trio__part > p')).toBeLessThanOrEqual(760)
    const slip = page.locator('#data-gaps')
    await slip.scrollIntoViewIfNeeded()
    await slip.screenshot({ path: 'e2e/screenshots/data-gaps-desktop.png' })
    await page.evaluate(() => window.scrollTo(0, 0))
    await shootWide(page, 'data')
  })

  test('why it matters: reading width with figures in the margin', async ({ page }) => {
    await page.goto('/why')
    await expect(page.getByRole('heading', { name: 'Why it matters', level: 1 })).toBeVisible({ timeout: 30_000 })
    await page.evaluate(() => document.fonts.ready)
    await noOverflow(page)
    // Each figure sits in the margin, left of its sentence.
    const fact = page.locator('.why-fact').first()
    const margin = await fact.locator('.why-fact__margin').boundingBox()
    const text = await fact.locator('.why-fact__text').boundingBox()
    expect(margin!.x + margin!.width).toBeLessThan(text!.x)
    await expect(fact.locator('.why-fact__fig')).toHaveText('About USD 567')
    expect(await widestProse(page, '.why-fact__text, .why-list li')).toBeLessThanOrEqual(760)
    // The drawing is large on a computer.
    const drawing = await page.locator('.why-figure__drawing').boundingBox()
    expect(drawing!.width).toBeGreaterThanOrEqual(400)
    await expect(page.getByRole('link', { name: 'See the herd' })).toHaveAttribute('href', '/')
    await shootWide(page, 'why')
  })
})
