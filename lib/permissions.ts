import { useMemo } from 'react'

interface Permission {
  name: string
  description: string
  category: string
}

interface RolePermissions {
  [role: string]: Permission[]
}

const rolePermissions: RolePermissions = {
  admin: [
    { name: 'all', description: 'Full system access', category: 'system' },
    { name: 'users:read', description: 'View users', category: 'users' },
    { name: 'users:create', description: 'Create users', category: 'users' },
    { name: 'users:update', description: 'Update users', category: 'users' },
    { name: 'users:delete', description: 'Delete users', category: 'users' },
    { name: 'services:read', description: 'View services', category: 'services' },
    { name: 'services:create', description: 'Create services', category: 'services' },
    { name: 'services:update', description: 'Update services', category: 'services' },
    { name: 'services:delete', description: 'Delete services', category: 'services' },
    { name: 'bookings:read', description: 'View bookings', category: 'bookings' },
    { name: 'bookings:create', description: 'Create bookings', category: 'bookings' },
    { name: 'bookings:update', description: 'Update bookings', category: 'bookings' },
    { name: 'bookings:delete', description: 'Delete bookings', category: 'bookings' },
    { name: 'invoices:read', description: 'View invoices', category: 'invoices' },
    { name: 'invoices:create', description: 'Create invoices', category: 'invoices' },
    { name: 'invoices:update', description: 'Update invoices', category: 'invoices' },
    { name: 'invoices:delete', description: 'Delete invoices', category: 'invoices' },
    { name: 'analytics:read', description: 'View analytics', category: 'analytics' },
    { name: 'reports:read', description: 'View reports', category: 'reports' },
    { name: 'reports:create', description: 'Create reports', category: 'reports' },
    { name: 'settings:read', description: 'View settings', category: 'settings' },
    { name: 'settings:update', description: 'Update settings', category: 'settings' }
  ],
  provider: [
    { name: 'services:read', description: 'View services', category: 'services' },
    { name: 'services:create', description: 'Create services', category: 'services' },
    { name: 'services:update', description: 'Update services', category: 'services' },
    { name: 'services:delete', description: 'Delete services', category: 'services' },
    { name: 'bookings:read', description: 'View bookings', category: 'bookings' },
    { name: 'bookings:update', description: 'Update bookings', category: 'bookings' },
    { name: 'invoices:read', description: 'View invoices', category: 'invoices' },
    { name: 'invoices:create', description: 'Create invoices', category: 'invoices' },
    { name: 'invoices:update', description: 'Update invoices', category: 'invoices' },
    { name: 'analytics:read', description: 'View analytics', category: 'analytics' },
    { name: 'reports:read', description: 'View reports', category: 'reports' },
    { name: 'settings:read', description: 'View settings', category: 'settings' },
    { name: 'settings:update', description: 'Update settings', category: 'settings' }
  ],
  client: [
    { name: 'services:read', description: 'View services', category: 'services' },
    { name: 'bookings:read', description: 'View bookings', category: 'bookings' },
    { name: 'bookings:create', description: 'Create bookings', category: 'bookings' },
    { name: 'invoices:read', description: 'View invoices', category: 'invoices' },
    { name: 'reviews:read', description: 'View reviews', category: 'reviews' },
    { name: 'reviews:create', description: 'Create reviews', category: 'reviews' },
    { name: 'settings:read', description: 'View settings', category: 'settings' },
    { name: 'settings:update', description: 'Update settings', category: 'settings' }
  ],
  staff: [
    { name: 'bookings:read', description: 'View bookings', category: 'bookings' },
    { name: 'bookings:update', description: 'Update bookings', category: 'bookings' },
    { name: 'users:read', description: 'View users', category: 'users' },
    { name: 'reports:read', description: 'View reports', category: 'reports' },
    { name: 'settings:read', description: 'View settings', category: 'settings' }
  ],
  manager: [
    { name: 'providers:read', description: 'View providers', category: 'providers' },
    { name: 'providers:update', description: 'Update providers', category: 'providers' },
    { name: 'bookings:read', description: 'View bookings', category: 'bookings' },
    { name: 'bookings:update', description: 'Update bookings', category: 'bookings' },
    { name: 'reports:read', description: 'View reports', category: 'reports' },
    { name: 'reports:create', description: 'Create reports', category: 'reports' },
    { name: 'settings:read', description: 'View settings', category: 'settings' }
  ]
}

export function usePermissions(userRole: string | null, userId: string | null) {
  return useMemo(() => {
    if (!userRole || !userId) {
      return {
        permissions: [],
        hasPermission: () => false,
        canAccess: () => false
      }
    }

    try {
      const permissions = rolePermissions[userRole] || []

      const hasPermission = (permission: string): boolean => {
        if (!permission) {
          console.warn('usePermissions: permission parameter is required')
          return false
        }
        return permissions.some(p => p.name === permission) || permissions.some(p => p.name === 'all')
      }

      const canAccess = (permission: string): boolean => {
        return hasPermission(permission)
      }

      return {
        permissions,
        hasPermission,
        canAccess
      }
    } catch (error) {
      console.error('usePermissions error:', error)
      return {
        permissions: [],
        hasPermission: () => false,
        canAccess: () => false
      }
    }
  }, [userRole, userId])
}