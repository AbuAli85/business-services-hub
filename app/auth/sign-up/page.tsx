'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Building2, User, CheckCircle, XCircle, AlertTriangle, Mail, Phone, Lock, Briefcase, ArrowRight, Shield, Star } from 'lucide-react'
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
    
    // Check password strength
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
          ...(captchaToken && { captchaToken }),
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-3">
                <PlatformLogo className="h-8 w-8" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">BusinessHub</h1>
                  <p className="text-sm text-gray-500">Services Platform</p>
                </div>
              </div>
              <Link 
                href="/auth/sign-in" 
                className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-8">
                <div className="mx-auto w-16 h-16 max-w-full max-h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold text-gray-900 mb-2">Create Your Account</CardTitle>
                <CardDescription className="text-gray-600 text-base">
                  Join thousands of businesses already using our platform
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <form onSubmit={handleSignUp} className="space-y-6">
                  {/* Role Selection */}
                  <div className="space-y-3">
                    <Label htmlFor="role" className="text-sm font-semibold text-gray-700">I want to join as</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: 'client' | 'provider') => handleInputChange('role', value)}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-12 transition-all duration-200 focus:ring-2 focus:ring-blue-500 border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">
                          <div className="flex items-center gap-3 py-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium">Client</div>
                              <div className="text-sm text-gray-500">Looking for services</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="provider">
                          <div className="flex items-center gap-3 py-2">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium">Provider</div>
                              <div className="text-sm text-gray-500">Offering services</div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700">Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        required
                        disabled={loading}
                        className={`pl-10 h-12 transition-all duration-200 focus:ring-2 focus:ring-blue-500 border-gray-300 ${errors.fullName ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email address"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                        disabled={loading}
                        className={`pl-10 h-12 transition-all duration-200 focus:ring-2 focus:ring-blue-500 border-gray-300 ${errors.email ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        required
                        disabled={loading}
                        className={`pl-10 h-12 transition-all duration-200 focus:ring-2 focus:ring-blue-500 border-gray-300 ${errors.phone ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  {/* Company Name */}
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-sm font-semibold text-gray-700">Company Name *</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="companyName"
                        type="text"
                        placeholder="Enter your company name"
                        value={formData.companyName}
                        onChange={(e) => handleInputChange('companyName', e.target.value)}
                        required
                        disabled={loading}
                        className={`pl-10 h-12 transition-all duration-200 focus:ring-2 focus:ring-blue-500 border-gray-300 ${errors.companyName ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.companyName && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {errors.companyName}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        required
                        disabled={loading}
                        className={`pl-10 pr-12 h-12 transition-all duration-200 focus:ring-2 focus:ring-blue-500 border-gray-300 ${errors.password ? 'border-red-500' : ''}`}
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
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Password strength:</span>
                          <span className={`font-medium ${getPasswordStrengthColor()}`}>
                            {passwordStrength.feedback}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthBg()}`}
                            style={{ width: getPasswordStrengthWidth() }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center space-x-1">
                            <span className={formData.password.length >= 8 ? 'text-green-500' : 'text-red-500'}>
                              {formData.password.length >= 8 ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            </span>
                            <span>8+ characters</span>
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
                          <div className="flex items-center space-x-1">
                            <span className={/[^A-Za-z0-9]/.test(formData.password) ? 'text-green-500' : 'text-red-500'}>
                              {/[^A-Za-z0-9]/.test(formData.password) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            </span>
                            <span>special</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {errors.password && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">Confirm Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        required
                        disabled={loading}
                        className={`pl-10 pr-12 h-12 transition-all duration-200 focus:ring-2 focus:ring-blue-500 border-gray-300 ${errors.confirmPassword ? 'border-red-500' : ''}`}
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
                        <span className={formData.password === formData.confirmPassword ? 'text-green-500' : 'text-red-500'}>
                          {formData.password === formData.confirmPassword ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </span>
                        <span className={formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-600'}>
                          {formData.password === formData.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                        </span>
                      </div>
                    )}
                    
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Captcha - Only show if configured */}
                  {process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Security verification</span>
                      </div>
                      <HCaptcha key={captchaKey} onVerify={setCaptchaToken} theme="light" />
                      {errors.captcha && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.captcha}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={loading || isSubmitting || !passwordStrength.meetsRequirements || formData.password !== formData.confirmPassword}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-base transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading || isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  {/* Terms and Privacy */}
                  <div className="text-center text-sm text-gray-500">
                    By creating an account, you agree to our{' '}
                    <Link href="/terms" className="text-blue-600 hover:text-blue-500 font-medium">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-blue-600 hover:text-blue-500 font-medium">
                      Privacy Policy
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Features Section */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Secure & Trusted</h3>
                <p className="text-sm text-gray-600">Enterprise-grade security for your business</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Quality Assured</h3>
                <p className="text-sm text-gray-600">Vetted professionals and verified services</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Business Ready</h3>
                <p className="text-sm text-gray-600">Tools designed for business growth</p>
              </div>
            </div>
          </div>
        </div>

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