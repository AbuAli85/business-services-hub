'use client'

import { cn } from '@/lib/utils'

interface PlatformLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon' | 'text'
}

export function PlatformLogo({ 
  className, 
  size = 'md', 
  variant = 'full' 
}: PlatformLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl'
  }

  const iconSize = sizeClasses[size]
  const textSize = textSizeClasses[size]

  if (variant === 'icon') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <svg
          viewBox="0 0 40 40"
          className={cn(iconSize, 'text-blue-600')}
          fill="currentColor"
        >
          {/* Business Hub Icon - Building with Network */}
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>
          
          {/* Main Building */}
          <rect x="8" y="12" width="24" height="20" rx="2" fill="url(#logoGradient)" />
          
          {/* Building Windows */}
          <rect x="12" y="16" width="3" height="3" rx="0.5" fill="white" opacity="0.8" />
          <rect x="17" y="16" width="3" height="3" rx="0.5" fill="white" opacity="0.8" />
          <rect x="22" y="16" width="3" height="3" rx="0.5" fill="white" opacity="0.8" />
          <rect x="12" y="21" width="3" height="3" rx="0.5" fill="white" opacity="0.8" />
          <rect x="17" y="21" width="3" height="3" rx="0.5" fill="white" opacity="0.8" />
          <rect x="22" y="21" width="3" height="3" rx="0.5" fill="white" opacity="0.8" />
          <rect x="12" y="26" width="3" height="3" rx="0.5" fill="white" opacity="0.8" />
          <rect x="17" y="26" width="3" height="3" rx="0.5" fill="white" opacity="0.8" />
          <rect x="22" y="26" width="3" height="3" rx="0.5" fill="white" opacity="0.8" />
          
          {/* Network Nodes */}
          <circle cx="6" cy="8" r="2" fill="#10B981" />
          <circle cx="34" cy="8" r="2" fill="#10B981" />
          <circle cx="20" cy="6" r="2" fill="#F59E0B" />
          
          {/* Connection Lines */}
          <line x1="8" y1="8" x2="6" y2="8" stroke="#6B7280" strokeWidth="1" />
          <line x1="32" y1="8" x2="34" y2="8" stroke="#6B7280" strokeWidth="1" />
          <line x1="20" y1="6" x2="20" y2="12" stroke="#6B7280" strokeWidth="1" />
        </svg>
      </div>
    )
  }

  if (variant === 'text') {
    return (
      <div className={cn('flex items-center', className)}>
        <span className={cn('font-bold text-blue-600', textSize)}>
          BusinessHub
        </span>
      </div>
    )
  }

  // Full logo with icon and text
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 40 40"
        className={cn(iconSize, 'text-blue-600')}
        fill="currentColor"
      >
        {/* Business Hub Icon - Building with Network */}
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>
        
        {/* Main Building */}
        <rect x="8" y="12" width="24" height="20" rx="2" fill="url(#logoGradient)" />
        
        {/* Building Windows */}
        <rect x="12" y="16" width="3" height="3" rx="0.5" fill="white" opacity="0.8" />
        <rect x="17" y="16" width="3" height="3" rx="0.5" fill="white" opacity="0.8" />
        <rect x="22" y="16" width="3" height="3" rx="0.5" fill="white" opacity="0.8" />
        <rect x="12" y="21" width="3" height="3" rx="0.5" fill="white" opacity="0.8" />
        <rect x="17" y="21" width="3" height="3" rx="0.5" fill="white" opacity="0.8" />
        <rect x="22" y="21" width="3" height="3" rx="0.5" fill="white" opacity="0.8" />
        <rect x="12" y="26" width="3" height="3" rx="0.5" fill="white" opacity="0.8" />
        <rect x="17" y="26" width="3" height="3" rx="0.5" fill="white" opacity="0.8" />
        <rect x="22" y="26" width="3" height="3" rx="0.5" fill="white" opacity="0.8" />
        
        {/* Network Nodes */}
        <circle cx="6" cy="8" r="2" fill="#10B981" />
        <circle cx="34" cy="8" r="2" fill="#10B981" />
        <circle cx="20" cy="6" r="2" fill="#F59E0B" />
        
        {/* Connection Lines */}
        <line x1="8" y1="8" x2="6" y2="8" stroke="#6B7280" strokeWidth="1" />
        <line x1="32" y1="8" x2="34" y2="8" stroke="#6B7280" strokeWidth="1" />
        <line x1="20" y1="6" x2="20" y2="12" stroke="#6B7280" strokeWidth="1" />
      </svg>
      
      <div className="flex flex-col">
        <span className={cn('font-bold text-blue-600 leading-tight', textSize)}>
          BusinessHub
        </span>
        <span className={cn('text-gray-500 font-medium leading-tight', 
          size === 'sm' ? 'text-xs' : 
          size === 'md' ? 'text-sm' : 
          size === 'lg' ? 'text-base' : 'text-lg'
        )}>
          Services Platform
        </span>
      </div>
    </div>
  )
}
