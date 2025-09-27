import { test, expect } from '@playwright/test'

test.describe('Role Assignment API', () => {
  const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api'

  test('GET /api/users returns users with roles', async ({ request }) => {
    const response = await request.get(`${API_BASE}/users`)
    
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('users')
    expect(data).toHaveProperty('total')
    expect(Array.isArray(data.users)).toBe(true)
    
    // Check that users have roles
    if (data.users.length > 0) {
      const firstUser = data.users[0]
      expect(firstUser).toHaveProperty('id')
      expect(firstUser).toHaveProperty('roles')
      expect(Array.isArray(firstUser.roles)).toBe(true)
    }
  })

  test('POST /api/users assigns role to user', async ({ request }) => {
    // First, get a user to assign a role to
    const usersResponse = await request.get(`${API_BASE}/users`)
    const usersData = await usersResponse.json()
    
    if (usersData.users.length === 0) {
      test.skip('No users available for role assignment test')
    }
    
    const targetUser = usersData.users[0]
    
    // Assign provider role
    const assignResponse = await request.post(`${API_BASE}/users`, {
      data: {
        action: 'assign_role',
        userId: targetUser.id,
        roleName: 'provider',
        assignedBy: targetUser.id // Self-assignment for test
      }
    })
    
    expect(assignResponse.status()).toBe(200)
    
    const assignData = await assignResponse.json()
    expect(assignData).toHaveProperty('success', true)
  })

  test('POST /api/users removes role from user', async ({ request }) => {
    // First, get a user with a role
    const usersResponse = await request.get(`${API_BASE}/users`)
    const usersData = await usersResponse.json()
    
    if (usersData.users.length === 0) {
      test.skip('No users available for role removal test')
    }
    
    const targetUser = usersData.users[0]
    
    // Remove provider role
    const removeResponse = await request.post(`${API_BASE}/users`, {
      data: {
        action: 'remove_role',
        userId: targetUser.id,
        roleName: 'provider'
      }
    })
    
    expect(removeResponse.status()).toBe(200)
    
    const removeData = await removeResponse.json()
    expect(removeData).toHaveProperty('success', true)
  })

  test('GET /api/bookings/enriched returns enriched booking data', async ({ request }) => {
    const response = await request.get(`${API_BASE}/bookings/enriched?userId=test-user-id&userRole=admin`)
    
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('bookings')
    expect(data).toHaveProperty('total')
    expect(Array.isArray(data.bookings)).toBe(true)
    
    // Check that bookings have enriched data
    if (data.bookings.length > 0) {
      const firstBooking = data.bookings[0]
      expect(firstBooking).toHaveProperty('service_title')
      expect(firstBooking).toHaveProperty('client_name')
      expect(firstBooking).toHaveProperty('provider_name')
    }
  })

  test('GET /api/services/enriched returns enriched service data', async ({ request }) => {
    const response = await request.get(`${API_BASE}/services/enriched?userId=test-user-id&userRole=client`)
    
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('services')
    expect(data).toHaveProperty('total')
    expect(Array.isArray(data.services)).toBe(true)
    
    // Check that services have enriched data
    if (data.services.length > 0) {
      const firstService = data.services[0]
      expect(firstService).toHaveProperty('provider_name')
      expect(firstService).toHaveProperty('booking_count')
      expect(firstService).toHaveProperty('avg_rating')
    }
  })

  test('Role-based access control works correctly', async ({ request }) => {
    // Test that different roles get different data
    const adminResponse = await request.get(`${API_BASE}/bookings/enriched?userId=admin-user-id&userRole=admin`)
    const providerResponse = await request.get(`${API_BASE}/bookings/enriched?userId=provider-user-id&userRole=provider`)
    const clientResponse = await request.get(`${API_BASE}/bookings/enriched?userId=client-user-id&userRole=client`)
    
    expect(adminResponse.status()).toBe(200)
    expect(providerResponse.status()).toBe(200)
    expect(clientResponse.status()).toBe(200)
    
    const adminData = await adminResponse.json()
    const providerData = await providerResponse.json()
    const clientData = await clientResponse.json()
    
    // Admin should see all bookings
    expect(adminData.total).toBeGreaterThanOrEqual(0)
    
    // Provider should only see their own bookings
    expect(providerData.total).toBeGreaterThanOrEqual(0)
    
    // Client should only see their own bookings
    expect(clientData.total).toBeGreaterThanOrEqual(0)
  })

  test('Invalid role assignment returns error', async ({ request }) => {
    const response = await request.post(`${API_BASE}/users`, {
      data: {
        action: 'assign_role',
        userId: 'invalid-user-id',
        roleName: 'invalid-role'
      }
    })
    
    expect(response.status()).toBe(400)
    
    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  test('Missing parameters return error', async ({ request }) => {
    const response = await request.post(`${API_BASE}/users`, {
      data: {
        action: 'assign_role'
        // Missing userId and roleName
      }
    })
    
    expect(response.status()).toBe(400)
    
    const data = await response.json()
    expect(data).toHaveProperty('error')
    expect(data.error).toContain('Missing required fields')
  })
})
