import { expect, test, type Page } from '@playwright/test'

// The Map screen: offline paper map with 3D terrain, state stamps for the herd, and the tap panel.
// Headless Chromium needs SwiftShader for WebGL.
test.use({
  launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
})

async function waitForMap(page: Page) {
  await expect(page.locator('.map-canvas[data-status="ready"]')).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.map-canvas[data-idle="true"]')).toBeVisible({ timeout: 60_000 })
  await page.evaluate(() => document.fonts.ready)
  // Let the declutter pass after the last idle settle.
  await page.waitForTimeout(400)
}

test.describe('map screen', () => {
  test('nothing overflows at 360 px', async ({ page }) => {
    await page.goto('/map')
    await waitForMap(page)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('the urgent animal is selected on load and its panel opens', async ({ page }) => {
    await page.goto('/map')
    await waitForMap(page)
    const panel = page.locator('.map-panel')
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('heading', { name: 'Kito' })).toBeVisible()
    await expect(panel.getByText('Urgent', { exact: true })).toBeVisible()
    await expect(panel.getByRole('link', { name: 'Open case file' })).toHaveAttribute('href', '/animal/kito')
    await expect(page.getByRole('button', { name: 'Kito, Urgent' })).toHaveAttribute('aria-pressed', 'true')
    await page.screenshot({ path: 'e2e/screenshots/map-urgent-360.png' })
    await page.addStyleTag({ content: 'html { filter: grayscale(1); }' })
    await page.screenshot({ path: 'e2e/screenshots/map-urgent-360-grey.png' })
  })

  test('?animal=bari selects Bari', async ({ page }) => {
    await page.goto('/map?animal=bari')
    await waitForMap(page)
    const panel = page.locator('.map-panel')
    await expect(panel.getByRole('heading', { name: 'Bari' })).toBeVisible()
    await expect(panel.getByText('Check', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Bari, Check' })).toHaveAttribute('aria-pressed', 'true')
    await page.screenshot({ path: 'e2e/screenshots/map-bari-360.png' })
  })

  test('the whole herd, in colour and greyscale', async ({ page }) => {
    await page.goto('/map')
    await waitForMap(page)
    await page.getByRole('button', { name: 'Whole herd' }).click()
    await expect(page.locator('.map-panel')).toHaveCount(0)
    await waitForMap(page)
    // Every animal has a marker and every marker is a 48 px tap target.
    const sizes = await page.locator('.map-mk-btn').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))
    expect(sizes).toHaveLength(12)
    for (const h of sizes) expect(h).toBeGreaterThanOrEqual(48)
    await page.screenshot({ path: 'e2e/screenshots/map-herd-360.png' })
    await page.addStyleTag({ content: 'html { filter: grayscale(1); }' })
    await page.screenshot({ path: 'e2e/screenshots/map-herd-360-grey.png' })
    // Tapping a marker opens its slip.
    await page.getByRole('button', { name: 'Chaltu, Water' }).click()
    await expect(page.locator('.map-panel').getByRole('heading', { name: 'Chaltu' })).toBeVisible()
    await expect(page).toHaveURL(/animal=chaltu/)
  })

  test('tapping a marker opens its panel and the list selects too', async ({ page }) => {
    await page.goto('/map?animal=bari')
    await waitForMap(page)
    await page.getByRole('button', { name: 'Animal list' }).click()
    const list = page.locator('#map-list')
    await expect(list).toBeVisible()
    await expect(list.getByRole('button')).toHaveCount(12)
    await page.screenshot({ path: 'e2e/screenshots/map-list-360.png' })
    await list.getByRole('button', { name: /Chaltu/ }).click()
    await expect(page.locator('.map-panel').getByRole('heading', { name: 'Chaltu' })).toBeVisible()
    await expect(page).toHaveURL(/animal=chaltu/)
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.locator('.map-panel')).toHaveCount(0)
  })

  test('without the tile files the animal list still works', async ({ page }) => {
    await page.route('**/maps/*.pmtiles', (route) => route.fulfill({ status: 404, body: '' }))
    await page.goto('/map')
    await expect(page.getByText('Map tiles for this area are not saved on this phone.')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('heading', { name: 'Kito' })).toBeVisible()
    await page.getByRole('button', { name: /Bari/ }).click()
    await expect(page.getByRole('heading', { name: 'Bari' })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await page.screenshot({ path: 'e2e/screenshots/map-missing-360.png', fullPage: true })
  })

  test('leaving and coming back leaves one map', async ({ page }) => {
    await page.goto('/map')
    await waitForMap(page)
    await page.getByRole('link', { name: 'Tag' }).click()
    await expect(page.getByRole('heading', { name: 'Tag', level: 1 })).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('.maplibregl-map')).toHaveCount(0)
    await expect(page.locator('.map-host')).toHaveCount(0)
    await page.getByRole('link', { name: 'Map' }).click()
    await waitForMap(page)
    await expect(page.locator('.maplibregl-canvas')).toHaveCount(1)
    await expect(page.locator('.map-mk-btn')).toHaveCount(12)
  })
})
