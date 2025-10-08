import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  Settings, 
  LogOut, 
  User,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'

interface RoleBasedLayoutProps {
  role: string | null
  children: React.ReactNode
  onNavigate: (path: string) => void
  onLogout: () => void
  notifications?: number
}

export function RoleBasedLayout({
  role,
  children,
  onNavigate,
  onLogout,
  notifications = 0
}: RoleBasedLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add error boundary
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => setError(null)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case 'admin': return 'bg-red-500'
      case 'provider': return 'bg-blue-500'
      case 'client': return 'bg-green-500'
      case 'staff': return 'bg-purple-500'
      case 'manager': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  const getRoleDisplayName = (role: string | null) => {
    switch (role) {
      case 'admin': return 'Administrator'
      case 'provider': return 'Service Provider'
      case 'client': return 'Client'
      case 'staff': return 'Staff Member'
      case 'manager': return 'Manager'
      default: return 'User'
    }
  }

  const getNavigationItems = (role: string | null) => {
    const baseItems = [
      { name: 'Dashboard', path: '/dashboard', icon: '📊' },
      { name: 'Services', path: '/dashboard/services', icon: '🔧' },
      { name: 'Bookings', path: '/dashboard/bookings', icon: '📅' }
    ]

    switch (role) {
      case 'admin':
        return [
          ...baseItems,
          { name: 'Users', path: '/dashboard/users', icon: '👥' },
          { name: 'Analytics', path: '/dashboard/analytics', icon: '📈' },
          { name: 'Settings', path: '/dashboard/settings', icon: '⚙️' }
        ]
      case 'provider':
        return [
          ...baseItems,
          { name: 'My Services', path: '/dashboard/services', icon: '🔧' },
          { name: 'Analytics', path: '/dashboard/analytics', icon: '📈' },
          { name: 'Settings', path: '/dashboard/settings', icon: '⚙️' }
        ]
      case 'client':
        return [
          ...baseItems,
          { name: 'Favorites', path: '/dashboard/favorites', icon: '❤️' },
          { name: 'History', path: '/dashboard/history', icon: '📋' },
          { name: 'Settings', path: '/dashboard/settings', icon: '⚙️' }
        ]
      case 'staff':
        return [
          ...baseItems,
          { name: 'Users', path: '/dashboard/users', icon: '👥' },
          { name: 'Reports', path: '/dashboard/reports', icon: '📊' },
          { name: 'Settings', path: '/dashboard/settings', icon: '⚙️' }
        ]
      case 'manager':
        return [
          ...baseItems,
          { name: 'Providers', path: '/dashboard/providers', icon: '👥' },
          { name: 'Reports', path: '/dashboard/reports', icon: '📊' },
          { name: 'Settings', path: '/dashboard/settings', icon: '⚙️' }
        ]
      default:
        return baseItems
    }
  }

  const navigationItems = getNavigationItems(role)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Navigation</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="p-4 space-y-2">
            {navigationItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  onNavigate(item.path)
                  setSidebarOpen(false)
                }}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </Button>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${getRoleColor(role)}`} />
            <div>
              <h1 className="text-lg font-semibold">Business Hub</h1>
              <p className="text-sm text-gray-500">{getRoleDisplayName(role)}</p>
            </div>
          </div>
        </div>
        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className="w-full justify-start"
              onClick={() => onNavigate(item.path)}
            >
              <span className="mr-2">{item.icon}</span>
              {item.name}
            </Button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Mobile menu button - Only show on mobile */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <Button
            variant="ghost"
            size="sm"
            className="bg-white shadow-md"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Page content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}