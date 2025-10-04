/**
 * Icon Button with Tooltip
 * Accessible button component with tooltip for icon-only buttons
 */

'use client'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { type ButtonProps } from '@/components/ui/button'

interface IconButtonWithTooltipProps extends ButtonProps {
  tooltip: string
  icon: React.ReactNode
  ariaLabel: string
}

export function IconButtonWithTooltip({
  tooltip,
  icon,
  ariaLabel,
  className,
  ...buttonProps
}: IconButtonWithTooltipProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            aria-label={ariaLabel}
            className={className}
            {...buttonProps}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Button with Tooltip (for text buttons)
 */
interface ButtonWithTooltipProps extends ButtonProps {
  tooltip: string
  children: React.ReactNode
}

export function ButtonWithTooltip({
  tooltip,
  children,
  ...buttonProps
}: ButtonWithTooltipProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button {...buttonProps}>
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Status Badge with Tooltip
 */
interface StatusBadgeWithTooltipProps {
  status: string
  tooltipText: string
  className?: string
}

export function StatusBadgeWithTooltip({
  status,
  tooltipText,
  className = '',
}: StatusBadgeWithTooltipProps) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
    completed: 'bg-green-100 text-green-800 border-green-300',
    on_hold: 'bg-gray-100 text-gray-800 border-gray-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    on_hold: 'On Hold',
    cancelled: 'Cancelled',
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              statusColors[status] || statusColors.pending
            } ${className} cursor-help`}
          >
            {statusLabels[status] || status}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Info Icon with Tooltip
 */
interface InfoTooltipProps {
  content: string
  icon?: React.ReactNode
}

export function InfoTooltip({ content, icon }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center cursor-help">
            {icon || (
              <svg
                className="w-4 h-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

