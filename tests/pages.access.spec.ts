import { test, expect, Page } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3002'

test('unauth -> /dashboard/admin redirects to sign-in', async ({ page }: { page: Page }) => {
  await page.goto(`${BASE}/dashboard/admin`)
  await expect(page).toHaveURL(/\/auth\/sign-in/)
})

test.describe('admin role', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' })
  test('admin -> /dashboard/admin allowed', async ({ page }: { page: Page }) => {
    await page.goto(`${BASE}/dashboard/admin`)
    // Page should render; check some known admin UI marker if available
    await expect(page).toHaveURL(/\/dashboard\/admin/)
  })
})

test.describe('provider role', () => {
  test.use({ storageState: 'playwright/.auth/provider.json' })
  test('provider -> /dashboard/admin denied', async ({ page }: { page: Page }) => {
    await page.goto(`${BASE}/dashboard/admin`)
    await expect(page).toHaveURL(/\/dashboard$|\/forbidden$|\/auth\/sign-in$/)
  })
})


