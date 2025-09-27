'use client'

import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  Package, 
  User, 
  Settings, 
  BarChart3, 
  Bell,
  HelpCircle,
  LogOut
} from 'lucide-react'

interface RoleBasedLayoutProps {
  role: 'admin' | 'provider' | 'client' | 'staff' | null
  children: ReactNode
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
  const getRoleConfig = () => {
    switch (role) {
      case 'admin':
        return {
          title: 'Administrator Dashboard',
          icon: Shield,
          color: 'bg-red-50 border-red-200',
          badgeColor: 'bg-red-100 text-red-800',
          primaryActions: [
            { label: 'Users', path: '/dashboard/users', icon: User },
            { label: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
            { label: 'Settings', path: '/dashboard/settings', icon: Settings },
          ],
          secondaryActions: [
            { label: 'Services', path: '/dashboard/services' },
            { label: 'Bookings', path: '/dashboard/bookings' },
            { label: 'Reports', path: '/dashboard/reports' },
          ]
        }
      case 'provider':
        return {
          title: 'Provider Dashboard',
          icon: Package,
          color: 'bg-blue-50 border-blue-200',
          badgeColor: 'bg-blue-100 text-blue-800',
          primaryActions: [
            { label: 'My Services', path: '/dashboard/services', icon: Package },
            { label: 'Bookings', path: '/dashboard/bookings', icon: BarChart3 },
            { label: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
          ],
          secondaryActions: [
            { label: 'Create Service', path: '/dashboard/services/create' },
            { label: 'Profile', path: '/dashboard/profile' },
            { label: 'Settings', path: '/dashboard/settings' },
          ]
        }
      case 'client':
        return {
          title: 'Client Dashboard',
          icon: User,
          color: 'bg-green-50 border-green-200',
          badgeColor: 'bg-green-100 text-green-800',
          primaryActions: [
            { label: 'Browse Services', path: '/dashboard/services', icon: Package },
            { label: 'My Bookings', path: '/dashboard/bookings', icon: BarChart3 },
            { label: 'Favorites', path: '/dashboard/favorites', icon: User },
          ],
          secondaryActions: [
            { label: 'Profile', path: '/dashboard/profile' },
            { label: 'History', path: '/dashboard/history' },
            { label: 'Settings', path: '/dashboard/settings' },
          ]
        }
      case 'staff':
        return {
          title: 'Staff Dashboard',
          icon: Settings,
          color: 'bg-purple-50 border-purple-200',
          badgeColor: 'bg-purple-100 text-purple-800',
          primaryActions: [
            { label: 'Bookings', path: '/dashboard/bookings', icon: BarChart3 },
            { label: 'Users', path: '/dashboard/users', icon: User },
            { label: 'Support', path: '/dashboard/support', icon: HelpCircle },
          ],
          secondaryActions: [
            { label: 'Reports', path: '/dashboard/reports' },
            { label: 'Settings', path: '/dashboard/settings' },
          ]
        }
      default:
        return {
          title: 'Dashboard',
          icon: User,
          color: 'bg-gray-50 border-gray-200',
          badgeColor: 'bg-gray-100 text-gray-800',
          primaryActions: [],
          secondaryActions: []
        }
    }
  }

  const config = getRoleConfig()
  const Icon = config.icon

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Role Header */}
      <div className={`${config.color} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Icon className="h-6 w-6 text-gray-700" />
                <h1 className="text-xl font-semibold text-gray-900">
                  {config.title}
                </h1>
                <Badge className={config.badgeColor}>
                  {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User'}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              {notifications > 0 && (
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-5 w-5" />
                  {notifications > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications > 9 ? '9+' : notifications}
                    </span>
                  )}
                </Button>
              )}
              
              {/* Logout */}
              <Button variant="ghost" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 py-4">
            {config.primaryActions.map((action) => (
              <Button
                key={action.path}
                variant="ghost"
                onClick={() => onNavigate(action.path)}
                className="flex items-center space-x-2"
              >
                <action.icon className="h-4 w-4" />
                <span>{action.label}</span>
              </Button>
            ))}
            
            {config.secondaryActions.length > 0 && (
              <div className="flex items-center space-x-2 ml-auto">
                {config.secondaryActions.map((action) => (
                  <Button
                    key={action.path}
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate(action.path)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-6">
            {children}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
