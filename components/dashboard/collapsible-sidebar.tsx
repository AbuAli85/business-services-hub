'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface CollapsibleSidebarProps {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  className?: string
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Services', href: '/dashboard/services', icon: Briefcase },
  { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
  { name: 'Earnings', href: '/dashboard/provider/earnings', icon: DollarSign },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Help', href: '/dashboard/help', icon: HelpCircle },
]

export function CollapsibleSidebar({ collapsed, setCollapsed, className }: CollapsibleSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

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
        "fixed top-0 left-0 h-screen bg-white border-r border-gray-200 shadow-lg z-30 transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        className
      )}>
        <div className="flex flex-col h-full">
          {/* Header with collapse button */}
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {!collapsed && (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">BusinessHub</span>
                </div>
              )}
              
              {/* Collapse button - only show on desktop */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex h-8 w-8 p-0 hover:bg-gray-100"
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
          </div>


          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
                    isActive
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                    collapsed ? "justify-center" : ""
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                  )} />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200">
            {!collapsed && (
              <div className="text-xs text-gray-500 text-center">
                BusinessHub v1.0
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
