import { expect, test } from '@playwright/test'

// SPEC 7: the core works with no signal. Open the app once online, then cut the network and use it.
test.use({
  serviceWorkers: 'allow',
  launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
})

test('every screen works offline after one visit', async ({ page, context }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  // Wait until the service worker controls the page and has precached everything.
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.ready
    return Boolean(reg.active) && navigator.serviceWorker.controller !== null
  }, undefined, { timeout: 60_000 }).catch(async () => {
    // The first visit installs the worker; a reload puts the page under its control.
    await page.reload()
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, { timeout: 60_000 })
  })
  await page.waitForFunction(async () => (await caches.keys()).length > 0, undefined, { timeout: 60_000 })

  await context.setOffline(true)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Equora' })).toBeVisible()
  await expect(page.locator('main a[href^="/animal/"]').first()).toBeVisible()

  await page.getByRole('navigation').getByRole('link', { name: 'Tag' }).click()
  await page.getByRole('button', { name: /Down and up, rolling/ }).click()
  await page.getByRole('button', { name: 'Run to the end' }).click()
  await expect(page.locator('.tag-device').getByText('Urgent', { exact: true }).first()).toBeVisible()

  await page.getByRole('navigation').getByRole('link', { name: 'Map' }).click()
  await expect(page.locator('.map-canvas[data-status="ready"]')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('Map tiles for this area are not saved on this phone.')).toHaveCount(0)

  await page.getByRole('navigation').getByRole('link', { name: 'Data' }).click()
  await expect(page.getByRole('heading', { name: 'What our data does not cover' })).toBeVisible()

  await page.screenshot({ path: 'e2e/screenshots/offline-data-360.png' })
})
