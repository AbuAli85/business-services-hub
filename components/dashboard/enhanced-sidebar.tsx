'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  LayoutDashboard,
  Briefcase,
  Calendar,
  DollarSign,
  MessageSquare,
  Settings,
  Menu,
  X,
  User,
  BarChart3,
  HelpCircle,
  FileText,
  Users,
  Shield,
  Package,
  Receipt,
  Bell,
  TrendingUp,
  Home,
  Search
} from 'lucide-react'

interface NavigationItem {
  name: string
  href: string
  icon: any
  badge?: string
}

interface EnhancedSidebarProps {
  userRole?: 'admin' | 'provider' | 'client'
  className?: string
}

// Base navigation items for all users
const baseNavigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Help', href: '/dashboard/help', icon: HelpCircle },
]

// Provider-specific navigation
const providerNavigation: NavigationItem[] = [
  { name: 'My Services', href: '/dashboard/services', icon: Briefcase },
  { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
  { name: 'Earnings', href: '/dashboard/provider/earnings', icon: DollarSign },
  { name: 'My Invoices', href: '/dashboard/provider/invoices', icon: FileText },
]

// Admin-specific navigation
const adminNavigation: NavigationItem[] = [
  { name: 'Services', href: '/dashboard/admin/services', icon: Briefcase, badge: 'Admin' },
  { name: 'Users', href: '/dashboard/admin/users', icon: Users, badge: 'Admin' },
  { name: 'Permissions', href: '/dashboard/admin/permissions', icon: Shield, badge: 'Admin' },
  { name: 'Suggestions', href: '/dashboard/suggestions', icon: Package },
  { name: 'All Invoices', href: '/dashboard/admin/invoices', icon: Receipt, badge: 'Admin' },
  { name: 'Reports', href: '/dashboard/admin/reports', icon: FileText, badge: 'Admin' },
  { name: 'Notifications', href: '/dashboard/admin/notifications', icon: Bell, badge: 'Admin' },
]

// Client-specific navigation
const clientNavigation: NavigationItem[] = [
  { name: 'Browse Services', href: '/services', icon: Search },
  { name: 'My Bookings', href: '/dashboard/bookings', icon: Calendar },
  { name: 'My Invoices', href: '/dashboard/client/invoices', icon: FileText },
  { name: 'My Profile', href: '/dashboard/profile', icon: User },
]

export function EnhancedSidebar({ userRole = 'provider', className }: EnhancedSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  // Get navigation based on user role
  const getNavigation = () => {
    let navigation = [...baseNavigation]
    
    switch (userRole) {
      case 'admin':
        navigation = [...adminNavigation, ...baseNavigation]
        break
      case 'provider':
        navigation = [...providerNavigation, ...baseNavigation]
        break
      case 'client':
        navigation = [...clientNavigation, ...baseNavigation]
        break
    }
    
    return navigation
  }

  const navigation = getNavigation()

  // Enhanced active state detection
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  // Get user role display info
  const getRoleInfo = () => {
    switch (userRole) {
      case 'admin':
        return { label: 'Administrator', status: 'Active', color: 'bg-red-100 text-red-800' }
      case 'provider':
        return { label: 'Service Provider', status: 'Active', color: 'bg-blue-100 text-blue-800' }
      case 'client':
        return { label: 'Client', status: 'Active', color: 'bg-green-100 text-green-800' }
      default:
        return { label: 'User', status: 'Active', color: 'bg-gray-100 text-gray-800' }
    }
  }

  const roleInfo = getRoleInfo()

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white shadow-md"
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 shadow-lg z-30 transform transition-transform duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        className
      )}>
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">BusinessHub</span>
                <div className="text-xs text-gray-500">Oman</div>
              </div>
            </div>
          </div>

          {/* User Profile */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{roleInfo.label}</p>
                <div className="flex items-center space-x-2">
                  <Badge className={cn("text-xs", roleInfo.color)}>
                    {roleInfo.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const active = isActive(item.href)
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                    active
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 shadow-sm"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className={cn(
                      "h-5 w-5 transition-colors",
                      active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                    )} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Quick Actions */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="space-y-2">
              <Link href="/" className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                <Home className="h-4 w-4" />
                <span>View Public Site</span>
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              BusinessHub v2.0
              <div className="mt-1 text-gray-400">Oman Business Services</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
