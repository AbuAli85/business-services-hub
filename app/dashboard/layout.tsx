'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getSupabaseClient } from '@/lib/supabase-client'
import { profileManager, type UserProfile } from '@/lib/profile-manager'
import { userSessionManager } from '@/lib/user-session-manager'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { realtimeManager } from '@/lib/realtime'
import { toast } from 'sonner'
import { AutoRefreshProvider } from '@/contexts/AutoRefreshContext'
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

// UserProfile interface is now imported from profile-manager

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

  // Refs to prevent duplicate initialization (React Strict Mode protection)
  const initializingRef = useRef(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    // Prevent duplicate initialization
    if (initializingRef.current || initializedRef.current) {
      console.log('⏭️ Layout already initialized, skipping')
      return
    }
    
    initializingRef.current = true
    
    // SIMPLIFIED: Just do a quick auth check without complex logic
    const quickAuthCheck = async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          router.push('/auth/sign-in')
          return
        }
        
        // Create minimal user object for layout
        const minimalUser: UserProfile = {
          id: user.id,
          role: (user.user_metadata?.role || 'client') as UserProfile['role'],
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          company_name: user.user_metadata?.company_name || '',
          profile_completed: true,
          verification_status: 'approved',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        setUser(minimalUser)
        setLoading(false)
        initializedRef.current = true // Mark as initialized
        
        // Fetch notifications in background (silently)
        fetchNotifications().catch(() => {
          // Silently fail - non-critical
        })
        
      } catch (error) {
        logger.error('Auth check failed:', error)
        router.push('/auth/sign-in')
      }
    }
    
    quickAuthCheck()

    return () => {
      initializingRef.current = false
      initializedRef.current = false
    }
  }, [])

  // Removed loading state monitoring useEffect to prevent unnecessary re-renders

  // Realtime notifications table stream (proper cleanup)
  useEffect(() => {
    if (!user?.id) return
    let isActive = true
    let channel: any = null
    ;(async () => {
      try {
        const supabase = await getSupabaseClient()
        const userFilter = `user_id=eq.${user.id}`
        channel = supabase
          .channel(`notifications-${user.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: userFilter }, (payload: any) => {
            if (!isActive) return
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
      } catch (e) {
        logger.warn('Realtime notifications channel failed', e)
      }
    })()
    return () => {
      isActive = false
      if (channel) {
        try {
          const remove = (async () => {
            try {
              const supabase = await getSupabaseClient()
              supabase.removeChannel(channel)
            } catch {}
          })()
        } catch {}
      }
    }
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

  
  // Fetch additional profile data in background (non-blocking)
  const fetchAdditionalProfileData = async (userId: string, currentUser: UserProfile) => {
    try {
      // Use ProfileManager for profile fetch
      const profile = await profileManager.getUserProfile(userId, false)
      
      if (profile) {
        console.log('📋 Additional profile data loaded:', profile)
        
        // Update user with enriched data
        const enrichedUser: UserProfile = {
          ...currentUser,
          full_name: profile.full_name || currentUser.full_name,
          company_name: profile.company_name || currentUser.company_name,
          profile_completed: profile.profile_completed || false,
          verification_status: profile.verification_status || 'pending'
        }
        
        setUser(enrichedUser)
        
        // Fetch company info and logo if available
        if (profile.company_id) {
          const companyInfo = await profileManager.getCompanyInfo(userId)
          if (companyInfo?.logo_url) {
            setUserLogoUrl(companyInfo.logo_url)
          }
        }
        
        // Set profile logo if available
        if (profile.logo_url) {
          setUserLogoUrl(profile.logo_url)
        }
      }
    } catch (error) {
      console.warn('⚠️ Background profile fetch failed (non-critical):', error)
      // Don't throw - this is optional enrichment
    }
  }

  const checkUser = async () => {
    console.log('🔍 Starting checkUser...')
    
    try {
      const supabase = await getSupabaseClient()
      console.log('✅ Supabase client initialized')
      
      // Add a small delay to ensure session cookies are properly set
      await new Promise(resolve => setTimeout(resolve, 100))
      console.log('⏱️ Delay completed')
      
      // Note: Using getUser() here for security - validates with auth server
      let { data: { user: sessionUser }, error: sessionError } = await supabase.auth.getUser()
      console.log('📋 Session check result:', { 
        hasSession: !!sessionUser, 
        hasError: !!sessionError, 
        userId: sessionUser?.id,
        email: sessionUser?.email 
      })
      
      if (sessionError) {
        console.error('❌ Session fetch error:', sessionError)
        logger.error('Could not fetch session:', sessionError)
        router.push('/auth/sign-in')
        return
      }
      
      if (!sessionUser) {
        console.warn('⚠️ No active session found, attempting refresh...')
        logger.warn('No active session found')
        // Try to refresh the session before redirecting
        try {
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
          console.log('🔄 Refresh result:', { 
            hasRefreshedSession: !!refreshedSession, 
            hasRefreshError: !!refreshError,
            userId: refreshedSession?.user?.id 
          })
          
          if (refreshError || !refreshedSession) {
            console.error('❌ Session refresh failed:', refreshError)
            router.push('/auth/sign-in')
            return
          }
          // Use the refreshed session
          sessionUser = refreshedSession.user
          console.log('✅ Using refreshed session')
        } catch (refreshError) {
          console.error('❌ Session refresh exception:', refreshError)
          logger.warn('Session refresh failed:', refreshError)
          router.push('/auth/sign-in')
          return
        }
      }

      // Use user metadata from auth instead of database profile
      const userMetadata = sessionUser.user_metadata
      console.log('👤 User metadata:', userMetadata)
      
      let userRole = userMetadata?.role
      console.log('🎭 Initial role from metadata:', userRole)
      
      // If no role in metadata, try to get from profile
      if (!userRole) {
        console.log('🔍 No role in metadata, checking profile...')
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', sessionUser.id)
            .single()
          
          console.log('📋 Profile data:', profile)
          
          if (profile?.role) {
            userRole = profile.role
            console.log('✅ Role from profile:', userRole)
          }
        } catch (error) {
          console.warn('⚠️ Could not fetch role from profile:', error)
          logger.warn('Could not fetch role from profile:', error)
        }
      }
      
      // If still no role, redirect to onboarding
      if (!userRole) {
        console.warn('❌ No role found for user, redirecting to onboarding')
        logger.warn('No role found for user, redirecting to onboarding')
        router.push('/auth/onboarding?role=client')
        return
      }
      
      console.log('🎯 Final user role:', userRole)

      // Check if user has completed profile and is verified (with timeout)
      try {
        console.log('🔍 Checking profile status...')
        
        // Add timeout to profile check
        const profileCheckPromise = supabase
          .from('profiles')
          .select('profile_completed, verification_status, role')
          .eq('id', sessionUser.id)
          .single()
        
        const profileCheckTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile check timeout')), 3000)
        )
        
        const profileResult = await Promise.race([profileCheckPromise, profileCheckTimeout]) as { data: any }
        const { data: profile } = profileResult
        console.log('📋 Profile check result:', profile)

        if (profile) {
          // Admin users bypass profile completion and verification checks
          if (profile.role === 'admin') {
            console.log('👑 Admin user detected, bypassing profile completion checks')
            logger.info('Admin user detected, bypassing profile completion checks')
            // Continue with normal flow for admin users
          } else {
            // For non-admin users, check verification status first
            // If profile is pending approval, redirect to pending approval page
            if (profile.verification_status === 'pending') {
              console.log('⏳ Profile pending approval, redirecting to pending approval page')
              logger.warn('Profile pending approval, redirecting to pending approval page')
              router.push('/auth/pending-approval')
              return
            }

            // If profile is rejected, redirect to pending approval page
            if (profile.verification_status === 'rejected') {
              console.log('❌ Profile rejected, redirecting to pending approval page')
              logger.warn('Profile rejected, redirecting to pending approval page')
              router.push('/auth/pending-approval')
              return
            }

            // Only redirect to onboarding if profile is not completed AND not approved
            // This allows approved users to access dashboard even if profile_completed is false
            if (!profile.profile_completed && profile.verification_status !== 'approved') {
              console.log('📝 Profile not completed, redirecting to onboarding')
              logger.warn('Profile not completed, redirecting to onboarding')
              router.push('/auth/onboarding')
              return
            }
          }
        } else {
          console.log('⚠️ No profile found, continuing with basic user setup')
        }
      } catch (error) {
        console.warn('⚠️ Profile check failed or timed out:', error)
        logger.warn('Could not check profile status:', error)
        // Continue with normal flow if profile check fails
      }
      
      // Fetch comprehensive profile data using ProfileManager
      console.log('🔍 Fetching comprehensive profile data...')
      let companyName = undefined
      let fullName = userMetadata?.full_name || 'User'
      
      try {
        // Use ProfileManager to get complete profile data
        const profile = await profileManager.getUserProfile(sessionUser.id)
        
        if (profile) {
          console.log('📋 Profile data from ProfileManager:', profile)
          fullName = profile.full_name || fullName
          
          // Get company information if user has company_id
          if (profile.company_id) {
            const companyInfo = await profileManager.getCompanyInfo(sessionUser.id)
            if (companyInfo?.name) {
              companyName = companyInfo.name
            }
            if (companyInfo?.logo_url) {
              setUserLogoUrl(companyInfo.logo_url)
            }
          }
          
          // Set profile logo if available
          if (profile.logo_url) {
            setUserLogoUrl(profile.logo_url)
          }
        } else {
          console.log('⚠️ No profile found, using auth metadata')
        }
      } catch (error) {
        console.warn('⚠️ Profile data fetch failed, using auth metadata:', error)
        // Continue with auth metadata as fallback
      }
      
      const finalUser: UserProfile = {
        id: sessionUser.id,
        role: userRole as UserProfile['role'],
        full_name: fullName,
        email: sessionUser.email || '',
        company_name: companyName,
        profile_completed: false,
        verification_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('🎉 Setting final user:', finalUser)
      
      // Start user session to ensure proper isolation
      try {
        userSessionManager.startSession(sessionUser.id)
        console.log('✅ User session started successfully')
      } catch (sessionError) {
        console.warn('⚠️ Failed to start user session:', sessionError)
      }
      
      setUser(finalUser)
      console.log('✅ User set successfully, loading should be false now')
      
      // User check completed successfully
      
    } catch (error) {
      console.error('❌ Error checking user:', error)
      logger.error('Error checking user:', error)
      router.push('/auth/sign-in')
    } finally {
      console.log('🏁 Setting loading to false')
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
      // Clear user session and profile cache
      if (user?.id) {
        userSessionManager.endSession(user.id)
        profileManager.clearCache(user.id)
        console.log('🧹 Cleared session and cache for user:', user.id)
      }
      
      const supabase = await getSupabaseClient()
      // Get user info before signing out (for logging purposes only)
      const { data: { user: logoutUser } } = await supabase.auth.getUser()
      await supabase.auth.signOut()
      authLogger.logLoginSuccess({ success: true, method: 'callback', userId: logoutUser?.id, email: logoutUser?.email, metadata: { action: 'signout' } })
      
      // Clear all sessions as a safety measure
      userSessionManager.clearAllSessions()
      
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
          <p className="text-sm text-gray-400 mt-2">Please wait while we verify your session</p>
          <button 
            onClick={() => {
              console.log('🔧 Force refresh dashboard')
              setLoading(false)
              window.location.reload()
            }}
            className="mt-4 text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Taking too long? Click here to refresh
          </button>
        </div>
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
    <AutoRefreshProvider>
      <SessionManager
        config={{
          warningTime: 300, // 5 minutes
          inactivityTimeout: 1800, // 30 minutes
          checkInterval: 120 // 120 seconds (2 minutes) - reduced noise
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
                <div className="flex-shrink-0 relative w-12 h-12">
                  <Image
                    src={userLogoUrl}
                    alt="Company Logo"
                    fill
                    className="object-contain rounded-lg border border-gray-200 p-1 bg-white shadow-sm"
                    sizes="48px"
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
              <Image
                src={userLogoUrl}
                alt="Company Logo"
                fill
                className="object-contain filter grayscale"
                sizes="384px"
                priority={false}
              />
            </div>
            {/* Corner watermarks */}
            <div className="absolute top-8 right-8 w-24 h-24 opacity-2">
              <Image
                src={userLogoUrl}
                alt="Company Logo"
                fill
                className="object-contain filter grayscale"
                sizes="96px"
                priority={false}
              />
            </div>
            <div className="absolute bottom-8 left-8 w-20 h-20 opacity-2">
              <Image
                src={userLogoUrl}
                alt="Company Logo"
                fill
                className="object-contain filter grayscale"
                sizes="80px"
                priority={false}
              />
            </div>
          </div>
        )}
        {/* Mobile Menu Button - Only show on mobile when sidebar is closed */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md bg-white shadow-md text-gray-400 hover:text-gray-600"
            title="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
          <div className="p-2 lg:p-4">
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
    </AutoRefreshProvider>
  )
}
