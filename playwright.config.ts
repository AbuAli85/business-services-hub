import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  projects: [
    // Assumes you have a separate setup to create storage states if needed
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3002',
    headless: true,
  },
  // Don't start a new server, use the existing one
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3002',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
})


