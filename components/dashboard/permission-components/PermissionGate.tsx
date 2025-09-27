'use client'

import { ReactNode } from 'react'
import { Permission, usePermissions } from '@/lib/permissions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Lock, AlertTriangle } from 'lucide-react'

interface PermissionGateProps {
  permission: Permission | Permission[]
  fallback?: ReactNode
  showError?: boolean
  children: ReactNode
  userRole: string | null
  userId: string | null
}

export function PermissionGate({ 
  permission, 
  fallback, 
  showError = true, 
  children, 
  userRole, 
  userId 
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission } = usePermissions(
    userRole as any, 
    userId
  )

  const hasAccess = Array.isArray(permission) 
    ? hasAnyPermission(permission)
    : hasPermission(permission)

  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (showError) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <Lock className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          You don't have permission to access this feature.
        </AlertDescription>
      </Alert>
    )
  }

  return null
}

interface ConditionalRenderProps {
  condition: boolean
  fallback?: ReactNode
  children: ReactNode
}

export function ConditionalRender({ condition, fallback, children }: ConditionalRenderProps) {
  if (condition) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return null
}

interface RoleBasedContentProps {
  allowedRoles: string[]
  userRole: string | null
  children: ReactNode
  fallback?: ReactNode
}

export function RoleBasedContent({ 
  allowedRoles, 
  userRole, 
  children, 
  fallback 
}: RoleBasedContentProps) {
  const hasAccess = userRole && allowedRoles.includes(userRole)

  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return null
}
