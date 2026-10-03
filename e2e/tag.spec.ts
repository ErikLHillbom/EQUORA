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

  test('screenshot in greyscale after the colic replay', async ({ page }) => {
    await page.getByRole('button', { name: /Down and up, rolling/ }).click()
    await page.getByRole('button', { name: 'Run to the end' }).click()
    await page.addStyleTag({ content: 'html { filter: grayscale(1); }' })
    await page.screenshot({ path: 'e2e/screenshots/tag-colic-360-grey.png', fullPage: true })
  })
})
