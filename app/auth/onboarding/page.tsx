'use client'

import { useState, useEffect, useRef, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { 
  Loader2, 
  Building2, 
  User, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Star, 
  Shield, 
  Target,
  Users,
  TrendingUp,
  FileText,
  Globe,
  Camera,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Clock,
  Zap,
  Award,
  Heart,
  Sparkles,
  ArrowUpRight,
  Info
} from 'lucide-react'
import { syncSessionCookies } from '@/lib/utils/session-sync'

function OnboardingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams.get('role') as 'client' | 'provider'
  
  // Debug logging
  console.log('🔍 Onboarding Debug:')
  console.log('  - URL search params:', Object.fromEntries(searchParams.entries()))
  console.log('  - Extracted role:', role)
  console.log('  - Role type:', typeof role)
  console.log('  - Is provider:', role === 'provider')
  console.log('  - Is client:', role === 'client')
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState<'client' | 'provider' | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showTips, setShowTips] = useState(true)
  const [fieldFocus, setFieldFocus] = useState<string | null>(null)
  const hasProcessedRedirect = useRef(false)
  const userIdRef = useRef<string | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const [formData, setFormData] = useState({
    // Provider fields
    companyName: '',
    crNumber: '',
    vatNumber: '',
    portfolioLinks: '',
    services: '',
    experience: '',
    certifications: '',
    languages: '',
    availability: '',
    pricing: '',
    
    // Client fields
    billingPreference: 'email',
    preferredCategories: '',
    budgetRange: '',
    projectTimeline: '',
    communicationPreference: 'email',
    
    // Common fields
    bio: '',
    location: '',
    website: '',
    linkedin: '',
    profileImage: null as File | null,
    profileImageUrl: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [validationState, setValidationState] = useState<Record<string, 'valid' | 'invalid' | 'pending'>>({})

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          toast.error('Please sign in to continue onboarding')
          router.push('/auth/sign-in')
          return
        }

        // Store user ID in ref for cleanup
        userIdRef.current = user.id
        
        // Get session for cookie sync
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await syncSessionCookies(session.access_token, session.refresh_token, session.expires_at!)
        }
        
        // Check if user already has a complete profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        // If role is not in URL, get it from user's profile
        if (!role && profile?.role) {
          console.log('🔍 No role in URL, using role from profile:', profile.role)
          setUserRole(profile.role as 'client' | 'provider')
        } else if (role) {
          console.log('✅ Using role from URL:', role)
          setUserRole(role)
        } else {
          console.log('❌ No role found, defaulting to client')
          setUserRole('client')
        }
        
        // Ensure userRole is set even if profile doesn't exist
        if (!userRole && !role) {
          console.log('🔧 Setting default role to client')
          setUserRole('client')
        }
        
        // Check if user already has a completed profile using the proper completion status
        // Admin users bypass profile completion checks
        if (profile?.role === 'admin') {
          // Admin users always go to dashboard
          const redirectKey = `onboarding_redirect_${user.id}`
          if (!hasProcessedRedirect.current && !localStorage.getItem(redirectKey)) {
            console.log('✅ Admin user detected, redirecting to dashboard')
            hasProcessedRedirect.current = true
            localStorage.setItem(redirectKey, 'true')
            setIsRedirecting(true)
            
            // Clear the redirect flag after 5 seconds as a safety measure
            setTimeout(() => {
              localStorage.removeItem(redirectKey)
            }, 5000)
            
            // Use window.location.href for a hard redirect to prevent loops
            window.location.href = '/dashboard'
            return
          }
        } else if (profile?.profile_completed && profile?.verification_status === 'approved') {
          // Non-admin users with completed and approved profile, redirect to dashboard
          const redirectKey = `onboarding_redirect_${user.id}`
          if (!hasProcessedRedirect.current && !localStorage.getItem(redirectKey)) {
            console.log('✅ Profile already completed and approved, redirecting to dashboard')
            hasProcessedRedirect.current = true
            localStorage.setItem(redirectKey, 'true')
            setIsRedirecting(true)
            
            // Clear the redirect flag after 5 seconds as a safety measure
            setTimeout(() => {
              localStorage.removeItem(redirectKey)
            }, 5000)
            
            // Use window.location.href for a hard redirect to prevent loops
            window.location.href = '/dashboard'
            return
          }
        }
        
        if (profile?.verification_status === 'pending') {
          // User profile is pending approval, redirect to pending approval page
          const redirectKey = `onboarding_redirect_${user.id}`
          if (!hasProcessedRedirect.current && !localStorage.getItem(redirectKey)) {
            console.log('⏳ Profile pending approval, redirecting to pending approval page')
            hasProcessedRedirect.current = true
            localStorage.setItem(redirectKey, 'true')
            setIsRedirecting(true)
            
            // Clear the redirect flag after 5 seconds as a safety measure
            setTimeout(() => {
              localStorage.removeItem(redirectKey)
            }, 5000)
            
            // Use window.location.href for a hard redirect to prevent loops
            window.location.href = '/auth/pending-approval'
            return
          }
        }
        
        // Pre-fill form with existing data
        if (profile) {
          setFormData(prev => ({
            ...prev,
            companyName: profile.company_name || '',
            bio: profile.bio || '',
            location: profile.location || '',
            website: profile.website || '',
            linkedin: profile.linkedin || '',
            profileImageUrl: profile.avatar_url || '',
          }))
        }
        
        // Set initialization complete
        setIsInitializing(false)
        
      } catch (error) {
        console.error('Auth check error:', error)
        toast.error('Authentication error. Please try again.')
        router.push('/auth/sign-in')
        setIsInitializing(false)
      }
    }
    
    checkAuth()
  }, [router])

  // Cleanup function to remove redirect flag
  useEffect(() => {
    return () => {
      // Clear the redirect flag when component unmounts
      if (typeof window !== 'undefined' && userIdRef.current) {
        const redirectKey = `onboarding_redirect_${userIdRef.current}`
        localStorage.removeItem(redirectKey)
      }
    }
  }, [])

  // Smart validation with real-time feedback
  const validateField = useCallback((field: string, value: string): { isValid: boolean; message?: string } => {
    switch (field) {
      case 'bio':
        if (!value.trim()) return { isValid: false, message: 'Bio is required' }
        if (value.trim().length < 50) return { isValid: false, message: 'Bio should be at least 50 characters' }
        if (value.trim().length > 500) return { isValid: false, message: 'Bio should be less than 500 characters' }
        return { isValid: true }
      
      case 'location':
        if (!value.trim()) return { isValid: false, message: 'Location is required' }
        return { isValid: true }
      
      case 'website':
        if (value && !/^https?:\/\/.+\..+/.test(value)) {
          return { isValid: false, message: 'Please enter a valid website URL' }
        }
        return { isValid: true }
      
      case 'linkedin':
        if (value && !/^https?:\/\/(www\.)?linkedin\.com\/in\/.+/.test(value)) {
          return { isValid: false, message: 'Please enter a valid LinkedIn profile URL' }
        }
        return { isValid: true }
      
      case 'companyName':
        if (!value.trim()) return { isValid: false, message: 'Company name is required' }
        if (value.trim().length < 2) return { isValid: false, message: 'Company name should be at least 2 characters' }
        return { isValid: true }
      
      case 'services':
        if (!value.trim()) return { isValid: false, message: 'Services offered is required' }
        if (value.trim().length < 10) return { isValid: false, message: 'Please provide more details about your services' }
        return { isValid: true }
      
      case 'experience':
        if (!value.trim()) return { isValid: false, message: 'Experience level is required' }
        return { isValid: true }
      
      case 'preferredCategories':
        if (!value.trim()) return { isValid: false, message: 'Preferred categories is required' }
        return { isValid: true }
      
      case 'budgetRange':
        if (!value.trim()) return { isValid: false, message: 'Budget range is required' }
        return { isValid: true }
      
      default:
        return { isValid: true }
    }
  }, [])

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setTouched(prev => ({ ...prev, [field]: true }))
    
    // Clear existing errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    
    // Real-time validation
    const validation = validateField(field, value)
    setValidationState(prev => ({ 
      ...prev, 
      [field]: validation.isValid ? 'valid' : 'invalid' 
    }))
    
    if (!validation.isValid) {
      setErrors(prev => ({ ...prev, [field]: validation.message || '' }))
    }
    
    // Auto-save after 2 seconds of inactivity
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveForm()
    }, 2000)
  }, [errors, validateField])

  // Auto-save functionality
  const autoSaveForm = useCallback(async () => {
    if (!userIdRef.current) return
    
    setIsAutoSaving(true)
    try {
      const supabase = await getSupabaseClient()
      await supabase
        .from('profiles')
        .update({
          bio: formData.bio,
          location: formData.location,
          website: formData.website,
          linkedin: formData.linkedin,
          company_name: formData.companyName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userIdRef.current)
      
      setLastSaved(new Date())
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      setIsAutoSaving(false)
    }
  }, [formData])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, profileImage: file }))
    }
  }

  const removeProfileImage = () => {
    setFormData(prev => ({ ...prev, profileImage: null, profileImageUrl: '' }))
  }

  const validateStep = (stepNumber: number) => {
    const newErrors: Record<string, string> = {}
    const currentRole = getCurrentRole()
    
    console.log('🔍 Validation Debug:', {
      stepNumber,
      userRole,
      role,
      currentRole,
      formData: {
        bio: formData.bio.trim().length,
        location: formData.location.trim().length,
        companyName: formData.companyName.trim().length,
        services: formData.services.trim().length,
        experience: formData.experience.trim().length,
        preferredCategories: formData.preferredCategories.trim().length,
        budgetRange: formData.budgetRange.trim().length
      }
    })
    
    if (stepNumber === 1) {
      if (!formData.bio.trim()) newErrors.bio = 'Bio is required'
      if (!formData.location.trim()) newErrors.location = 'Location is required'
    } else if (stepNumber === 2) {
      if (currentRole === 'provider') {
        if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required'
        if (!formData.services.trim()) newErrors.services = 'Services offered is required'
        if (!formData.experience.trim()) newErrors.experience = 'Experience level is required'
      } else {
        if (!formData.preferredCategories.trim()) newErrors.preferredCategories = 'Preferred categories is required'
        if (!formData.budgetRange.trim()) newErrors.budgetRange = 'Budget range is required'
      }
    }
    
    console.log('🔍 Validation Result:', {
      errors: newErrors,
      isValid: Object.keys(newErrors).length === 0
    })
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    console.log('🔍 Next button clicked:', {
      step,
      userRole,
      role,
      formData: {
        bio: formData.bio.trim().length,
        location: formData.location.trim().length
      }
    })
    
    if (validateStep(step)) {
      console.log('✅ Validation passed, moving to next step')
      setStep(prev => prev + 1)
    } else {
      console.log('❌ Validation failed, staying on current step')
    }
  }

  const handleBack = () => {
    setStep(prev => prev - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(step)) return
    
    setLoading(true)
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('User not found')
        return
      }

      // Upload profile image if provided
      let profileImageUrl = formData.profileImageUrl
      if (formData.profileImage) {
        const fileExt = formData.profileImage.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `avatars/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, formData.profileImage)
        
        if (uploadError) {
          console.error('Upload error:', uploadError)
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)
          profileImageUrl = publicUrl
        }
      }

      // Update profile with completion status
      const { error } = await supabase
        .from('profiles')
        .update({
          bio: formData.bio,
          location: formData.location,
          website: formData.website,
          linkedin: formData.linkedin,
          avatar_url: profileImageUrl,
          company_name: formData.companyName,
            role: userRole || role,
          profile_completed: true, // Mark profile as completed
          verification_status: 'pending', // Set verification status to pending
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        console.error('Profile update error:', error)
        toast.error('Failed to update profile. Please try again.')
          return
        }

      // Create role-specific data
      if ((userRole || role) === 'provider') {
        // Create company record
        const { error: companyError } = await supabase
          .from('companies')
          .insert({
            owner_id: user.id,
            name: formData.companyName,
            cr_number: formData.crNumber || null,
            vat_number: formData.vatNumber || null,
            founded_year: null, // Explicitly set to null to avoid empty string error
          })

        if (companyError) {
          console.error('Company creation error:', companyError)
        }
      }

      // Redirect to pending approval page instead of dashboard
      toast.success('Profile completed! Your account is pending admin approval.')
      router.push('/auth/pending-approval')
      
    } catch (error) {
      console.error('Onboarding error:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getCurrentRole = () => {
    return userRole || role || 'client'
  }

  const getStepTitle = () => {
    if (step === 1) return 'Tell us about yourself'
    if (step === 2) return getCurrentRole() === 'provider' ? 'Your business details' : 'Your preferences'
    return 'Complete your profile'
  }

  const getStepDescription = () => {
    if (step === 1) return 'Help others get to know you better'
    if (step === 2) return getCurrentRole() === 'provider' ? 'Share details about your business and services' : 'Tell us what you\'re looking for'
    return 'Add the final touches to your profile'
  }

  const getProgressPercentage = () => {
    return (step / 3) * 100
  }

  // Show loading state if redirecting
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-100/50"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(156, 146, 172, 0.15) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}></div>
      </div>
      
      {/* Header */}
      <div className="relative bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  BusinessHub
                </h1>
                <p className="text-sm text-gray-600 font-medium">Complete your profile</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {isAutoSaving && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Auto-saving...</span>
                </div>
              )}
              {lastSaved && !isAutoSaving && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Saved {lastSaved.toLocaleTimeString()}</span>
                </div>
              )}
            <Badge 
              variant="outline" 
              className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 font-semibold"
            >
              {getCurrentRole() === 'provider' ? 'Service Provider' : 'Client'}
            </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Progress Bar */}
      <div className="relative bg-white/90 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <span className="text-lg font-semibold text-gray-800">Step {step} of 3</span>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3].map((stepNumber) => (
                    <div
                      key={stepNumber}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                        stepNumber <= step
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {stepNumber < step ? <CheckCircle2 className="h-4 w-4" /> : stepNumber}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-600">{Math.round(getProgressPercentage())}% Complete</span>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Step Titles */}
            <div className="flex justify-between text-sm">
              <div className={`text-center ${step >= 1 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                Basic Information
              </div>
              <div className={`text-center ${step >= 2 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                {getCurrentRole() === 'provider' ? 'Business Details' : 'Preferences'}
              </div>
              <div className={`text-center ${step >= 3 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                Complete Profile
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
                <CardHeader className="pb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        {getStepTitle()}
                      </CardTitle>
                      <CardDescription className="text-gray-600 text-lg mt-2">
                        {getStepDescription()}
                      </CardDescription>
                    </div>
                    {showTips && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTips(false)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Tips
                      </Button>
                    )}
                  </div>
                  
                  {/* Smart Tips */}
                  {showTips && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-blue-900 mb-1">Pro Tip</h4>
                          <p className="text-sm text-blue-800">
                            {step === 1 && "A compelling bio helps clients understand your expertise and personality. Include your experience, specializations, and what makes you unique."}
                            {step === 2 && (userRole || role) === 'provider' && "Detailed service descriptions help clients find you. Be specific about what you offer and your experience level."}
                            {step === 2 && (userRole || role) === 'client' && "Clear preferences help us match you with the right service providers. Be specific about your needs and budget."}
                            {step === 3 && "You're almost done! Review your information and complete your profile to start using BusinessHub."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {step === 1 && (
                    <>
                      {/* Profile Image */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-gray-700">Profile Picture</Label>
                        <div className="flex items-center space-x-4">
                          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                            {formData.profileImage || formData.profileImageUrl ? (
                              <img 
                                src={formData.profileImage ? URL.createObjectURL(formData.profileImage) : formData.profileImageUrl}
                                alt="Profile" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Camera className="h-8 w-8 text-gray-400" />
                            )}
                          </div>
                          <div className="space-y-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden"
                              id="profile-image"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById('profile-image')?.click()}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Photo
                            </Button>
                            {(formData.profileImage || formData.profileImageUrl) && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={removeProfileImage}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="bio" className="text-sm font-semibold text-gray-700">Bio *</Label>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">{formData.bio.length}/500</span>
                            {validationState.bio === 'valid' && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            {validationState.bio === 'invalid' && (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                        <div className="relative">
                          <Textarea
                            id="bio"
                            placeholder="Tell us about yourself, your experience, and what makes you unique..."
                            value={formData.bio}
                            onChange={(e) => handleInputChange('bio', e.target.value)}
                            onFocus={() => setFieldFocus('bio')}
                            onBlur={() => setFieldFocus(null)}
                            className={`min-h-[120px] resize-none transition-all duration-200 ${
                              validationState.bio === 'valid' 
                                ? 'border-green-300 focus:border-green-500 focus:ring-green-500' 
                                : validationState.bio === 'invalid' 
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                : fieldFocus === 'bio'
                                ? 'border-blue-300 focus:border-blue-500 focus:ring-blue-500'
                                : 'border-gray-300'
                            }`}
                          />
                          {fieldFocus === 'bio' && (
                            <div className="absolute -bottom-8 left-0 text-xs text-gray-500">
                              💡 Include your experience, specializations, and what makes you unique
                            </div>
                          )}
                        </div>
                        {errors.bio && (
                          <div className="flex items-center space-x-2 text-sm text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>{errors.bio}</span>
                          </div>
                        )}
                        {formData.bio.length >= 50 && !errors.bio && (
                          <div className="flex items-center space-x-2 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Great! Your bio looks compelling</span>
                          </div>
                        )}
                      </div>

                      {/* Location */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="location" className="text-sm font-semibold text-gray-700">Location *</Label>
                          {validationState.location === 'valid' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {validationState.location === 'invalid' && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="location"
                            placeholder="City, Country (e.g., Muscat, Oman)"
                            value={formData.location}
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            onFocus={() => setFieldFocus('location')}
                            onBlur={() => setFieldFocus(null)}
                            className={`pl-10 transition-all duration-200 ${
                              validationState.location === 'valid' 
                                ? 'border-green-300 focus:border-green-500 focus:ring-green-500' 
                                : validationState.location === 'invalid' 
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                : fieldFocus === 'location'
                                ? 'border-blue-300 focus:border-blue-500 focus:ring-blue-500'
                                : 'border-gray-300'
                            }`}
                          />
                        </div>
                        {errors.location && (
                          <div className="flex items-center space-x-2 text-sm text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>{errors.location}</span>
                          </div>
                        )}
                        {fieldFocus === 'location' && (
                          <div className="text-xs text-gray-500">
                            💡 This helps clients find service providers in their area
                          </div>
                        )}
                      </div>

                      {/* Website */}
                      <div className="space-y-2">
                        <Label htmlFor="website" className="text-sm font-semibold text-gray-700">Website</Label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="website"
                            placeholder="https://yourwebsite.com"
                            value={formData.website}
                            onChange={(e) => handleInputChange('website', e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      {/* LinkedIn */}
                      <div className="space-y-2">
                        <Label htmlFor="linkedin" className="text-sm font-semibold text-gray-700">LinkedIn Profile</Label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="linkedin"
                            placeholder="https://linkedin.com/in/yourprofile"
                            value={formData.linkedin}
                            onChange={(e) => handleInputChange('linkedin', e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {step === 2 && (userRole || role) === 'provider' && (
                    <>
                      {/* Company Name */}
                  <div className="space-y-2">
                        <Label htmlFor="companyName" className="text-sm font-semibold text-gray-700">Company Name *</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="companyName"
                            placeholder="Your company name"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        {errors.companyName && (
                          <p className="text-sm text-red-500">{errors.companyName}</p>
                        )}
                      </div>

                      {/* Services */}
                      <div className="space-y-2">
                        <Label htmlFor="services" className="text-sm font-semibold text-gray-700">Services Offered *</Label>
                        <Textarea
                          id="services"
                          placeholder="List the services you offer (e.g., Web Development, Digital Marketing, Consulting...)"
                          value={formData.services}
                          onChange={(e) => handleInputChange('services', e.target.value)}
                          className="min-h-[100px] resize-none"
                        />
                        {errors.services && (
                          <p className="text-sm text-red-500">{errors.services}</p>
                        )}
                      </div>

                      {/* Experience */}
                      <div className="space-y-2">
                        <Label htmlFor="experience" className="text-sm font-semibold text-gray-700">Experience Level *</Label>
                        <div className="relative">
                          <Star className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="experience"
                            placeholder="e.g., 5+ years, Senior Level, Expert"
                            value={formData.experience}
                            onChange={(e) => handleInputChange('experience', e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        {errors.experience && (
                          <p className="text-sm text-red-500">{errors.experience}</p>
                        )}
                  </div>
                  
                      {/* CR Number */}
                    <div className="space-y-2">
                        <Label htmlFor="crNumber" className="text-sm font-semibold text-gray-700">Commercial Registration Number</Label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="crNumber"
                            placeholder="CR Number (if applicable)"
                        value={formData.crNumber}
                        onChange={(e) => handleInputChange('crNumber', e.target.value)}
                            className="pl-10"
                      />
                        </div>
                    </div>
                    
                      {/* VAT Number */}
                    <div className="space-y-2">
                        <Label htmlFor="vatNumber" className="text-sm font-semibold text-gray-700">VAT Number</Label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="vatNumber"
                            placeholder="VAT Number (if applicable)"
                        value={formData.vatNumber}
                        onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                            className="pl-10"
                      />
                    </div>
                  </div>
                    </>
                  )}

                  {step === 2 && (userRole || role) === 'client' && (
                    <>
                      {/* Preferred Categories */}
                  <div className="space-y-2">
                        <Label htmlFor="preferredCategories" className="text-sm font-semibold text-gray-700">Preferred Service Categories *</Label>
                        <Textarea
                          id="preferredCategories"
                          placeholder="What types of services are you looking for? (e.g., Web Development, Digital Marketing, Consulting, Design...)"
                          value={formData.preferredCategories}
                          onChange={(e) => handleInputChange('preferredCategories', e.target.value)}
                          className="min-h-[100px] resize-none"
                        />
                        {errors.preferredCategories && (
                          <p className="text-sm text-red-500">{errors.preferredCategories}</p>
                        )}
                  </div>
                  
                      {/* Budget Range */}
                  <div className="space-y-2">
                        <Label htmlFor="budgetRange" className="text-sm font-semibold text-gray-700">Budget Range *</Label>
                        <div className="relative">
                          <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="budgetRange"
                            placeholder="e.g., $1,000 - $5,000, $5,000 - $10,000"
                            value={formData.budgetRange}
                            onChange={(e) => handleInputChange('budgetRange', e.target.value)}
                            className="pl-10"
                    />
                  </div>
                        {errors.budgetRange && (
                          <p className="text-sm text-red-500">{errors.budgetRange}</p>
              )}
            </div>

                      {/* Project Timeline */}
              <div className="space-y-2">
                        <Label htmlFor="projectTimeline" className="text-sm font-semibold text-gray-700">Project Timeline</Label>
                        <div className="relative">
                          <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="projectTimeline"
                            placeholder="e.g., 1-3 months, 3-6 months, Flexible"
                            value={formData.projectTimeline}
                            onChange={(e) => handleInputChange('projectTimeline', e.target.value)}
                            className="pl-10"
                />
              </div>
                      </div>

                      {/* Communication Preference */}
              <div className="space-y-2">
                        <Label htmlFor="communicationPreference" className="text-sm font-semibold text-gray-700">Preferred Communication</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                            id="communicationPreference"
                            placeholder="Email, Phone, Video calls, etc."
                            value={formData.communicationPreference}
                            onChange={(e) => handleInputChange('communicationPreference', e.target.value)}
                            className="pl-10"
                />
              </div>
            </div>
                    </>
                  )}

                  {step === 3 && (
                    <div className="text-center space-y-6">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">You're all set!</h3>
                        <p className="text-gray-600">
                          Your profile is complete. You can now start {(userRole || role) === 'provider' ? 'offering your services' : 'finding the perfect service providers'} on our platform.
                        </p>
              </div>
            </div>
          )}
                </CardContent>
              </Card>
          
              {/* Navigation */}
              <div className="flex justify-between mt-6">
              <Button
                  type="button"
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
                  className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
                {step < 3 ? (
              <Button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                    type="button"
                onClick={handleSubmit}
                disabled={loading}
                    className="flex items-center bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {loading ? (
                  <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                      <>
                        Complete Profile
                        <CheckCircle className="h-4 w-4 ml-2" />
                      </>
                )}
              </Button>
            )}
              </div>
            </div>

            {/* Enhanced Sidebar */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* Role Benefits */}
                <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200 shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold text-blue-900 flex items-center">
                      {(userRole || role) === 'provider' ? (
                        <>
                          <Building2 className="h-6 w-6 mr-3 text-blue-600" />
                          Provider Benefits
                        </>
                      ) : (
                        <>
                          <User className="h-6 w-6 mr-3 text-blue-600" />
                          Client Benefits
                        </>
                      )}
                    </CardTitle>
                    <CardDescription className="text-blue-700">
                      What you'll get with BusinessHub
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(userRole || role) === 'provider' ? (
                      <>
                        <div className="flex items-start space-x-3 p-3 bg-white/50 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <span className="text-sm font-semibold text-blue-900">Grow Your Business</span>
                            <p className="text-xs text-blue-700">Connect with new clients and expand your reach</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 p-3 bg-white/50 rounded-lg">
                          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <span className="text-sm font-semibold text-blue-900">Secure Payments</span>
                            <p className="text-xs text-blue-700">Protected transactions and guaranteed payments</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 p-3 bg-white/50 rounded-lg">
                          <Star className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <span className="text-sm font-semibold text-blue-900">Build Reputation</span>
                            <p className="text-xs text-blue-700">Collect reviews and showcase your expertise</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 p-3 bg-white/50 rounded-lg">
                          <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <span className="text-sm font-semibold text-blue-900">Target Clients</span>
                            <p className="text-xs text-blue-700">Find projects that match your skills</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start space-x-3 p-3 bg-white/50 rounded-lg">
                          <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <span className="text-sm font-semibold text-blue-900">Verified Professionals</span>
                            <p className="text-xs text-blue-700">Access to vetted and qualified service providers</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 p-3 bg-white/50 rounded-lg">
                          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <span className="text-sm font-semibold text-blue-900">Secure Transactions</span>
                            <p className="text-xs text-blue-700">Protected payments and dispute resolution</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 p-3 bg-white/50 rounded-lg">
                          <Star className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <span className="text-sm font-semibold text-blue-900">Quality Assured</span>
                            <p className="text-xs text-blue-700">High-quality services with satisfaction guarantee</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 p-3 bg-white/50 rounded-lg">
                          <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <span className="text-sm font-semibold text-blue-900">Perfect Match</span>
                            <p className="text-xs text-blue-700">Find providers that match your specific needs</p>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Enhanced Progress Steps */}
                <Card className="shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-blue-600" />
                      Profile Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      {[
                        { 
                          number: 1, 
                          title: 'Basic Information', 
                          description: 'Tell us about yourself',
                          completed: step > 1,
                          current: step === 1
                        },
                        { 
                          number: 2, 
                          title: (userRole || role) === 'provider' ? 'Business Details' : 'Preferences', 
                          description: (userRole || role) === 'provider' ? 'Share your business info' : 'What you\'re looking for',
                          completed: step > 2,
                          current: step === 2
                        },
                        { 
                          number: 3, 
                          title: 'Complete Profile', 
                          description: 'Review and finish',
                          completed: step > 3,
                          current: step === 3
                        }
                      ].map((stepInfo) => (
                        <div key={stepInfo.number} className={`flex items-start space-x-3 p-3 rounded-lg transition-all duration-200 ${
                          stepInfo.current ? 'bg-blue-50 border border-blue-200' : 
                          stepInfo.completed ? 'bg-green-50 border border-green-200' : 
                          'bg-gray-50'
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                            stepInfo.completed 
                              ? 'bg-green-500 text-white' 
                              : stepInfo.current
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-500'
                          }`}>
                            {stepInfo.completed ? <CheckCircle2 className="h-4 w-4" /> : stepInfo.number}
                          </div>
                          <div className="flex-1">
                            <span className={`text-sm font-semibold ${
                              stepInfo.completed ? 'text-green-800' : 
                              stepInfo.current ? 'text-blue-800' : 
                              'text-gray-600'
                            }`}>
                              {stepInfo.title}
                            </span>
                            <p className={`text-xs mt-1 ${
                              stepInfo.completed ? 'text-green-600' : 
                              stepInfo.current ? 'text-blue-600' : 
                              'text-gray-500'
                            }`}>
                              {stepInfo.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Completion Summary */}
                    {step === 3 && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Award className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-semibold text-green-800">Almost Done!</span>
                        </div>
                        <p className="text-xs text-green-700">
                          Complete your profile to start using BusinessHub and connect with {(userRole || role) === 'provider' ? 'clients' : 'service providers'}.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-purple-900 flex items-center">
                      <Zap className="h-5 w-5 mr-2" />
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-purple-700">Profile Completion</span>
                      <span className="text-sm font-semibold text-purple-900">{Math.round(getProgressPercentage())}%</span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${getProgressPercentage()}%` }}
                      />
                    </div>
                    <div className="text-xs text-purple-600">
                      {Math.round(getProgressPercentage()) < 50 && "Keep going! You're making great progress."}
                      {Math.round(getProgressPercentage()) >= 50 && Math.round(getProgressPercentage()) < 100 && "Excellent! You're almost there."}
                      {Math.round(getProgressPercentage()) === 100 && "Perfect! Your profile is complete."}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    }>
      <OnboardingForm />
    </Suspense>
  )
}