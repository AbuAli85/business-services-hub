'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { Eye, EyeOff, Loader2, Building2, User, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { EmailVerificationModal } from '@/components/ui/email-verification-modal'
import { PlatformLogo } from '@/components/ui/platform-logo'
import { HCaptcha } from '@/components/ui/hcaptcha'
import { validateSignupForm, sanitizeSignupForm, validatePassword, checkEmailExists } from '@/lib/signup-validation'
import { AuthErrorBoundary } from '@/components/auth/ErrorBoundary'

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    companyName: '',
    role: 'client' as 'client' | 'provider'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: '',
    meetsRequirements: false
  })
  const [captchaToken, setCaptchaToken] = useState<string>('')
  const [captchaKey, setCaptchaKey] = useState<number>(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    
    // Check password strength when password changes
    if (field === 'password') {
      checkPasswordStrength(value)
    }
  }

  const checkPasswordStrength = (password: string) => {
    const validation = validatePassword(password)
    setPasswordStrength({
      score: validation.score,
      feedback: validation.feedback,
      meetsRequirements: validation.meetsRequirements
    })
  }

  const validateForm = async () => {
    const sanitizedData = sanitizeSignupForm(formData)
    const validation = validateSignupForm(sanitizedData, captchaToken)
    
    setErrors(validation.errors)

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0]
      toast.error(firstError)
      return false
    }

    // Check if email already exists
    if (sanitizedData.email) {
      try {
        const emailExists = await checkEmailExists(sanitizedData.email)
        if (emailExists) {
          setErrors(prev => ({ ...prev, email: 'An account with this email already exists. Please sign in instead.' }))
          toast.error('An account with this email already exists. Please sign in instead.')
          return false
        }
      } catch (error) {
        console.error('Error checking email existence:', error)
        // Continue with signup if email check fails
      }
    }

    // Show warnings if any
    if (Object.keys(validation.warnings).length > 0) {
      const firstWarning = Object.values(validation.warnings)[0]
      toast.error(firstWarning, { duration: 5000 })
    }
    
    return true
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!(await validateForm())) return

    if (isSubmitting) return // Prevent double submission

    setLoading(true)
    setIsSubmitting(true)
    
    try {
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          captchaToken,
          data: {
            role: formData.role,
            full_name: formData.fullName,
            phone: formData.phone,
            company_name: formData.companyName,
          }
        }
      })

      if (error) {
        console.error('Signup error:', error)
        
        // Handle specific error cases
        if (error.message.includes('User already registered') || error.message.includes('already registered')) {
          toast.error('An account with this email already exists. Please sign in instead.')
        } else if (error.message.includes('Password should be at least') || error.message.includes('password')) {
          toast.error('Password is too weak. Please choose a stronger password.')
        } else if (error.message.includes('Invalid email') || error.message.includes('email')) {
          toast.error('Please enter a valid email address.')
        } else if (error.message.includes('captcha') || error.message.includes('verification')) {
          toast.error('Captcha verification failed. Please try again.')
        } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
          toast.error('Too many signup attempts. Please wait a moment before trying again.')
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          toast.error('Network error. Please check your connection and try again.')
        } else {
          toast.error(`Signup failed: ${error.message}`)
        }
        
        // Reset captcha on error
        setCaptchaToken('')
        setCaptchaKey(k => k + 1)
        return
      }

      if (data.user) {
        // Log successful signup
        console.log('✅ User signup successful:', {
          userId: data.user.id,
          email: data.user.email,
          role: formData.role,
          emailConfirmed: !!data.user.email_confirmed_at
        })
        
        // Check if email confirmation is required
        if (data.user.email_confirmed_at) {
          // Email already confirmed, redirect to onboarding
          toast.success('Account created successfully! Redirecting to setup...')
          router.push(`/auth/onboarding?role=${formData.role}`)
        } else {
          // Show email verification modal
          setRegisteredEmail(formData.email)
          setShowEmailVerification(true)
          toast.success('Account created! Please check your email to verify your account.')
        }
      } else {
        toast.error('Signup completed but no user data returned. Please try again.')
      }
    } catch (error) {
      console.error('Signup error:', error)
      toast.error('An unexpected error occurred during signup. Please try again.')
    } finally {
      setLoading(false)
      setIsSubmitting(false)
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score <= 1) return 'text-red-500'
    if (passwordStrength.score <= 2) return 'text-orange-500'
    if (passwordStrength.score <= 3) return 'text-yellow-500'
    if (passwordStrength.score <= 4) return 'text-blue-500'
    return 'text-green-500'
  }

  const getPasswordStrengthBg = () => {
    if (passwordStrength.score <= 1) return 'bg-red-500'
    if (passwordStrength.score <= 2) return 'bg-orange-500'
    if (passwordStrength.score <= 3) return 'bg-yellow-500'
    if (passwordStrength.score <= 4) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getPasswordStrengthWidth = () => {
    return `${(passwordStrength.score / 5) * 100}%`
  }

  const handleResendVerificationEmail = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // Try resend without captcha first (some Supabase configurations allow this)
      let { error } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail
      })

      // If captcha is required, show a message to refresh the page
      if (error && error.message.includes('captcha')) {
        throw new Error('Please refresh the page and try again to get a new captcha verification.')
      }

      if (error) {
        console.error('Resend verification error:', error)
        
        if (error.message.includes('rate limit') || error.message.includes('too many')) {
          throw new Error('Too many resend attempts. Please wait before trying again.')
        } else if (error.message.includes('captcha') || error.message.includes('verification')) {
          throw new Error('Captcha verification failed. Please refresh and try again.')
        } else {
          throw new Error(error.message)
        }
      }
    } catch (error) {
      console.error('Resend verification error:', error)
      throw error
    }
  }

  const handleEmailVerificationClose = () => {
    setShowEmailVerification(false)
    // Redirect to sign-in page after closing the modal
    // User will need to sign in after confirming their email
    router.push('/auth/sign-in')
  }

  return (
    <AuthErrorBoundary>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <PlatformLogo size="lg" variant="full" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Join Business Services Hub and start connecting with trusted service providers
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">I want to join as</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'client' | 'provider') => handleInputChange('role', value)}
                disabled={loading}
              >
                <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Client - Looking for services
                    </div>
                  </SelectItem>
                  <SelectItem value="provider">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Provider - Offering services
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                required
                disabled={loading}
                className={`transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${errors.fullName ? 'border-red-500' : ''}`}
              />
              {errors.fullName && (
                <p className="text-sm text-red-500">{errors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                disabled={loading}
                className={`transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : ''}`}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
                disabled={loading}
                className={`transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-500' : ''}`}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Enter your company name"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                required
                disabled={loading}
                className={`transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${errors.companyName ? 'border-red-500' : ''}`}
              />
              {errors.companyName && (
                <p className="text-sm text-red-500">{errors.companyName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password (min 8 characters)"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                  disabled={loading}
                  className={`transition-all duration-200 focus:ring-2 focus:ring-blue-500 pr-12 ${errors.password ? 'border-red-500' : ''}`}
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
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Password strength:</span>
                    <span className={`font-medium ${getPasswordStrengthColor()}`}>
                      {passwordStrength.feedback}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthBg()}`}
                      // eslint-disable-next-line react/forbid-dom-props
                      style={{ width: getPasswordStrengthWidth() }}
                    />
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>Requirements:</span>
                    <div className="flex items-center space-x-1">
                      <span className={formData.password.length >= 8 ? 'text-green-500' : 'text-red-500'}>
                        {formData.password.length >= 8 ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      </span>
                      <span>8+ chars</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className={/[a-z]/.test(formData.password) ? 'text-green-500' : 'text-red-500'}>
                        {/[a-z]/.test(formData.password) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      </span>
                      <span>lowercase</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className={/[A-Z]/.test(formData.password) ? 'text-green-500' : 'text-red-500'}>
                        {/[A-Z]/.test(formData.password) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      </span>
                      <span>uppercase</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className={/[0-9]/.test(formData.password) ? 'text-green-500' : 'text-red-500'}>
                        {/[0-9]/.test(formData.password) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      </span>
                      <span>number</span>
                    </div>
                  </div>
                </div>
              )}
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                  disabled={loading}
                  className={`transition-all duration-200 focus:ring-2 focus:ring-blue-500 pr-12 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent disabled:opacity-50"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Password Match Indicator */}
              {formData.confirmPassword && (
                <div className="flex items-center space-x-2 text-sm">
                  {formData.password === formData.confirmPassword ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-600">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>
            
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
              disabled={loading || isSubmitting || !passwordStrength.meetsRequirements || formData.password !== formData.confirmPassword}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/auth/sign-in" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </div>

          {/* hCaptcha */}
          <div className="mt-2">
            <HCaptcha key={captchaKey} onVerify={setCaptchaToken} theme="light" />
            {errors.captcha && (
              <p className="text-sm text-red-500 mt-1">{errors.captcha}</p>
            )}
          </div>
          
          <div className="mt-4 text-center text-xs text-muted-foreground">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
          </div>
        </CardContent>
      </Card>

      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={showEmailVerification}
        onClose={handleEmailVerificationClose}
        email={registeredEmail}
        onResendEmail={handleResendVerificationEmail}
      />
      </div>
    </AuthErrorBoundary>
  )
}
