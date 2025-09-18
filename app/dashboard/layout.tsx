'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getSupabaseClient } from '@/lib/supabase'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { realtimeManager } from '@/lib/realtime'
import toast from 'react-hot-toast'
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
  Bell,
  Receipt
} from 'lucide-react'
import { getRoleBasedNavigation, getQuickActions, getInvoiceSubNavigation } from '@/components/navigation/role-based-navigation'
import { PlatformLogo } from '@/components/ui/platform-logo'
import { UserLogo } from '@/components/ui/user-logo'
import { SessionManager } from '@/components/ui/session-manager'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { logger } from '@/lib/logger'
import { authLogger } from '@/lib/auth-logger'
import { clearSessionCookies } from '@/lib/utils/session-sync'

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
  priority: 'low' | 'normal' | 'high' | 'urgent'
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
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [userLogoUrl, setUserLogoUrl] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkUser()
    fetchNotifications()
  }, [])

  // Realtime notifications table stream
  useEffect(() => {
    if (!user?.id) return
    ;(async () => {
      try {
        const supabase = await getSupabaseClient()
        const channel = supabase
          .channel(`notifications-${user.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload: any) => {
            const n = payload.new
            const item: any = {
              id: n.id,
              type: n.type || 'system',
              title: n.title,
              message: n.message,
              is_read: n.is_read ?? n.read ?? false,
              created_at: n.created_at,
              priority: n.priority || 'normal'
            }
            setNotifications(prev => [item, ...prev].slice(0, 20) as any)
            setUnreadCount(prev => prev + 1)
            toast.success(item.title + (item.message ? `: ${item.message}` : ''), { duration: 3000 })
          })
          .subscribe()
        return () => {
          try { supabase.removeChannel(channel) } catch {}
        }
      } catch (e) {
        logger.warn('Realtime notifications channel failed', e)
      }
    })()
  }, [user?.id])

  // Realtime notifications for new messages
  useEffect(() => {
    if (!user?.id) return
    let subscriptionKey: string | null = null
    ;(async () => {
      try {
        const sub = await realtimeManager.subscribeToMessages(user.id, (update: any) => {
          if (update.eventType === 'INSERT') {
            const msg = update.new
            toast.success('New message received', { id: `msg-${msg.id}`, duration: 3000 })
            // Optionally fire browser notification
            if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                new Notification('New message', { body: msg.message || msg.content || 'You have a new message.' })
              } else if (Notification.permission !== 'denied') {
                Notification.requestPermission()
              }
            }
          }
        })
        subscriptionKey = `messages:${user.id}`
      } catch (e) {
        logger.warn('Realtime notifications setup failed', e)
      }
    })()
    return () => {
      if (subscriptionKey) realtimeManager.unsubscribe(subscriptionKey)
    }
  }, [user?.id])

  const checkUser = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session fetch error:', sessionError)
        logger.error('Could not fetch session:', sessionError)
        router.push('/auth/sign-in')
        return
      }
      
      if (!session) {
        logger.warn('No active session found')
        router.push('/auth/sign-in')
        return
      }

      // Use user metadata from auth instead of database profile
      const userMetadata = session.user.user_metadata
      
      let userRole = userMetadata?.role
      
      // If no role in metadata, try to get from profile
      if (!userRole) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          
          if (profile?.role) {
            userRole = profile.role
          }
        } catch (error) {
          logger.warn('Could not fetch role from profile:', error)
        }
      }
      
      // If still no role, redirect to onboarding
      if (!userRole) {
        logger.warn('No role found for user, redirecting to onboarding')
        router.push('/auth/onboarding?role=client')
        return
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
          logger.warn('Could not fetch company name:', error)
        }
      }

      // Fetch client/staff logo if user is a client or staff
      if (userRole === 'client' || userRole === 'staff') {
        try {
          // First try to get logo and name from companies table (preferred)
          const { data: company } = await supabase
            .from('companies')
            .select('name, logo_url')
            .eq('owner_id', session.user.id)
            .maybeSingle()
          
          if (company?.logo_url) {
            setUserLogoUrl(company.logo_url)
          }
          if (company?.name) {
            companyName = company.name
          } else {
            // Fallback to profile logo_url if no company logo
            const { data: profile } = await supabase
              .from('profiles')
              .select('logo_url')
              .eq('id', session.user.id)
              .maybeSingle()
            
            if (profile?.logo_url) {
              setUserLogoUrl(profile.logo_url)
            }
          }
        } catch (error) {
          logger.warn('Could not fetch client logo/name:', error)
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
      logger.error('Error checking user:', error)
      router.push('/auth/sign-in')
    } finally {
      setLoading(false)
    }
  }

  const fetchNotifications = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, message, read, is_read, created_at, priority')
        .order('created_at', { ascending: false })
        .limit(20)
      const items: any[] = (data || []).map((n: any) => ({
        id: n.id,
        type: (n.type || 'system') as any,
        title: n.title,
        message: n.message,
        is_read: n.is_read ?? n.read ?? false,
        created_at: n.created_at,
        priority: (n.priority || 'normal') as any
      }))
      setNotifications(items as any)
      setUnreadCount(items.filter((n: any)=> !n.is_read).length)
    } catch (error) {
      logger.error('Error fetching notifications:', error)
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
      const { data: { session } } = await supabase.auth.getSession()
      await supabase.auth.signOut()
      authLogger.logLoginSuccess({ success: true, method: 'callback', userId: session?.user?.id, email: session?.user?.email, metadata: { action: 'signout' } })
      try { await clearSessionCookies() } catch {}
      router.push('/')
    } catch (error) {
      logger.error('Error signing out:', error)
      // Force redirect even if signout fails
      router.push('/')
    }
  }

  const getNavigationItems = () => {
    return getRoleBasedNavigation(user)
  }

  const getQuickActionsItems = () => {
    return getQuickActions(user)
  }

  const getInvoiceSubNavItems = () => {
    return getInvoiceSubNavigation(user)
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
    <SessionManager
      config={{
        warningTime: 300, // 5 minutes
        inactivityTimeout: 1800, // 30 minutes
        checkInterval: 30 // 30 seconds
      }}
    >
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
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
          <div className="p-6">
            <ErrorBoundary
              showDetails={process.env.NODE_ENV === 'development'}
              onError={(error, errorInfo) => {
                logger.error('Dashboard page error:', {
                  error: error.message,
                  stack: error.stack,
                  componentStack: errorInfo.componentStack
                })
              }}
            >
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
      

    </div>
    </SessionManager>
  )
}
