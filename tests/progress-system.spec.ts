import { test, expect, Page } from '@playwright/test'

// Test data
const testBookingId = 'test-booking-id'
const testMilestoneId = 'test-milestone-id'
const testTaskId = 'test-task-id'

// Helper function to create test data
async function createTestData(page: Page) {
  // This would typically involve API calls to create test data
  // For now, we'll assume the test data exists
  return {
    bookingId: testBookingId,
    milestoneId: testMilestoneId,
    taskId: testTaskId
  }
}

// Helper function to login as provider
async function loginAsProvider(page: Page) {
  await page.goto('/auth/sign-in')
  await page.fill('[data-testid="email"]', 'provider@test.com')
  await page.fill('[data-testid="password"]', 'password123')
  await page.click('[data-testid="sign-in-button"]')
  await page.waitForURL('/dashboard')
}

// Helper function to login as client
async function loginAsClient(page: Page) {
  await page.goto('/auth/sign-in')
  await page.fill('[data-testid="email"]', 'client@test.com')
  await page.fill('[data-testid="password"]', 'password123')
  await page.click('[data-testid="sign-in-button"]')
  await page.waitForURL('/dashboard')
}

test.describe('Backend-Driven Progress System', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test data
    await createTestData(page)
  })

  test.describe('Transition Validation', () => {
    test('should prevent invalid transition from pending to completed', async ({ page }) => {
      await loginAsProvider(page)
      
      // Navigate to booking details
      await page.goto(`/dashboard/bookings/${testBookingId}`)
      await page.waitForLoadState('networkidle')

      // Find a task with pending status
      const pendingTask = page.locator('[data-testid="task-item"]').filter({ hasText: 'pending' }).first()
      await expect(pendingTask).toBeVisible()

      // Try to change status to completed directly
      const statusSelect = pendingTask.locator('[data-testid="task-status-select"]')
      await statusSelect.click()
      
      // Select completed status
      await page.locator('[data-testid="status-option-completed"]').click()

      // Wait for error message
      await expect(page.locator('[data-testid="transition-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="transition-error"]')).toContainText('Cannot transition from pending to completed')

      // Verify task status didn't change
      await expect(statusSelect).toHaveValue('pending')
    })

    test('should allow valid transition from in_progress to completed', async ({ page }) => {
      await loginAsProvider(page)
      
      // Navigate to booking details
      await page.goto(`/dashboard/bookings/${testBookingId}`)
      await page.waitForLoadState('networkidle')

      // Find a task with in_progress status
      const inProgressTask = page.locator('[data-testid="task-item"]').filter({ hasText: 'in_progress' }).first()
      await expect(inProgressTask).toBeVisible()

      // Change status to completed
      const statusSelect = inProgressTask.locator('[data-testid="task-status-select"]')
      await statusSelect.click()
      
      // Select completed status
      await page.locator('[data-testid="status-option-completed"]').click()

      // Wait for success message
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible()
      await expect(page.locator('[data-testid="success-toast"]')).toContainText('Task status updated successfully')

      // Verify task status changed
      await expect(statusSelect).toHaveValue('completed')
    })

    test('should allow transition from pending to in_progress', async ({ page }) => {
      await loginAsProvider(page)
      
      // Navigate to booking details
      await page.goto(`/dashboard/bookings/${testBookingId}`)
      await page.waitForLoadState('networkidle')

      // Find a task with pending status
      const pendingTask = page.locator('[data-testid="task-item"]').filter({ hasText: 'pending' }).first()
      await expect(pendingTask).toBeVisible()

      // Change status to in_progress
      const statusSelect = pendingTask.locator('[data-testid="task-status-select"]')
      await statusSelect.click()
      
      // Select in_progress status
      await page.locator('[data-testid="status-option-in_progress"]').click()

      // Wait for success message
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible()
      await expect(page.locator('[data-testid="success-toast"]')).toContainText('Task status updated successfully')

      // Verify task status changed
      await expect(statusSelect).toHaveValue('in_progress')
    })

    test('should prevent invalid transition from completed to pending', async ({ page }) => {
      await loginAsProvider(page)
      
      // Navigate to booking details
      await page.goto(`/dashboard/bookings/${testBookingId}`)
      await page.waitForLoadState('networkidle')

      // Find a task with completed status
      const completedTask = page.locator('[data-testid="task-item"]').filter({ hasText: 'completed' }).first()
      await expect(completedTask).toBeVisible()

      // Try to change status to pending
      const statusSelect = completedTask.locator('[data-testid="task-status-select"]')
      await statusSelect.click()
      
      // Select pending status
      await page.locator('[data-testid="status-option-pending"]').click()

      // Wait for error message
      await expect(page.locator('[data-testid="transition-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="transition-error"]')).toContainText('Cannot transition from completed to pending')

      // Verify task status didn't change
      await expect(statusSelect).toHaveValue('completed')
    })
  })

  test.describe('Realtime Updates', () => {
    test('should show task completion in second client without refresh', async ({ browser }) => {
      // Create two browser contexts for two clients
      const providerContext = await browser.newContext()
      const clientContext = await browser.newContext()
      
      const providerPage = await providerContext.newPage()
      const clientPage = await clientContext.newPage()

      // Login as provider and client
      await loginAsProvider(providerPage)
      await loginAsClient(clientPage)

      // Both navigate to the same booking
      await providerPage.goto(`/dashboard/bookings/${testBookingId}`)
      await clientPage.goto(`/dashboard/bookings/${testBookingId}`)
      
      await providerPage.waitForLoadState('networkidle')
      await clientPage.waitForLoadState('networkidle')

      // Find a task that can be completed
      const taskInProvider = providerPage.locator('[data-testid="task-item"]').filter({ hasText: 'in_progress' }).first()
      const taskInClient = clientPage.locator('[data-testid="task-item"]').filter({ hasText: 'in_progress' }).first()
      
      await expect(taskInProvider).toBeVisible()
      await expect(taskInClient).toBeVisible()

      // Get task ID for verification
      const taskId = await taskInProvider.getAttribute('data-task-id')
      const clientTaskId = await taskInClient.getAttribute('data-task-id')
      expect(taskId).toBe(clientTaskId)

      // Complete task in provider view
      const statusSelect = taskInProvider.locator('[data-testid="task-status-select"]')
      await statusSelect.click()
      await providerPage.locator('[data-testid="status-option-completed"]').click()

      // Wait for success in provider
      await expect(providerPage.locator('[data-testid="success-toast"]')).toBeVisible()

      // Verify task is completed in provider
      await expect(statusSelect).toHaveValue('completed')

      // Wait for realtime update in client (should happen within 5 seconds)
      await expect(clientPage.locator(`[data-task-id="${taskId}"][data-testid="task-item"]`)).toContainText('completed', { timeout: 10000 })

      // Verify task is completed in client without refresh
      const clientStatusSelect = clientPage.locator(`[data-task-id="${taskId}"] [data-testid="task-status-select"]`)
      await expect(clientStatusSelect).toHaveValue('completed')

      // Clean up
      await providerContext.close()
      await clientContext.close()
    })

    test('should update milestone progress in real-time', async ({ browser }) => {
      // Create two browser contexts
      const providerContext = await browser.newContext()
      const clientContext = await browser.newContext()
      
      const providerPage = await providerContext.newPage()
      const clientPage = await clientContext.newPage()

      // Login as provider and client
      await loginAsProvider(providerPage)
      await loginAsClient(clientPage)

      // Both navigate to the same booking
      await providerPage.goto(`/dashboard/bookings/${testBookingId}`)
      await clientPage.goto(`/dashboard/bookings/${testBookingId}`)
      
      await providerPage.waitForLoadState('networkidle')
      await clientPage.waitForLoadState('networkidle')

      // Get initial milestone progress
      const initialProgress = await providerPage.locator('[data-testid="milestone-progress"]').textContent()
      
      // Complete a task in provider view
      const taskInProvider = providerPage.locator('[data-testid="task-item"]').filter({ hasText: 'in_progress' }).first()
      const statusSelect = taskInProvider.locator('[data-testid="task-status-select"]')
      await statusSelect.click()
      await providerPage.locator('[data-testid="status-option-completed"]').click()

      // Wait for success
      await expect(providerPage.locator('[data-testid="success-toast"]')).toBeVisible()

      // Wait for milestone progress to update in provider
      await expect(providerPage.locator('[data-testid="milestone-progress"]')).not.toHaveText(initialProgress, { timeout: 10000 })

      // Wait for milestone progress to update in client via realtime
      await expect(clientPage.locator('[data-testid="milestone-progress"]')).not.toHaveText(initialProgress, { timeout: 10000 })

      // Clean up
      await providerContext.close()
      await clientContext.close()
    })

    test('should update booking progress in real-time', async ({ browser }) => {
      // Create two browser contexts
      const providerContext = await browser.newContext()
      const clientContext = await browser.newContext()
      
      const providerPage = await providerContext.newPage()
      const clientPage = await clientContext.newPage()

      // Login as provider and client
      await loginAsProvider(providerPage)
      await loginAsClient(clientPage)

      // Both navigate to the same booking
      await providerPage.goto(`/dashboard/bookings/${testBookingId}`)
      await clientPage.goto(`/dashboard/bookings/${testBookingId}`)
      
      await providerPage.waitForLoadState('networkidle')
      await clientPage.waitForLoadState('networkidle')

      // Get initial booking progress
      const initialProgress = await providerPage.locator('[data-testid="booking-progress"]').textContent()
      
      // Complete a task in provider view
      const taskInProvider = providerPage.locator('[data-testid="task-item"]').filter({ hasText: 'in_progress' }).first()
      const statusSelect = taskInProvider.locator('[data-testid="task-status-select"]')
      await statusSelect.click()
      await providerPage.locator('[data-testid="status-option-completed"]').click()

      // Wait for success
      await expect(providerPage.locator('[data-testid="success-toast"]')).toBeVisible()

      // Wait for booking progress to update in provider
      await expect(providerPage.locator('[data-testid="booking-progress"]')).not.toHaveText(initialProgress, { timeout: 10000 })

      // Wait for booking progress to update in client via realtime
      await expect(clientPage.locator('[data-testid="booking-progress"]')).not.toHaveText(initialProgress, { timeout: 10000 })

      // Clean up
      await providerContext.close()
      await clientContext.close()
    })
  })

  test.describe('Backend Views Integration', () => {
    test('should display overdue tasks with correct styling', async ({ page }) => {
      await loginAsProvider(page)
      
      // Navigate to booking details
      await page.goto(`/dashboard/bookings/${testBookingId}`)
      await page.waitForLoadState('networkidle')

      // Find overdue tasks
      const overdueTasks = page.locator('[data-testid="task-item"].overdue')
      const overdueCount = await overdueTasks.count()

      if (overdueCount > 0) {
        // Verify overdue styling
        const firstOverdueTask = overdueTasks.first()
        await expect(firstOverdueTask).toHaveClass(/overdue/)
        
        // Verify overdue badge
        await expect(firstOverdueTask.locator('[data-testid="overdue-badge"]')).toBeVisible()
        await expect(firstOverdueTask.locator('[data-testid="overdue-badge"]')).toContainText('Overdue')
      }
    })

    test('should display calculated milestone progress', async ({ page }) => {
      await loginAsProvider(page)
      
      // Navigate to booking details
      await page.goto(`/dashboard/bookings/${testBookingId}`)
      await page.waitForLoadState('networkidle')

      // Check that milestone progress is calculated from tasks
      const milestones = page.locator('[data-testid="milestone-item"]')
      const milestoneCount = await milestones.count()

      for (let i = 0; i < milestoneCount; i++) {
        const milestone = milestones.nth(i)
        const progressText = await milestone.locator('[data-testid="milestone-progress-text"]').textContent()
        const progressBar = milestone.locator('[data-testid="milestone-progress-bar"]')
        
        // Progress should be a percentage
        expect(progressText).toMatch(/\d+%/)
        
        // Progress bar should have a value
        const progressValue = await progressBar.getAttribute('aria-valuenow')
        expect(progressValue).toBeTruthy()
        expect(parseInt(progressValue || '0')).toBeGreaterThanOrEqual(0)
        expect(parseInt(progressValue || '0')).toBeLessThanOrEqual(100)
      }
    })

    test('should display calculated booking progress', async ({ page }) => {
      await loginAsProvider(page)
      
      // Navigate to booking details
      await page.goto(`/dashboard/bookings/${testBookingId}`)
      await page.waitForLoadState('networkidle')

      // Check booking progress
      const bookingProgress = page.locator('[data-testid="booking-progress"]')
      await expect(bookingProgress).toBeVisible()

      const progressText = await bookingProgress.textContent()
      expect(progressText).toMatch(/\d+%/)

      // Check task counts
      const taskCounts = page.locator('[data-testid="task-counts"]')
      await expect(taskCounts).toBeVisible()
      
      const countsText = await taskCounts.textContent()
      expect(countsText).toMatch(/\d+ of \d+ tasks completed/)
    })
  })

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      await loginAsProvider(page)
      
      // Navigate to booking details
      await page.goto(`/dashboard/bookings/${testBookingId}`)
      await page.waitForLoadState('networkidle')

      // Mock API error
      await page.route('**/api/tasks*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        })
      })

      // Try to update a task
      const task = page.locator('[data-testid="task-item"]').first()
      const statusSelect = task.locator('[data-testid="task-status-select"]')
      await statusSelect.click()
      await page.locator('[data-testid="status-option-in_progress"]').click()

      // Should show error message
      await expect(page.locator('[data-testid="error-toast"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-toast"]')).toContainText('Failed to update task status')
    })

    test('should handle network errors gracefully', async ({ page }) => {
      await loginAsProvider(page)
      
      // Navigate to booking details
      await page.goto(`/dashboard/bookings/${testBookingId}`)
      await page.waitForLoadState('networkidle')

      // Mock network error
      await page.route('**/api/tasks*', route => {
        route.abort('Failed')
      })

      // Try to update a task
      const task = page.locator('[data-testid="task-item"]').first()
      const statusSelect = task.locator('[data-testid="task-status-select"]')
      await statusSelect.click()
      await page.locator('[data-testid="status-option-in_progress"]').click()

      // Should show error message
      await expect(page.locator('[data-testid="error-toast"]')).toBeVisible()
    })
  })
})

