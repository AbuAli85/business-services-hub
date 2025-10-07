/**
 * Live Mode Toggle Component
 * Provides user control over auto-refresh functionality
 */

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAutoRefresh } from '@/contexts/AutoRefreshContext'
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Loader2 
} from 'lucide-react'

interface LiveModeToggleProps {
  className?: string
  showLabel?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
}

export function LiveModeToggle({ 
  className = '',
  showLabel = true,
  variant = 'outline',
  size = 'default'
}: LiveModeToggleProps) {
  const { 
    isLiveMode, 
    toggleLiveMode, 
    isRefreshing 
  } = useAutoRefresh()

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        onClick={toggleLiveMode}
        variant={variant}
        size={size}
        className={`
          transition-all duration-200
          ${isLiveMode 
            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
          }
          ${isRefreshing ? 'animate-pulse' : ''}
        `}
        disabled={isRefreshing}
      >
        {isRefreshing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isLiveMode ? (
          <Wifi className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        
        {showLabel && (
          <span className="ml-2">
            {isLiveMode ? 'Live Mode' : 'Manual Mode'}
          </span>
        )}
      </Button>

      {isLiveMode && (
        <Badge 
          variant="secondary" 
          className="bg-green-100 text-green-800 border-green-200"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Auto-refresh
        </Badge>
      )}
    </div>
  )
}

// Compact version for headers
export function LiveModeToggleCompact({ className = '' }: { className?: string }) {
  return (
    <LiveModeToggle 
      className={className}
      showLabel={false}
      variant="ghost"
      size="sm"
    />
  )
}

// Full version with description
export function LiveModeToggleFull({ className = '' }: { className?: string }) {
  const { isLiveMode, isRefreshing } = useAutoRefresh()

  return (
    <div className={`space-y-2 ${className}`}>
      <LiveModeToggle showLabel={true} />
      
      <div className="text-xs text-gray-500">
        {isLiveMode ? (
          isRefreshing ? (
            <span className="text-blue-600">Refreshing data...</span>
          ) : (
            <span>Data updates automatically every 30 seconds</span>
          )
        ) : (
          <span>Click to enable automatic data updates</span>
        )}
      </div>
    </div>
  )
}
