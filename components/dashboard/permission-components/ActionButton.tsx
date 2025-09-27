import React from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { PermissionGate } from './PermissionGate'

interface ActionButtonProps extends Omit<ButtonProps, 'onClick'> {
  permission: string
  userRole: string | null
  userId: string | null
  onClick: () => void
  tooltip?: string
  showError?: boolean
}

export function ActionButton({
  permission,
  userRole,
  userId,
  onClick,
  tooltip,
  showError = false,
  ...buttonProps
}: ActionButtonProps) {
  return (
    <PermissionGate
      permission={permission}
      userRole={userRole}
      userId={userId}
      showError={showError}
    >
      <Button
        {...buttonProps}
        onClick={onClick}
        title={tooltip}
      />
    </PermissionGate>
  )
}

interface PermissionButtonGroupProps {
  userRole: string | null
  userId: string | null
  children: React.ReactNode
  className?: string
}

export function PermissionButtonGroup({
  userRole,
  userId,
  children,
  className
}: PermissionButtonGroupProps) {
  return (
    <div className={`flex items-center space-x-2 ${className || ''}`}>
      {children}
    </div>
  )
}