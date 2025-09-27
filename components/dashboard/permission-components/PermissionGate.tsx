import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

interface PermissionGateProps {
  permission: string
  userRole: string | null
  userId: string | null
  children: React.ReactNode
  fallback?: React.ReactNode
  showError?: boolean
}

export function PermissionGate({
  permission,
  userRole,
  userId,
  children,
  fallback = null,
  showError = true
}: PermissionGateProps) {
  // Add error handling for invalid inputs
  if (!permission) {
    console.warn('PermissionGate: permission prop is required')
    return <>{fallback}</>
  }

  if (!userRole || !userId) {
    if (showError) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Authentication required to access this feature.
          </AlertDescription>
        </Alert>
      )
    }
    return <>{fallback}</>
  }

  try {
    const hasPermission = checkPermission(permission, userRole, userId)

    if (hasPermission) {
      return <>{children}</>
    }

    if (showError) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this feature.
          </AlertDescription>
        </Alert>
      )
    }

    return <>{fallback}</>
  } catch (error) {
    console.error('PermissionGate error:', error)
    if (showError) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error checking permissions. Please try again.
          </AlertDescription>
        </Alert>
      )
    }
    return <>{fallback}</>
  }
}

interface RoleBasedContentProps {
  allowedRoles: string[]
  userRole: string | null
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleBasedContent({
  allowedRoles,
  userRole,
  children,
  fallback = null
}: RoleBasedContentProps) {
  if (!userRole || !allowedRoles.includes(userRole)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

function checkPermission(permission: string, userRole: string | null, userId: string | null): boolean {
  if (!userRole || !userId) return false

  // Define permission mappings for each role
  const rolePermissions: Record<string, string[]> = {
    admin: [
      'all',
      'users:read',
      'users:create',
      'users:update',
      'users:delete',
      'services:read',
      'services:create',
      'services:update',
      'services:delete',
      'bookings:read',
      'bookings:create',
      'bookings:update',
      'bookings:delete',
      'invoices:read',
      'invoices:create',
      'invoices:update',
      'invoices:delete',
      'analytics:read',
      'reports:read',
      'reports:create',
      'settings:read',
      'settings:update'
    ],
    provider: [
      'services:read',
      'services:create',
      'services:update',
      'services:delete',
      'bookings:read',
      'bookings:update',
      'invoices:read',
      'invoices:create',
      'invoices:update',
      'analytics:read',
      'reports:read',
      'settings:read',
      'settings:update'
    ],
    client: [
      'services:read',
      'bookings:read',
      'bookings:create',
      'invoices:read',
      'reviews:read',
      'reviews:create',
      'settings:read',
      'settings:update'
    ],
    staff: [
      'bookings:read',
      'bookings:update',
      'users:read',
      'reports:read',
      'settings:read'
    ],
    manager: [
      'providers:read',
      'providers:update',
      'bookings:read',
      'bookings:update',
      'reports:read',
      'reports:create',
      'settings:read'
    ]
  }

  const userPermissions = rolePermissions[userRole] || []
  
  // Check if user has the specific permission or 'all' permission
  return userPermissions.includes(permission) || userPermissions.includes('all')
}