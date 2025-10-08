'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, AlertTriangle, Shield } from 'lucide-react'
import { PlatformLogo } from '@/components/ui/platform-logo'
import { UserLogo } from '@/components/ui/user-logo'
import { authLogger } from '@/lib/auth-logger'
import { syncSessionCookies } from '@/lib/utils/session-sync'

function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams?.get('redirect') || ''

  const handleSignIn = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('🔍 handleSignIn called:', {
      type: e.type,
      target: e.target,
      currentTarget: e.currentTarget,
      defaultPrevented: e.defaultPrevented
    })
    
    // Rate limiting for production
    if (attempts >= 5) {
      toast.error('Too many failed attempts. Please try again later.')
      return
    }
    
    setLoading(true)
    
    // Set a timeout to prevent stuck loading state
    const timeoutId = setTimeout(() => {
      console.log('⏰ Login timeout - resetting loading state')
      setLoading(false)
      toast.error('Login is taking longer than expected. Please try again.')
    }, 30000) // 30 second timeout

    try {
      const supabase = await getSupabaseClient()
      authLogger.logLoginAttempt({ success: true, method: 'password', email, metadata: { attempts } })
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setAttempts(prev => prev + 1)
        authLogger.logLoginFailure({ success: false, method: 'password', email, error: error.message, attemptCount: attempts + 1 })
        
        // Handle specific error cases for production
        if (error.message.includes('Email not confirmed')) {
          toast.error('Please check your email and click the confirmation link before signing in.')
        } else if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please try again.')
        } else if (error.message.includes('Too many requests')) {
          toast.error('Too many login attempts. Please wait a moment before trying again.')
        } else {
          toast.error('Sign in failed. Please check your credentials and try again.')
        }
        return
      }

      if (data.user) {
        // Check if email is confirmed
        if (!data.user.email_confirmed_at) {
          authLogger.logLoginFailure({ success: false, method: 'password', email, error: 'Email not confirmed' })
          toast.error('Please check your email and click the confirmation link before signing in.')
          return
        }

        // Reset attempts on successful login
        setAttempts(0)
        
        // Show success message
        toast.success('Signed in successfully!')
        authLogger.logLoginSuccess({ success: true, method: 'password', email, userId: data.user.id, role: data.user.user_metadata?.role })
        
        // Sync tokens to HttpOnly cookies for middleware
        try {
          console.log('🔄 Starting session sync...')
          const supabase = await getSupabaseClient()
          const { data: { session } } = await supabase.auth.getSession()
          console.log('📋 Session for sync:', { 
            hasSession: !!session, 
            hasAccessToken: !!session?.access_token,
            hasRefreshToken: !!session?.refresh_token,
            hasExpiresAt: !!session?.expires_at 
          })
          
          if (session?.access_token && session?.refresh_token && session?.expires_at) {
            console.log('🔄 Syncing session cookies...')
            await syncSessionCookies(session.access_token, session.refresh_token, session.expires_at)
            console.log('✅ Session cookies synced')
            
            // Add a small delay to ensure cookies are set before redirect
            console.log('⏱️ Waiting 200ms before redirect...')
            await new Promise(resolve => setTimeout(resolve, 200))
            console.log('✅ Delay completed')
          } else {
            console.warn('⚠️ Missing session tokens for sync')
          }
        } catch (error) {
          console.error('❌ Session sync failed:', error)
          // Don't fail the login if session sync fails - continue with redirect
          console.log('⚠️ Continuing with redirect despite sync failure')
        }

        // Redirect to role-specific dashboard
        let target = '/dashboard'
        if (redirectParam && redirectParam.startsWith('/')) {
          target = redirectParam
        } else {
          // Determine role-specific dashboard
          const userRole = data.user.user_metadata?.role
          if (userRole === 'provider') {
            target = '/dashboard/provider'
          } else if (userRole === 'client') {
            target = '/dashboard/client'
          }
          // Admin and other roles go to /dashboard
        }
        
        console.log('🚀 Redirecting to:', target)
        
        // Reset loading state before redirect to prevent stuck state
        setLoading(false)
        
        // Use router.replace for client-side navigation
        try {
          router.replace(target)
          // Keep fallback for edge cases where router might fail
          setTimeout(() => {
            if (window.location.pathname === '/auth/sign-in') {
              console.log('🔄 Router redirect failed, using window.location as fallback')
              window.location.href = target
            }
          }, 1000)
        } catch (redirectError) {
          console.error('❌ Router redirect failed:', redirectError)
          // Fallback to window.location only if router fails
          window.location.href = target
        }
      }
    } catch (err) {
      setAttempts(prev => prev + 1)
      authLogger.logLoginFailure({ success: false, method: 'password', email, error: err instanceof Error ? err.message : 'Unknown error', attemptCount: attempts + 1 })
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      // Clear the timeout
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      authLogger.logLoginAttempt({ success: true, method: 'oauth', email, metadata: { provider: 'google' } })
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''}`
        }
      })

      if (error) {
        authLogger.logLoginFailure({ success: false, method: 'oauth', email, error: error.message })
        toast.error('Google sign in failed. Please try again.')
      }
    } catch (error) {
      authLogger.logLoginFailure({ success: false, method: 'oauth', email, error: error instanceof Error ? error.message : 'Unknown error' })
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error('Please enter your email address first')
      return
    }

    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) {
        toast.error('Failed to send confirmation email. Please try again.')
      } else {
        toast.success('Confirmation email sent! Please check your inbox.')
      }
    } catch (error) {
      toast.error('Failed to send confirmation email')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address first')
      return
    }

    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) {
        toast.error('Failed to send password reset email. Please try again.')
      } else {
        toast.success('Password reset email sent! Please check your inbox.')
      }
    } catch (error) {
      toast.error('Failed to send password reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 flex items-center justify-center bg-white rounded-xl shadow-lg border border-gray-200 p-3">
              {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? (
                <UserLogo 
                  email={email} 
                  className="w-full h-full object-contain"
                  showFallback={true}
                />
              ) : (
                <PlatformLogo className="w-full h-full object-contain" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            {email ? `Sign in to your ${email} account` : 'Sign in to your Business Services Hub account'}
          </CardDescription>
          
          {/* Security Notice */}
          {attempts > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {attempts >= 3 ? 'Multiple failed attempts detected' : 'Failed login attempt'}
                </span>
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSignIn(e as any)
                  }
                }}
                required
                disabled={loading}
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSignIn(e as any)
                    }
                  }}
                  required
                  disabled={loading}
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent disabled:opacity-50"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            
            <Button
              type="button"
              className="w-full bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
              onClick={(e) => handleSignIn(e as any)}
              disabled={loading || attempts >= 5}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </div>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            
            <Button
              variant="outline"
              className="w-full mt-4 border-gray-300 hover:bg-gray-50 transition-colors duration-200"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-8.09 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>
          </div>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link href="/auth/sign-up" className="text-blue-600 hover:underline font-medium">
              Sign up
            </Link>
          </div>
          
          <div className="mt-4 text-center text-sm space-y-2">
            <button 
              onClick={handleForgotPassword}
              className="text-blue-600 hover:underline block w-full"
              disabled={loading}
            >
              Forgot your password?
            </button>
            <button 
              onClick={handleResendConfirmation}
              className="text-blue-600 hover:underline block w-full"
              disabled={loading}
            >
              Resend confirmation email
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}
