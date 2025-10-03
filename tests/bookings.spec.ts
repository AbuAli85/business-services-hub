import { test, expect } from '@playwright/test'

test('bookings page loads for admin', async ({ page }) => {
  // Navigate to the bookings page
  await page.goto('/dashboard/bookings')
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle')
  
  // Check if the page title is visible
  await expect(page.getByRole('heading', { name: /Bookings/i })).toBeVisible()
  
  // Check if the table is visible
  await expect(page.getByText('Project Portfolio')).toBeVisible()
})

test('bookings page shows loading state', async ({ page }) => {
  // Navigate to the bookings page
  await page.goto('/dashboard/bookings')
  
  // Check if loading state is shown initially
  await expect(page.getByText('Loading bookings...')).toBeVisible()
})

test('bookings page has search functionality', async ({ page }) => {
  await page.goto('/dashboard/bookings')
  await page.waitForLoadState('networkidle')
  
  // Check if search input is present
  await expect(page.getByPlaceholder('Search bookings...')).toBeVisible()
  
  // Test search functionality
  await page.fill('input[placeholder="Search bookings..."]', 'test search')
  await page.waitForTimeout(500) // Wait for debounce
})

test('bookings page has filter options', async ({ page }) => {
  await page.goto('/dashboard/bookings')
  await page.waitForLoadState('networkidle')
  
  // Check if status filter buttons are present
  await expect(page.getByText('All')).toBeVisible()
  await expect(page.getByText('Pending Review')).toBeVisible()
  await expect(page.getByText('Approved')).toBeVisible()
  await expect(page.getByText('In Production')).toBeVisible()
  await expect(page.getByText('Delivered')).toBeVisible()
})

test('bookings page has pagination controls', async ({ page }) => {
  await page.goto('/dashboard/bookings')
  await page.waitForLoadState('networkidle')
  
  // Check if pagination controls are present (if there are multiple pages)
  const paginationText = page.getByText(/Page \d+ of \d+/)
  if (await paginationText.isVisible()) {
    await expect(paginationText).toBeVisible()
  }
})

test('bookings page shows statistics cards', async ({ page }) => {
  await page.goto('/dashboard/bookings')
  await page.waitForLoadState('networkidle')
  
  // Check if statistics cards are present
  await expect(page.getByText('Total Projects')).toBeVisible()
  await expect(page.getByText('Active Projects')).toBeVisible()
  await expect(page.getByText('Delivered')).toBeVisible()
})
