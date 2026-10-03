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
