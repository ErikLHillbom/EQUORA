import { expect, test } from '@playwright/test'

// The Tag screen runs the real model on real collar windows and lands on a state.

test.describe('tag screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tag')
    await expect(page.getByRole('heading', { name: 'Tag', level: 1 })).toBeVisible({ timeout: 30_000 })
    await page.evaluate(() => document.fonts.ready)
  })

  test('nothing overflows at 360 px', async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  const cases = [
    { scenario: 'Down and up, rolling', state: 'Urgent', file: 'colic' },
    { scenario: 'A dull donkey', state: 'Check', file: 'dull' },
    { scenario: 'Long work, no water stop', state: 'Water', file: 'water' },
    { scenario: 'A normal morning', state: 'Normal', file: 'normal' },
  ]

  for (const c of cases) {
    test(`${c.scenario} ends in ${c.state}`, async ({ page }) => {
      await page.getByRole('button', { name: new RegExp(c.scenario) }).click()
      await page.getByRole('button', { name: 'Run to the end' }).click()
      await expect(page.locator('.tag-device').getByText(c.state, { exact: true }).first()).toBeVisible()
      await page.screenshot({ path: `e2e/screenshots/tag-${c.file}-360.png`, fullPage: true })
    })
  }

  // The tile marked "Now" is the activity in the readout. Trotting shares the walking tile and
  // "Not sure" marks no tile.
  const TILE: Record<string, string | null> = {
    Standing: 'stand',
    Walking: 'walk',
    Trotting: 'walk',
    Eating: 'eat',
    Lying: 'lie',
    Rolling: 'roll',
    'Not sure': null,
  }

  async function expectNowFollows(page: import('@playwright/test').Page) {
    const activity = (await page.locator('.tag-readout__row').first().locator('dd').innerText()).trim()
    expect(Object.keys(TILE)).toContain(activity)
    const now = page.locator('.tag-sees__tile[aria-current="true"]')
    const tile = TILE[activity]
    if (tile === null) {
      await expect(now).toHaveCount(0)
    } else {
      await expect(now).toHaveCount(1)
      await expect(now).toHaveAttribute('data-tile', tile)
      await expect(now.getByText('Now', { exact: true })).toBeVisible()
    }
    return activity
  }

  test('the Now tile follows the activity', async ({ page }) => {
    const sees = page.locator('.tag-sees')
    await expect(sees.getByRole('heading', { name: 'What the tag sees now' })).toBeVisible()
    await expect(sees.locator('.tag-sees__tile')).toHaveCount(5)
    await expect(sees.locator('[data-tile="roll"]')).toContainText('No drawing')
    // Nothing is marked before the first window.
    await expect(sees.locator('[aria-current="true"]')).toHaveCount(0)

    await page.getByRole('button', { name: /A normal morning/ }).click()
    const seen = new Set<string>()
    await page.getByRole('button', { name: 'Start replay' }).click()
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(1200)
      await page.getByRole('button', { name: 'Pause' }).click()
      seen.add(await expectNowFollows(page))
      await page.getByRole('button', { name: 'Start replay' }).click()
    }
    await page.getByRole('button', { name: 'Pause' }).click()

    // The colic replay ends after the last getting up, on a different tile from the walking morning.
    await page.getByRole('button', { name: /Down and up, rolling/ }).click()
    await page.getByRole('button', { name: 'Run to the end' }).click()
    seen.add(await expectNowFollows(page))
    expect(seen.size).toBeGreaterThan(1)
  })

  test.describe('on a computer', () => {
    test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })

    test('the tag on the left, the input and the pipeline on the right', async ({ page }) => {
      const side = await page.locator('.tag-side').boundingBox()
      const main = await page.locator('.tag-main').boundingBox()
      expect(side).not.toBeNull()
      expect(main).not.toBeNull()
      expect(main!.x).toBeGreaterThan(side!.x + side!.width)
      // Five tiles in one row.
      const tiles = page.locator('.tag-sees__tile')
      const first = await tiles.first().boundingBox()
      const last = await tiles.last().boundingBox()
      expect(Math.abs(first!.y - last!.y)).toBeLessThan(2)
      // Scenarios as a two-column grid.
      const a = await page.getByRole('button', { name: /A normal morning/ }).boundingBox()
      const b = await page.getByRole('button', { name: /Long work, no water stop/ }).boundingBox()
      expect(Math.abs(a!.y - b!.y)).toBeLessThan(2)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      await page.screenshot({ path: 'e2e/screenshots/tag-ready-1440.png' })

      await page.getByRole('button', { name: /Down and up, rolling/ }).click()
      await page.getByRole('button', { name: 'Run to the end' }).click()
      await expect(page.locator('.tag-device').getByText('Urgent', { exact: true }).first()).toBeVisible()
      await page.screenshot({ path: 'e2e/screenshots/tag-colic-1440.png' })
      await page.screenshot({ path: 'e2e/screenshots/tag-colic-1440-full.png', fullPage: true })
      await page.addStyleTag({ content: 'html { filter: grayscale(1); }' })
      await page.screenshot({ path: 'e2e/screenshots/tag-colic-1440-grey.png' })
    })

    test('a normal morning, paused mid replay', async ({ page }) => {
      await page.getByRole('button', { name: /A normal morning/ }).click()
      await page.getByRole('button', { name: 'Start replay' }).click()
      await page.waitForTimeout(1500)
      await page.getByRole('button', { name: 'Pause' }).click()
      await expectNowFollows(page)
      await page.screenshot({ path: 'e2e/screenshots/tag-normal-1440.png', fullPage: true })
    })
  })

  test('screenshot in greyscale after the colic replay', async ({ page }) => {
    await page.getByRole('button', { name: /Down and up, rolling/ }).click()
    await page.getByRole('button', { name: 'Run to the end' }).click()
    await page.addStyleTag({ content: 'html { filter: grayscale(1); }' })
    await page.screenshot({ path: 'e2e/screenshots/tag-colic-360-grey.png', fullPage: true })
  })
})
