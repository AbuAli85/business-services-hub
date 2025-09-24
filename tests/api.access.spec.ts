import { test, expect, request as pwRequest } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3002'

test('unauth -> invoices API => 401', async () => {
  const req = await pwRequest.newContext({ baseURL: BASE })
  const res = await req.get('/api/invoices')
  expect(res.status()).toBe(401)
})

test('admin -> invoices API => 200', async () => {
  const req = await pwRequest.newContext({ baseURL: BASE, storageState: 'playwright/.auth/admin.json' })
  const res = await req.get('/api/invoices')
  expect(res.status()).toBe(200)
})

test('provider -> invoices API => 403', async () => {
  const req = await pwRequest.newContext({ baseURL: BASE, storageState: 'playwright/.auth/provider.json' })
  const res = await req.get('/api/invoices')
  expect(res.status()).toBe(403)
})


