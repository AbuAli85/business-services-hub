import { test, expect } from '@playwright/test'

test('overview renders key metrics', async ({ page }) => {
  await page.goto('/overview')
  await expect(page.getByText(/Project Completion/i)).toBeVisible()
  await expect(page.getByText(/Client Satisfaction/i)).toBeVisible()
  await expect(page.getByText(/Revenue \(This Month\)/i)).toBeVisible()
  await expect(page.getByText(/Active Projects/i)).toBeVisible()
})


