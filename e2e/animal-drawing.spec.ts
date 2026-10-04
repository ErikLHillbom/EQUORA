import { expect, test } from '@playwright/test'
// Regression: the case-file drawing once measured its frame and fed the width back, growing forever.
for (const vp of [{ width: 1440, height: 900 }, { width: 360, height: 800 }]) {
  test(`case file drawing keeps its size at ${vp.width}`, async ({ page }) => {
    await page.setViewportSize(vp)
    await page.goto('/animal/bari')
    const img = page.locator('.animal-header__art .ui-posture')
    await expect(img).toBeVisible()
    await page.waitForTimeout(800)
    const a = await img.boundingBox()
    await page.waitForTimeout(3000)
    const b = await img.boundingBox()
    expect(Math.abs((b?.width ?? 0) - (a?.width ?? 0))).toBeLessThan(1)
    expect(b!.width).toBeLessThan(vp.width)
    await page.screenshot({ path: `e2e/screenshots/nogrow-${vp.width}.png` })
  })
}
