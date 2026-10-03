import { expect, test } from '@playwright/test'

// Screenshots of the hidden specimen sheet at 360 px, in colour and in greyscale (DESIGN 10).
// Files land in e2e/screenshots/ (ignored by git). Look at both before building screens.

test.describe('specimen sheet', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/specimen')
    await expect(page.getByRole('heading', { name: 'Equid Sentinel' })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
  })

  test('nothing overflows at 360 px', async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('every interactive element is at least 48 px', async ({ page }) => {
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('button, a, [role="tab"]')]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && (r.width < 48 || r.height < 48))
        .map(({ el, r }) => `${el.textContent?.trim() || el.getAttribute('aria-label')}: ${r.width}x${r.height}`),
    )
    expect(small).toEqual([])
  })

  test('the bottom nav is hidden on the specimen sheet', async ({ page }) => {
    await expect(page.getByRole('navigation')).toHaveCount(0)
  })

  test('screenshot in colour', async ({ page }) => {
    await page.screenshot({ path: 'e2e/screenshots/specimen-360.png', fullPage: true })
  })

  test('screenshot in greyscale', async ({ page }) => {
    await page.addStyleTag({ content: 'html { filter: grayscale(1); }' })
    await page.screenshot({ path: 'e2e/screenshots/specimen-360-grey.png', fullPage: true })
  })

  test('screenshot each section, for close review', async ({ page }) => {
    await page.locator('.ui-header').screenshot({ path: 'e2e/screenshots/specimen-00-header.png' })
    const sections = page.locator('.spec-section')
    const count = await sections.count()
    for (let i = 0; i < count; i++) {
      await sections.nth(i).screenshot({ path: `e2e/screenshots/specimen-${String(i + 1).padStart(2, '0')}.png` })
    }
    await page.addStyleTag({ content: 'html { filter: grayscale(1); }' })
    for (let i = 0; i < count; i++) {
      await sections.nth(i).screenshot({ path: `e2e/screenshots/specimen-${String(i + 1).padStart(2, '0')}-grey.png` })
    }
  })
})

test('the home placeholder shows the bottom nav with five items', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Animals' })).toBeVisible()
  const nav = page.getByRole('navigation')
  await expect(nav.getByRole('link')).toHaveCount(5)
  await expect(nav.getByRole('link', { name: 'Herd' })).toHaveAttribute('aria-current', 'page')
  await page.screenshot({ path: 'e2e/screenshots/home-360.png', fullPage: true })
})

test('the language switch changes the labels and flags the machine translation', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Amharic' }).click()
  await expect(page.getByRole('heading', { name: 'እንስሳት' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'am')
  await expect(page.locator('.app-machine-note')).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/home-360-am.png', fullPage: true })
})
