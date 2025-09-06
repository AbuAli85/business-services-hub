'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  RefreshCw, 
  Bell, 
  Settings, 
  User, 
  LogOut,
  Menu
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TopbarProps {
  title: string
  subtitle?: string
  onRefresh?: () => void
  refreshing?: boolean
  className?: string
}

export function Topbar({ 
  title, 
  subtitle, 
  onRefresh, 
  refreshing = false, 
  className 
}: TopbarProps) {
  const router = useRouter()

  const handleLogout = async () => {
    // Add logout logic here
    router.push('/auth/sign-in')
  }

  return (
    <div className={`sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm ${className}`}>
      <div className="h-16 flex items-center justify-between px-6">
        {/* Left side - Title */}
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-3">
          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            </Button>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              3
            </span>
          </Button>

          {/* User Menu - Simple version */}
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-gray-600" />
              </div>
              <span className="hidden sm:inline text-sm font-medium">Provider</span>
            </Button>
            
            {/* Simple menu buttons */}
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/settings')}>
              <Settings className="h-4 w-4" />
            </Button>
            
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-600 hover:text-red-700">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
