'use client'

import { ReactNode } from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { Permission, usePermissions } from '@/lib/permissions'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Lock } from 'lucide-react'

interface ActionButtonProps extends Omit<ButtonProps, 'onClick'> {
  permission: Permission | Permission[]
  onClick?: () => void
  children: ReactNode
  userRole: string | null
  userId: string | null
  disabled?: boolean
  tooltip?: string
  showLockIcon?: boolean
}

export function ActionButton({
  permission,
  onClick,
  children,
  userRole,
  userId,
  disabled = false,
  tooltip,
  showLockIcon = true,
  ...buttonProps
}: ActionButtonProps) {
  const { hasPermission, hasAnyPermission } = usePermissions(
    userRole as any, 
    userId
  )

  const hasAccess = Array.isArray(permission) 
    ? hasAnyPermission(permission)
    : hasPermission(permission)

  const isDisabled = disabled || !hasAccess

  const button = (
    <Button
      {...buttonProps}
      onClick={hasAccess ? onClick : undefined}
      disabled={isDisabled}
      className={`${buttonProps.className || ''} ${!hasAccess ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {!hasAccess && showLockIcon && <Lock className="h-4 w-4 mr-2" />}
      {children}
    </Button>
  )

  if (tooltip && !hasAccess) {
    return (
      <TooltipProvider>
        <Tooltip content={tooltip || 'You need permission to perform this action'}>
          {button}
        </Tooltip>
      </TooltipProvider>
    )
  }

  return button
}

interface PermissionButtonGroupProps {
  children: ReactNode
  userRole: string | null
  userId: string | null
  className?: string
}

export function PermissionButtonGroup({ 
  children, 
  userRole, 
  userId, 
  className = '' 
}: PermissionButtonGroupProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {children}
    </div>
  )
}
