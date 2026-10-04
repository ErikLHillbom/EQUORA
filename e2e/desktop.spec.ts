import { expect, test } from '@playwright/test'

// Computer screens (1440 x 900): nothing overflows and the nav sits in the top bar.
test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })

const SCREENS = [
  { path: '/', name: 'herd' },
  { path: '/map', name: 'map' },
  { path: '/animal/bari', name: 'animal' },
  { path: '/tag', name: 'tag' },
  { path: '/stats', name: 'stats' },
  { path: '/data', name: 'data' },
  { path: '/why', name: 'why' },
]

for (const s of SCREENS) {
  test(`${s.name} on a computer`, async ({ page }) => {
    await page.goto(s.path)
    await expect(page.locator('.app-topnav')).toBeVisible()
    await expect(page.locator('.ui-bottomnav')).toBeHidden()
    await page.waitForTimeout(1500)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await page.screenshot({ path: `e2e/screenshots/desktop-${s.name}.png` })
    await page.screenshot({ path: `e2e/screenshots/desktop-${s.name}-full.png`, fullPage: true })
  })
}
