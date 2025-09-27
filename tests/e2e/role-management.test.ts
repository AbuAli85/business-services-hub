import { test, expect } from '@playwright/test'

test.describe('Role Management System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/')
  })

  test('Admin can view all users with roles', async ({ page }) => {
    // Login as admin
    await page.fill('[data-testid="email-input"]', 'admin@example.com')
    await page.fill('[data-testid="password-input"]', 'password')
    await page.click('[data-testid="login-button"]')

    // Navigate to users page
    await page.click('[data-testid="users-nav-link"]')
    await expect(page.locator('[data-testid="users-page"]')).toBeVisible()

    // Check that users are displayed with their roles
    await expect(page.locator('[data-testid="user-card"]')).toHaveCount.greaterThan(0)
    
    // Check that role information is displayed
    const firstUserCard = page.locator('[data-testid="user-card"]').first()
    await expect(firstUserCard.locator('[data-testid="user-role"]')).toBeVisible()
    await expect(firstUserCard.locator('[data-testid="user-roles-list"]')).toBeVisible()
  })

  test('Admin can assign roles to users', async ({ page }) => {
    // Login as admin
    await page.fill('[data-testid="email-input"]', 'admin@example.com')
    await page.fill('[data-testid="password-input"]', 'password')
    await page.click('[data-testid="login-button"]')

    // Navigate to users page
    await page.click('[data-testid="users-nav-link"]')
    
    // Click on first user's role assignment button
    const firstUserCard = page.locator('[data-testid="user-card"]').first()
    await firstUserCard.locator('[data-testid="assign-role-button"]').click()

    // Select a role from dropdown
    await page.selectOption('[data-testid="role-select"]', 'provider')
    await page.click('[data-testid="assign-role-confirm"]')

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Role assigned successfully')
  })

  test('Provider can only see their own services', async ({ page }) => {
    // Login as provider
    await page.fill('[data-testid="email-input"]', 'provider@example.com')
    await page.fill('[data-testid="password-input"]', 'password')
    await page.click('[data-testid="login-button"]')

    // Navigate to services page
    await page.click('[data-testid="services-nav-link"]')
    
    // Check that only provider's services are shown
    const serviceCards = page.locator('[data-testid="service-card"]')
    await expect(serviceCards).toHaveCount.greaterThan(0)
    
    // Verify all services belong to the logged-in provider
    for (let i = 0; i < await serviceCards.count(); i++) {
      const serviceCard = serviceCards.nth(i)
      await expect(serviceCard.locator('[data-testid="provider-name"]')).toContainText('provider@example.com')
    }
  })

  test('Client can see all active services', async ({ page }) => {
    // Login as client
    await page.fill('[data-testid="email-input"]', 'client@example.com')
    await page.fill('[data-testid="password-input"]', 'password')
    await page.click('[data-testid="login-button"]')

    // Navigate to services page
    await page.click('[data-testid="services-nav-link"]')
    
    // Check that all active services are shown
    const serviceCards = page.locator('[data-testid="service-card"]')
    await expect(serviceCards).toHaveCount.greaterThan(0)
    
    // Verify all services are active
    for (let i = 0; i < await serviceCards.count(); i++) {
      const serviceCard = serviceCards.nth(i)
      await expect(serviceCard.locator('[data-testid="service-status"]')).toContainText('Active')
    }
  })

  test('Booking enriched view displays correct information', async ({ page }) => {
    // Login as admin to see all bookings
    await page.fill('[data-testid="email-input"]', 'admin@example.com')
    await page.fill('[data-testid="password-input"]', 'password')
    await page.click('[data-testid="login-button"]')

    // Navigate to bookings page
    await page.click('[data-testid="bookings-nav-link"]')
    
    // Check that enriched booking data is displayed
    const bookingRows = page.locator('[data-testid="booking-row"]')
    await expect(bookingRows).toHaveCount.greaterThan(0)
    
    // Verify enriched fields are present
    const firstBooking = bookingRows.first()
    await expect(firstBooking.locator('[data-testid="service-title"]')).toBeVisible()
    await expect(firstBooking.locator('[data-testid="client-name"]')).toBeVisible()
    await expect(firstBooking.locator('[data-testid="provider-name"]')).toBeVisible()
  })

  test('RLS policies prevent unauthorized access', async ({ page }) => {
    // Login as client
    await page.fill('[data-testid="email-input"]', 'client@example.com')
    await page.fill('[data-testid="password-input"]', 'password')
    await page.click('[data-testid="login-button"]')

    // Try to access admin-only users page
    await page.goto('/admin/users')
    
    // Should be redirected or see access denied
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible()
  })

  test('Data drift detection works correctly', async ({ page }) => {
    // Login as admin
    await page.fill('[data-testid="email-input"]', 'admin@example.com')
    await page.fill('[data-testid="password-input"]', 'password')
    await page.click('[data-testid="login-button"]')

    // Navigate to admin dashboard
    await page.click('[data-testid="admin-dashboard-nav-link"]')
    
    // Check data quality monitor
    await expect(page.locator('[data-testid="data-quality-monitor"]')).toBeVisible()
    
    // Check drift detection results
    const driftSummary = page.locator('[data-testid="drift-summary"]')
    await expect(driftSummary).toBeVisible()
    
    // Verify no high-severity drifts
    const highSeverityDrifts = page.locator('[data-testid="high-severity-drift"]')
    await expect(highSeverityDrifts).toHaveCount(0)
  })
})
