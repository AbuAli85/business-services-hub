'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getSupabaseClient } from '@/lib/supabase'
import { NotificationBell } from '@/components/notifications/notification-bell'
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
  Package,
  BarChart3,
  FileText,
  DollarSign,
  Bell
} from 'lucide-react'
import { PlatformLogo } from '@/components/ui/platform-logo'
import { UserLogo } from '@/components/ui/user-logo'

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
  const [userLogoUrl, setUserLogoUrl] = useState<string | null>(null)
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
      // Production logging removed
      
      let userRole = userMetadata?.role
              // Production logging removed
      
      // In production mode, roles must be set during registration
      // No fallback to profiles table or role selection allowed
      
      // In production mode, users must have a role set during registration
      if (!userRole) {
        // Production logging removed
      }
      
      // Fetch company name from profile if user is a provider
      let companyName = undefined
      if (userRole === 'provider') {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', session.user.id)
            .maybeSingle()
          
          if (profile?.company_id) {
            const { data: company } = await supabase
              .from('companies')
              .select('name, logo_url')
              .eq('id', profile.company_id)
              .maybeSingle()
            
            if (company?.name) {
              companyName = company.name
            }
            if (company?.logo_url) {
              setUserLogoUrl(company.logo_url)
            }
          }
        } catch (error) {
          console.warn('Could not fetch company name:', error)
        }
      }

      // Fetch client logo if user is a client
      if (userRole === 'client') {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('logo_url')
            .eq('id', session.user.id)
            .maybeSingle()
          
          if (profile?.logo_url) {
            setUserLogoUrl(profile.logo_url)
          }
        } catch (error) {
          console.warn('Could not fetch client logo:', error)
        }
      }
      
      const finalUser = {
        id: session.user.id,
        role: userRole,
        full_name: userMetadata?.full_name || 'User',
        company_name: companyName
      }
      
              // Production logging removed
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
      { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
      { name: 'Profile', href: '/dashboard/profile', icon: User },
      { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ]

    if (user.role === 'admin') {
      baseItems.splice(1, 0, 
        { name: 'Services', href: '/dashboard/services', icon: Briefcase },
        { name: 'Suggestions', href: '/dashboard/suggestions', icon: Package },
        { name: 'Users', href: '/dashboard/admin/users', icon: Users },
        { name: 'Permissions', href: '/dashboard/admin/permissions', icon: Settings },
        { name: 'Analytics', href: '/dashboard/admin/analytics', icon: BarChart3 },
        { name: 'Reports', href: '/dashboard/admin/reports', icon: FileText },
        { name: 'Invoices', href: '/dashboard/admin/invoices', icon: DollarSign }
      )
    }

    if (user.role === 'provider') {
      baseItems.splice(1, 0, 
        { name: 'My Services', href: `/dashboard/services`, icon: Building2 },
        { name: 'Company', href: '/dashboard/company', icon: Building2 },
        { name: 'Earnings', href: `/dashboard/provider/earnings`, icon: BarChart3 },
        { name: 'Invoices', href: `/dashboard/invoices`, icon: FileText }
      )
      // Update dashboard link to use dynamic route
      baseItems[0] = { name: 'Dashboard', href: `/dashboard/provider/${user.id}`, icon: Home }
    }

    if (user.role === 'client') {
      baseItems.splice(1, 0, 
        { name: 'Services', href: '/dashboard/services', icon: Briefcase },
        { name: 'Invoices', href: `/dashboard/invoices`, icon: FileText }
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

  // In production mode, users must have a role set during registration
  if (!user.role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold text-center mb-6">Access Restricted</h2>
          <p className="text-gray-600 text-center mb-6">
            Your account does not have a valid role assigned. Please contact support to resolve this issue.
          </p>
          <div className="text-center">
            <Button onClick={handleSignOut} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const navigationItems = getNavigationItems()

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-screen">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-4">
              {userLogoUrl ? (
                <div className="flex-shrink-0">
                  <img
                    src={userLogoUrl}
                    alt="Company Logo"
                    className="w-12 h-12 object-contain rounded-lg border border-gray-200 p-1 bg-white shadow-sm"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0">
                  <PlatformLogo size="md" variant="icon" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 truncate">
                  {user?.company_name || 'BusinessHub'}
                </h1>
                <p className="text-sm text-gray-500 truncate">
                  {user?.company_name ? 'Services Platform' : 'Business Services Hub'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
              title="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
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
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* User Logo Watermark */}
        {userLogoUrl && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Main centered watermark */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-3">
              <img
                src={userLogoUrl}
                alt="Company Logo"
                className="w-full h-full object-contain filter grayscale"
              />
            </div>
            {/* Corner watermarks */}
            <div className="absolute top-8 right-8 w-24 h-24 opacity-2">
              <img
                src={userLogoUrl}
                alt="Company Logo"
                className="w-full h-full object-contain filter grayscale"
              />
            </div>
            <div className="absolute bottom-8 left-8 w-20 h-20 opacity-2">
              <img
                src={userLogoUrl}
                alt="Company Logo"
                className="w-full h-full object-contain filter grayscale"
              />
            </div>
          </div>
        )}
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4 flex-shrink-0">
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
              <NotificationBell userId={user.id} />
              
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
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
      

    </div>
  )
}
