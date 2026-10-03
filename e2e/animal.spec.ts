import { expect, test } from '@playwright/test'

// The case file of five demo animals, one per state, at 360 px, in colour and greyscale.
// Animal ids come from the simulated herd (src/simulation/herd.ts).

const CASES = [
  { id: 'bari', name: 'Bari', state: 'Check' },
  { id: 'chaltu', name: 'Chaltu', state: 'Water' },
  { id: 'kito', name: 'Kito', state: 'Urgent' },
  { id: 'mulu', name: 'Mulu', state: 'Normal' },
  { id: 'gelila', name: 'Gelila', state: 'Not sure' },
]

async function open(page: import('@playwright/test').Page, id: string, name: string) {
  await page.goto(`/animal/${id}`)
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible({ timeout: 30_000 })
  await page.evaluate(() => document.fonts.ready)
}

test.describe('animal case file', () => {
  for (const c of CASES) {
    test(`${c.name} reads as ${c.state} and fits 360 px`, async ({ page }) => {
      await open(page, c.id, c.name)
      await expect(page.locator('.animal-header .ui-statestamp-word').first()).toHaveText(c.state)
      await expect(page.getByText('Simulated data').first()).toBeVisible()
      await expect(page.getByRole('heading', { name: '1 Today', exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: '2 Trends', exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: '3 Detected changes', exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'What the tag cannot see' })).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      await page.screenshot({ path: `e2e/screenshots/animal-${c.id}-360.png`, fullPage: true })
      await page.addStyleTag({ content: 'html { filter: grayscale(1); }' })
      await page.screenshot({ path: `e2e/screenshots/animal-${c.id}-360-grey.png`, fullPage: true })
    })
  }

  test('what to do next shows the water plans for Chaltu', async ({ page }) => {
    await open(page, 'chaltu', 'Chaltu')
    const next = page.locator('.animal-next')
    await expect(next.getByRole('heading', { name: 'What to do next' })).toBeVisible()
    await expect(next.getByText(/Stop Chaltu at the Aricha water point before/)).toBeVisible()
    await expect(next.locator('tr[data-plan]')).toHaveCount(3)
  })

  test('a normal animal has no next steps block', async ({ page }) => {
    await open(page, 'mulu', 'Mulu')
    await expect(page.locator('.animal-next')).toHaveCount(0)
  })

  test('trend ranges switch', async ({ page }) => {
    await open(page, 'bari', 'Bari')
    for (const range of ['7 days', '30 days', '6 months', 'Today']) {
      await page.getByRole('tab', { name: range }).click()
      await expect(page.getByRole('tab', { name: range })).toHaveAttribute('aria-selected', 'true')
      await expect(page.locator('.animal-trends .ui-chart').first()).toBeVisible()
    }
    await page.getByRole('tab', { name: '7 days' }).click()
    await page.screenshot({ path: 'e2e/screenshots/animal-bari-7days-360.png', fullPage: true })
  })

  test('feedback is recorded, stamped and kept after a reload', async ({ page }) => {
    await open(page, 'bari', 'Bari')
    const group = page.getByRole('group', { name: /Answer for the change on/ }).first()
    await expect(group).toBeVisible()
    await group.getByRole('button', { name: 'Checked: not eating' }).click()
    const entry = page.locator('.ui-logentry').first()
    await expect(entry.locator('.ui-logentry-feedback')).toContainText('Checked: not eating')
    await expect(entry.getByRole('button', { name: 'Checked: fine' })).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Bari', level: 1 })).toBeVisible({ timeout: 30_000 })
    const again = page.locator('.ui-logentry').first()
    await expect(again.locator('.ui-logentry-feedback')).toContainText('Checked: not eating')
    await expect(again.getByText('Saved on this phone.')).toBeVisible()
  })

  test('an unknown animal gets a note and a way back', async ({ page }) => {
    await page.goto('/animal/nobody')
    await expect(page.getByText('No animal with this tag in the herd.')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('link', { name: 'Back to the herd' })).toBeVisible()
  })
})
