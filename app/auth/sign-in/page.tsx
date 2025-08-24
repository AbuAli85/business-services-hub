'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log('Sign-in error:', error);
        
        // Handle specific error cases
        if (error.message.includes('Email not confirmed')) {
          toast.error('Please check your email and click the confirmation link before signing in.');
        } else if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please try again.');
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        console.log('Sign-in successful:', data.user);
        console.log('User email confirmed at:', data.user.email_confirmed_at);
        console.log('User metadata:', data.user.user_metadata);
        
        // Check if email is confirmed
        if (!data.user.email_confirmed_at) {
          toast.error('Please check your email and click the confirmation link before signing in.');
          return;
        }

        // Show success message
        toast.success('Signed in successfully!');
        
        // Debug: Log before redirect
        console.log('About to redirect to /dashboard');
        console.log('Current URL:', window.location.href);
        console.log('Router object:', router);
        console.log('Router.push function:', typeof router.push);
        
        // Try router.push first, then fallback to hard navigation
        try {
          console.log('Attempting router.push...');
          await router.push('/dashboard');
          console.log('Router.push completed');
          
          // Force a hard navigation if router.push doesn't work
          setTimeout(() => {
            if (window.location.pathname !== '/dashboard') {
              console.log('Router.push didn\'t change URL, forcing hard navigation...');
              window.location.href = '/dashboard';
            }
          }, 100);
          
        } catch (redirectError) {
          console.error('Router.push failed:', redirectError);
          console.log('Using window.location fallback...');
          window.location.href = '/dashboard';
        }
      }
    } catch (err) {
      console.error('Sign-in error:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        toast.error(error.message)
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Google sign in error:', error)
    }
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error('Please enter your email address first')
      return
    }

    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Confirmation email sent! Please check your inbox.')
      }
    } catch (error) {
      toast.error('Failed to send confirmation email')
      console.error('Resend confirmation error:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your Business Services Hub account
          </CardDescription>
          
          {/* Debug info for development */}
          <div className="mt-4 p-2 bg-yellow-100 rounded text-sm text-left">
            <strong>Development Mode:</strong><br />
            Email confirmation disabled for development<br />
            Check console for detailed authentication logs
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
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
              type="submit"
              className="w-full"
              disabled={loading}
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
          </form>
          
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
              className="w-full mt-4"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
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
              Google
            </Button>
          </div>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link href="/auth/sign-up" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </div>
          
          <div className="mt-4 text-center text-sm">
            <Link href="/auth/forgot-password" className="text-blue-600 hover:underline">
              Forgot your password?
            </Link>
            <span className="mx-2">•</span>
            <button 
              onClick={handleResendConfirmation}
              className="text-blue-600 hover:underline"
            >
              Resend confirmation email
            </button>
          </div>
          
          {/* Development bypass */}
          <div className="mt-4 text-center space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Skip Sign-in clicked');
                console.log('Current URL:', window.location.href);
                try {
                  router.push('/dashboard');
                } catch (e) {
                  console.error('Router.push failed:', e);
                  window.location.href = '/dashboard';
                }
              }}
              className="text-gray-500"
            >
              Skip Sign-in (Dev Mode)
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Testing manual redirect...');
                console.log('Current URL:', window.location.href);
                console.log('Router object:', router);
                console.log('Router.push function:', typeof router.push);
                
                // Test multiple redirect methods
                try {
                  console.log('Testing router.push...');
                  router.push('/dashboard');
                } catch (e) {
                  console.error('Router.push failed:', e);
                  console.log('Testing window.location...');
                  window.location.href = '/dashboard';
                }
              }}
              className="text-gray-500 ml-2"
            >
              Test Redirect
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Testing direct navigation...');
                window.location.href = '/dashboard';
              }}
              className="text-gray-500 ml-2"
            >
              Direct Navigation
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Testing simple dashboard route...');
                window.location.href = '/dashboard/test';
              }}
              className="text-gray-500 ml-2"
            >
              Test Simple Route
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
