'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getSupabaseClient } from '@/lib/supabase'
import { NotificationBell } from '@/components/ui/notification-bell'
import { 
  Home, 
  Briefcase, 
  Calendar, 
  MessageSquare, 
  User, 
  Settings, 
  LogOut,
  Menu,
  X,
  Building2,
  Users,
  BarChart3,
  FileText,
  Bell
} from 'lucide-react'

interface UserProfile {
  id: string
  role: 'admin' | 'provider' | 'client' | 'staff' | null
  full_name: string
  company_name?: string
}

interface Notification {
  id: string
  type: 'booking' | 'payment' | 'message' | 'system'
  title: string
  message: string
  is_read: boolean
  created_at: string
  priority: 'low' | 'medium' | 'high'
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showRoleSelector, setShowRoleSelector] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkUser()
    fetchNotifications()
  }, [])

  const checkUser = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/sign-in')
        return
      }

      // Use user metadata from auth instead of database profile
      const userMetadata = session.user.user_metadata
      console.log('User metadata:', userMetadata)
      
      let userRole = userMetadata?.role
      console.log('Initial role from metadata:', userRole)
      
      // If no role in metadata, try to get it from the profiles table
      if (!userRole) {
        try {
          console.log('Checking profiles table for role...')
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          
          console.log('Profile data result:', { profileData, profileError })
          
          if (!profileError && profileData?.role) {
            userRole = profileData.role
            console.log('Role found in profiles table:', userRole)
          }
        } catch (profileError) {
          console.log('Could not fetch role from profiles table:', profileError)
        }
      }
      
      // Don't default to 'client' - let the role selector handle it
      if (!userRole) {
        console.log('No role found, will show role selector')
      }
      
      const finalUser = {
        id: session.user.id,
        role: userRole,
        full_name: userMetadata?.full_name || 'User',
        company_name: undefined
      }
      
      console.log('Final user state:', finalUser)
      setUser(finalUser)
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/auth/sign-in')
    } finally {
      setLoading(false)
    }
  }

  const fetchNotifications = async () => {
    try {
      // Mock notifications for now
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'booking',
          title: 'New Booking Request',
          message: 'Ahmed Al-Rashid requested your Digital Marketing service',
          is_read: false,
          created_at: new Date(Date.now() - 1800000).toISOString(),
          priority: 'high'
        },
        {
          id: '2',
          type: 'payment',
          title: 'Payment Received',
          message: 'OMR 250 received for Digital Marketing Campaign',
          is_read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          priority: 'medium'
        },
        {
          id: '3',
          type: 'message',
          title: 'New Message',
          message: 'Fatima Al-Zahra sent you a message',
          is_read: true,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          priority: 'low'
        }
      ]
      setNotifications(mockNotifications)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    )
  }

  const handleMarkAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, is_read: true }))
    )
  }

  const handleRoleSelection = async (selectedRole: 'admin' | 'provider' | 'client' | 'staff') => {
    try {
      const supabase = await getSupabaseClient()
      
      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { role: selectedRole }
      })
      
      if (updateError) {
        console.error('Error updating user metadata:', updateError)
        return
      }
      
      // Update local state
      setUser(prev => prev ? { ...prev, role: selectedRole } : null)
      setShowRoleSelector(false)
      
      // Also update the profiles table if possible
      try {
        await supabase
          .from('profiles')
          .upsert({
            id: user?.id,
            role: selectedRole,
            updated_at: new Date().toISOString()
          })
      } catch (profileError) {
        console.log('Could not update profiles table:', profileError)
      }
      
    } catch (error) {
      console.error('Error setting user role:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      const supabase = await getSupabaseClient()
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      // Force redirect even if signout fails
      router.push('/')
    }
  }

  const getNavigationItems = () => {
    if (!user || !user.role) return []

    const baseItems = [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
      { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
      { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ]

    if (user.role === 'admin') {
      baseItems.splice(1, 0, 
        { name: 'Services', href: '/dashboard/services', icon: Briefcase },
        { name: 'Users', href: '/dashboard/admin/users', icon: Users },
        { name: 'Analytics', href: '/dashboard/admin/analytics', icon: BarChart3 },
        { name: 'Reports', href: '/dashboard/admin/reports', icon: FileText },
        { name: 'Profile', href: '/dashboard/profile', icon: User }
      )
    }

    if (user.role === 'provider') {
      baseItems.splice(1, 0, 
        { name: 'My Services', href: `/dashboard/services`, icon: Building2 },
        { name: 'Company', href: '/dashboard/company', icon: Building2 },
        { name: 'Earnings', href: `/dashboard/provider/earnings`, icon: BarChart3 },
        { name: 'Profile', href: '/dashboard/profile', icon: User }
      )
    }

    if (user.role === 'client') {
      baseItems.splice(1, 0, 
        { name: 'Services', href: '/dashboard/services', icon: Briefcase },
        { name: 'Profile', href: '/dashboard/profile', icon: User }
      )
    }

    return baseItems
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Show role selector if user doesn't have a role set
  if (!user.role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold text-center mb-6">Welcome, {user.full_name}!</h2>
          <p className="text-gray-600 text-center mb-6">
            Please select your role to continue using the platform.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => handleRoleSelection('provider')}
              className="w-full h-12 text-left justify-start"
              variant="outline"
            >
              <Building2 className="h-5 w-5 mr-3" />
              <div>
                <div className="font-medium">Service Provider</div>
                <div className="text-sm text-gray-500">Offer services to clients</div>
              </div>
            </Button>
            <Button
              onClick={() => handleRoleSelection('client')}
              className="w-full h-12 text-left justify-start"
              variant="outline"
            >
              <User className="h-5 w-5 mr-3" />
              <div>
                <div className="font-medium">Client</div>
                <div className="text-sm text-gray-500">Find and book services</div>
              </div>
            </Button>
            <Button
              onClick={() => handleRoleSelection('admin')}
              className="w-full h-12 text-left justify-start"
              variant="outline"
            >
              <Users className="h-5 w-5 mr-3" />
              <div>
                <div className="font-medium">Administrator</div>
                <div className="text-sm text-gray-500">Manage platform and users</div>
              </div>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const navigationItems = getNavigationItems()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h1 className="text-xl font-bold text-gray-900">Business Hub</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
              title="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Profile */}
          <div className="p-6 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">
                  {user.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{user.full_name}</p>
                <p className="text-sm text-gray-500 capitalize">{user.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6">
            <ul className="space-y-2">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Sign Out */}
          <div className="p-6 border-t">
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-3 w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
                title="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900">
                {navigationItems.find(item => item.href === pathname)?.name || 'Dashboard'}
              </h2>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <NotificationBell
                count={notifications.filter(n => !n.is_read).length}
                onClick={() => setSidebarOpen(false)}
              />
              
              {/* Role Debug Button (temporary) */}
              {user.role && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRoleSelector(true)}
                  className="text-xs"
                >
                  Change Role ({user.role})
                </Button>
              )}
              
              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role || 'No Role'}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {user.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
      
      {/* Role Selection Modal */}
      {showRoleSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-center mb-6">Select Your Role</h2>
            <p className="text-gray-600 text-center mb-6">
              Choose how you want to use the platform.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => handleRoleSelection('provider')}
                className="w-full h-12 text-left justify-start"
                variant="outline"
              >
                <Building2 className="h-5 w-5 mr-3" />
                <div>
                  <div className="font-medium">Service Provider</div>
                  <div className="text-sm text-gray-500">Offer services to clients</div>
                </div>
              </Button>
              <Button
                onClick={() => handleRoleSelection('client')}
                className="w-full h-12 text-left justify-start"
                variant="outline"
              >
                <User className="h-5 w-5 mr-3" />
                <div>
                  <div className="font-medium">Client</div>
                  <div className="text-sm text-gray-500">Find and book services</div>
                </div>
              </Button>
              <Button
                onClick={() => handleRoleSelection('admin')}
                className="w-full h-12 text-left justify-start"
                variant="outline"
              >
                <Users className="h-5 w-5 mr-3" />
                <div>
                  <div className="font-medium">Administrator</div>
                  <div className="text-sm text-gray-500">Manage platform and users</div>
                </div>
              </Button>
            </div>
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => setShowRoleSelector(false)}
                className="text-gray-500"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
