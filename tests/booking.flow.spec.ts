import { test, expect } from '@playwright/test'

test('provider can approve pending booking and UI refreshes', async ({ page }) => {
  await page.goto('/dashboard/bookings/<booking-id>/milestones')
  await expect(page.getByText('Pending Provider Approval')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Approve Booking' })).toBeVisible()
  await page.getByRole('button', { name: 'Approve Booking' }).click()
  await expect(page.getByText('In Progress')).toBeVisible({ timeout: 7000 })
})

test('non-provider cannot see approve/decline buttons', async ({ page }) => {
  await page.goto('/dashboard/bookings/<booking-id>/milestones')
  await expect(page.getByRole('button', { name: 'Approve Booking' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Decline' })).toHaveCount(0)
})


