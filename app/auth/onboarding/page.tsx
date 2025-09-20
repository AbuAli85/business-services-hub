'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, ArrowLeft, ArrowRight, Building2, CheckCircle, AlertCircle, Info, Sparkles, Target, Users, Briefcase, Star, Zap, Shield, Award, TrendingUp, Globe, Mail, Phone, MapPin, ExternalLink, Eye, EyeOff, Save, Clock, Lightbulb, ChevronDown, ChevronUp, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { getSupabaseClient } from '@/lib/supabase'

function OnboardingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams.get('role') as 'client' | 'provider'
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState<'client' | 'provider' | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showTips, setShowTips] = useState(true)
  const [fieldFocus, setFieldFocus] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const [formData, setFormData] = useState({
    // Basic Info
    bio: '',
    location: '',
    website: '',
    linkedin: '',
    phone: '',
    
    // Provider fields
    companyName: '',
    services: '',
    experience: '',
    certifications: '',
    languages: '',
    availability: '',
    pricing: '',
    
    // Client fields
    preferredCategories: '',
    budgetRange: '',
    projectTimeline: '',
    communicationPreference: 'email',
    
    // Advanced fields
    timezone: '',
    workingHours: '',
    specializations: '',
    portfolio: '',
    testimonials: ''
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Removed console.log to prevent excessive re-rendering
  
  // Get current role with fallback
  const getCurrentRole = () => {
    return userRole || role || 'client'
  }
  
  // Initialize component
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        if (role) {
          setUserRole(role)
        } else {
          setUserRole('client')
        }
        setIsInitializing(false)
      } catch (error) {
        console.error('Initialization error:', error)
        setIsInitializing(false)
      }
    }
    
    initializeComponent()
  }, [role])
  
  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    
    autoSaveTimeoutRef.current = setTimeout(async () => {
      setIsAutoSaving(true)
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        setLastSaved(new Date())
        toast.success('Progress saved automatically', { duration: 2000 })
      } catch (error) {
        console.error('Auto-save failed:', error)
      } finally {
        setIsAutoSaving(false)
      }
    }, 2000)
  }, [])
  
  // Enhanced validation function
  const validateStep = (stepNumber: number) => {
    const newErrors: Record<string, string> = {}
    const currentRole = getCurrentRole()
    
    if (stepNumber === 1) {
      if (!formData.bio.trim()) {
        newErrors.bio = 'Bio is required'
      } else if (formData.bio.trim().length < 50) {
        newErrors.bio = 'Bio should be at least 50 characters'
      } else if (formData.bio.trim().length > 500) {
        newErrors.bio = 'Bio should be less than 500 characters'
      }
      
      if (!formData.location.trim()) {
        newErrors.location = 'Location is required'
      }
      
      if (formData.website && !isValidUrl(formData.website)) {
        newErrors.website = 'Please enter a valid website URL'
      }
      
      if (formData.linkedin && !isValidLinkedIn(formData.linkedin)) {
        newErrors.linkedin = 'Please enter a valid LinkedIn profile URL'
      }
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
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  // Helper functions
  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
  
  const isValidLinkedIn = (url: string) => {
    return url.includes('linkedin.com/in/') || url.includes('linkedin.com/company/')
  }
  
  const getCompletionPercentage = () => {
    const totalFields = getCurrentRole() === 'provider' ? 12 : 10
    const filledFields = Object.values(formData).filter(value => value && value.trim().length > 0).length
    return Math.round((filledFields / totalFields) * 100)
  }
  
  // Enhanced navigation functions
  const handleNext = () => {
    const isValid = validateStep(step)
    if (isValid) {
      setStep(prev => prev + 1)
      autoSave()
    } else {
      toast.error('Please fix the errors before continuing')
    }
  }
  
  const handleBack = () => {
    setStep(prev => prev - 1)
  }
  
  const handleSubmit = async () => {
    setLoading(true)
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please sign in to complete your profile')
        router.push('/auth/sign-in')
        return
      }

      // Get the access token for API authentication
      const { data: { session } } = await supabase.auth.getSession()
      console.log('🔍 Session data:', { 
        hasSession: !!session, 
        hasToken: !!session?.access_token,
        tokenLength: session?.access_token?.length 
      })
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
        console.log('🔍 Added auth header to request')
      } else {
        console.log('❌ No access token available')
      }

      // Call the profile completion API
      const response = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          formData,
          role: getCurrentRole()
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete profile')
      }

      toast.success('Profile completed successfully! Your profile is now pending admin approval.')
      
      // Redirect to pending approval page
      router.push('/auth/pending-approval')
    } catch (error) {
      console.error('Profile completion error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to complete profile')
    } finally {
      setLoading(false)
    }
  }
  
  // Form field handlers with auto-save
  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    autoSave()
  }
  
  const handleFieldFocus = (field: string) => {
    setFieldFocus(field)
  }
  
  const handleFieldBlur = () => {
    setFieldFocus(null)
  }
  
  // Get step title and description
  const getStepTitle = () => {
    if (step === 1) return 'Tell us about yourself'
    if (step === 2) return getCurrentRole() === 'provider' ? 'Business Details' : 'Preferences'
    return 'Complete Profile'
  }
  
  const getStepDescription = () => {
    if (step === 1) return 'Help others get to know you better'
    if (step === 2) return getCurrentRole() === 'provider' ? 'Tell us about your business' : 'Help us match you with the right providers'
    return 'Review and complete your profile'
  }
  
  // Pro tips for each field
  const getFieldTip = (field: string) => {
    const tips: Record<string, string> = {
      bio: 'Share your professional background, skills, and what makes you unique. Be specific about your expertise.',
      location: 'Include city and country. This helps with local service matching.',
      website: 'Include your professional website or portfolio to showcase your work.',
      linkedin: 'Add your LinkedIn profile to build professional credibility.',
      companyName: 'Use your official business name as it appears on legal documents.',
      services: 'List all services you offer. Be specific and include keywords clients might search for.',
      experience: 'Be honest about your experience level. Clients appreciate transparency.',
      preferredCategories: 'Select categories that match your business needs and interests.',
      budgetRange: 'This helps us match you with providers in your price range.'
    }
    return tips[field] || ''
  }
  
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto">
            <Building2 className="h-8 w-8 text-white animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-800">Setting up your profile...</h2>
            <p className="text-gray-600">This will only take a moment</p>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">Loading</span>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-indigo-50/30"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)`
        }}></div>
      </div>
      
      {/* Header */}
      <div className="relative bg-white/95 backdrop-blur-md border-b border-white/30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Building2 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                    Business Services Hub
                  </h1>
                  <p className="text-sm text-gray-600 flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <span>Complete your profile to unlock your potential</span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Badge 
                  variant="outline" 
                  className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 font-semibold shadow-sm"
                >
                  {getCurrentRole() === 'provider' ? 'Service Provider' : 'Client'}
                </Badge>
                
                {lastSaved && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Save className="h-4 w-4" />
                    <span>Saved {lastSaved.toLocaleTimeString()}</span>
                  </div>
                )}
                
                {isAutoSaving && (
                  <div className="flex items-center space-x-2 text-sm text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Progress Section */}
      <div className="relative bg-white/90 backdrop-blur-sm border-b border-white/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-800">Step {step} of 3</h2>
                <p className="text-gray-600">{getStepTitle()}</p>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{getCompletionPercentage()}%</div>
                  <div className="text-sm text-gray-600">Profile Complete</div>
                </div>
                
                <div className="w-32 bg-gray-200 rounded-full h-3 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-700 ease-out shadow-lg"
                    style={{ width: `${getCompletionPercentage()}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Step Indicators */}
            <div className="flex justify-between">
              {[1, 2, 3].map((stepNum) => (
                <div key={stepNum} className="flex flex-col items-center space-y-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    step >= stepNum 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {step > stepNum ? <CheckCircle className="h-5 w-5" /> : stepNum}
                  </div>
                  <span className={`text-xs font-medium ${
                    step >= stepNum ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    {stepNum === 1 ? 'Basic Info' : stepNum === 2 ? (getCurrentRole() === 'provider' ? 'Business' : 'Preferences') : 'Complete'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-3">
              <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm overflow-hidden">
                <CardHeader className="pb-8 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-t-lg border-b border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                        {getStepTitle()}
                      </CardTitle>
                      <CardDescription className="text-gray-600 text-lg mt-2 flex items-center space-x-2">
                        <Info className="h-4 w-4" />
                        <span>{getStepDescription()}</span>
                      </CardDescription>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="px-3 py-1 bg-blue-50 text-blue-700 border-blue-200">
                        {getCompletionPercentage()}% Complete
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-8 space-y-8">
                  {step === 1 && (
                    <div className="space-y-8">
                      {/* Bio Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                            <User className="h-5 w-5 text-blue-600" />
                            <span>Professional Bio *</span>
                          </Label>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Target className="h-4 w-4" />
                            <span>Help others understand your expertise</span>
                          </div>
                        </div>
                        
                        <div className="relative">
                          <Textarea
                            value={formData.bio}
                            onChange={(e) => handleFieldChange('bio', e.target.value)}
                            onFocus={() => handleFieldFocus('bio')}
                            onBlur={handleFieldBlur}
                            placeholder="Share your professional background, key skills, achievements, and what makes you unique. Be specific about your expertise and experience..."
                            className={`min-h-[140px] resize-none transition-all duration-200 ${
                              fieldFocus === 'bio' ? 'ring-2 ring-blue-500 shadow-lg' : ''
                            } ${errors.bio ? 'border-red-300' : 'border-gray-200'}`}
                          />
                          
                          {fieldFocus === 'bio' && (
                            <div className="absolute -bottom-8 left-0 right-0 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                              <div className="flex items-start space-x-2">
                                <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{getFieldTip('bio')}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center space-x-4">
                            <span className={errors.bio ? 'text-red-500' : 'text-gray-500'}>
                              {errors.bio || `${formData.bio.length}/500 characters`}
                            </span>
                            {formData.bio.length >= 50 && !errors.bio && (
                              <span className="text-green-600 flex items-center space-x-1">
                                <CheckCircle className="h-4 w-4" />
                                <span>Good length</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Separator className="my-8" />
                      
                      {/* Location Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                            <MapPin className="h-5 w-5 text-blue-600" />
                            <span>Location *</span>
                          </Label>
                        </div>
                        
                        <Input
                          value={formData.location}
                          onChange={(e) => handleFieldChange('location', e.target.value)}
                          onFocus={() => handleFieldFocus('location')}
                          onBlur={handleFieldBlur}
                          placeholder="City, Country (e.g., New York, USA)"
                          className={`transition-all duration-200 ${
                            fieldFocus === 'location' ? 'ring-2 ring-blue-500 shadow-lg' : ''
                          } ${errors.location ? 'border-red-300' : 'border-gray-200'}`}
                        />
                        
                        {fieldFocus === 'location' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                            <div className="flex items-start space-x-2">
                              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{getFieldTip('location')}</span>
                            </div>
                          </div>
                        )}
                        
                        {errors.location && <span className="text-sm text-red-500 flex items-center space-x-1">
                          <AlertCircle className="h-4 w-4" />
                          <span>{errors.location}</span>
                        </span>}
                      </div>
                      
                      <Separator className="my-8" />
                      
                      {/* Contact Information */}
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                          <Globe className="h-5 w-5 text-blue-600" />
                          <span>Contact Information</span>
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Website */}
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                              <ExternalLink className="h-4 w-4" />
                              <span>Website</span>
                            </Label>
                            <Input
                              value={formData.website}
                              onChange={(e) => handleFieldChange('website', e.target.value)}
                              onFocus={() => handleFieldFocus('website')}
                              onBlur={handleFieldBlur}
                              placeholder="https://yourwebsite.com"
                              className={`transition-all duration-200 ${
                                fieldFocus === 'website' ? 'ring-2 ring-blue-500 shadow-lg' : ''
                              } ${errors.website ? 'border-red-300' : 'border-gray-200'}`}
                            />
                            {fieldFocus === 'website' && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                                <div className="flex items-start space-x-2">
                                  <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <span>{getFieldTip('website')}</span>
                                </div>
                              </div>
                            )}
                            {errors.website && <span className="text-sm text-red-500 flex items-center space-x-1">
                              <AlertCircle className="h-4 w-4" />
                              <span>{errors.website}</span>
                            </span>}
                          </div>
                          
                          {/* LinkedIn */}
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                              <Users className="h-4 w-4" />
                              <span>LinkedIn Profile</span>
                            </Label>
                            <Input
                              value={formData.linkedin}
                              onChange={(e) => handleFieldChange('linkedin', e.target.value)}
                              onFocus={() => handleFieldFocus('linkedin')}
                              onBlur={handleFieldBlur}
                              placeholder="https://linkedin.com/in/yourprofile"
                              className={`transition-all duration-200 ${
                                fieldFocus === 'linkedin' ? 'ring-2 ring-blue-500 shadow-lg' : ''
                              } ${errors.linkedin ? 'border-red-300' : 'border-gray-200'}`}
                            />
                            {fieldFocus === 'linkedin' && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                                <div className="flex items-start space-x-2">
                                  <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <span>{getFieldTip('linkedin')}</span>
                                </div>
                              </div>
                            )}
                            {errors.linkedin && <span className="text-sm text-red-500 flex items-center space-x-1">
                              <AlertCircle className="h-4 w-4" />
                              <span>{errors.linkedin}</span>
                            </span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 2 && getCurrentRole() === 'provider' && (
                    <div className="space-y-8">
                      {/* Company Name */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                            <Briefcase className="h-5 w-5 text-green-600" />
                            <span>Company Name *</span>
                          </Label>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Info className="h-4 w-4" />
                            <span>Your business name</span>
                          </div>
                        </div>
                        
                        <Input
                          value={formData.companyName}
                          onChange={(e) => handleFieldChange('companyName', e.target.value)}
                          onFocus={() => handleFieldFocus('companyName')}
                          onBlur={handleFieldBlur}
                          placeholder="Enter your company or business name"
                          className={`transition-all duration-200 ${
                            fieldFocus === 'companyName' ? 'ring-2 ring-green-500 shadow-lg' : ''
                          } ${errors.companyName ? 'border-red-300' : 'border-gray-200'}`}
                        />
                        
                        {fieldFocus === 'companyName' && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                            <div className="flex items-start space-x-2">
                              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{getFieldTip('companyName')}</span>
                            </div>
                          </div>
                        )}
                        
                        {errors.companyName && <span className="text-sm text-red-500 flex items-center space-x-1">
                          <AlertCircle className="h-4 w-4" />
                          <span>{errors.companyName}</span>
                        </span>}
                      </div>
                      
                      <Separator className="my-8" />
                      
                      {/* Services Offered */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                            <Star className="h-5 w-5 text-green-600" />
                            <span>Services Offered *</span>
                          </Label>
                        </div>
                        
                        <div className="relative">
                          <Textarea
                            value={formData.services}
                            onChange={(e) => handleFieldChange('services', e.target.value)}
                            onFocus={() => handleFieldFocus('services')}
                            onBlur={handleFieldBlur}
                            placeholder="List all the services you offer. Be specific and include keywords clients might search for..."
                            className={`min-h-[120px] resize-none transition-all duration-200 ${
                              fieldFocus === 'services' ? 'ring-2 ring-green-500 shadow-lg' : ''
                            } ${errors.services ? 'border-red-300' : 'border-gray-200'}`}
                          />
                          
                          {fieldFocus === 'services' && (
                            <div className="absolute -bottom-8 left-0 right-0 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                              <div className="flex items-start space-x-2">
                                <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{getFieldTip('services')}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {errors.services && <span className="text-sm text-red-500 flex items-center space-x-1">
                          <AlertCircle className="h-4 w-4" />
                          <span>{errors.services}</span>
                        </span>}
                      </div>
                      
                      <Separator className="my-8" />
                      
                      {/* Experience Level */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                            <Award className="h-5 w-5 text-green-600" />
                            <span>Experience Level *</span>
                          </Label>
                        </div>
                        
                        <Select 
                          value={formData.experience} 
                          onValueChange={(value) => handleFieldChange('experience', value)}
                        >
                          <SelectTrigger className={`transition-all duration-200 ${
                            fieldFocus === 'experience' ? 'ring-2 ring-green-500 shadow-lg' : ''
                          } ${errors.experience ? 'border-red-300' : 'border-gray-200'}`}>
                            <SelectValue placeholder="Select your experience level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
                            <SelectItem value="intermediate">Intermediate (2-5 years)</SelectItem>
                            <SelectItem value="advanced">Advanced (5-10 years)</SelectItem>
                            <SelectItem value="expert">Expert (10+ years)</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {fieldFocus === 'experience' && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                            <div className="flex items-start space-x-2">
                              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{getFieldTip('experience')}</span>
                            </div>
                          </div>
                        )}
                        
                        {errors.experience && <span className="text-sm text-red-500 flex items-center space-x-1">
                          <AlertCircle className="h-4 w-4" />
                          <span>{errors.experience}</span>
                        </span>}
                      </div>
                      
                      <Separator className="my-8" />
                      
                      {/* Certifications */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                            <Award className="h-5 w-5 text-green-600" />
                            <span>Certifications & Credentials</span>
                          </Label>
                        </div>
                        
                        <Textarea
                          value={formData.certifications}
                          onChange={(e) => handleFieldChange('certifications', e.target.value)}
                          onFocus={() => handleFieldFocus('certifications')}
                          onBlur={handleFieldBlur}
                          placeholder="List your professional certifications, licenses, or credentials (e.g., PMP, AWS Certified, Google Analytics, etc.)"
                          className="min-h-[80px] resize-none transition-all duration-200"
                        />
                      </div>
                      
                      <Separator className="my-8" />
                      
                      {/* Languages */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                            <Globe className="h-5 w-5 text-green-600" />
                            <span>Languages</span>
                          </Label>
                        </div>
                        
                        <Input
                          value={formData.languages}
                          onChange={(e) => handleFieldChange('languages', e.target.value)}
                          onFocus={() => handleFieldFocus('languages')}
                          onBlur={handleFieldBlur}
                          placeholder="e.g., English (Native), Spanish (Fluent), French (Conversational)"
                          className="transition-all duration-200"
                        />
                      </div>
                      
                      <Separator className="my-8" />
                      
                      {/* Availability */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                            <Clock className="h-5 w-5 text-green-600" />
                            <span>Availability</span>
                          </Label>
                        </div>
                        
                        <Select 
                          value={formData.availability} 
                          onValueChange={(value) => handleFieldChange('availability', value)}
                        >
                          <SelectTrigger className="transition-all duration-200">
                            <SelectValue placeholder="Select your availability" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate (Available now)</SelectItem>
                            <SelectItem value="1-week">Within 1 week</SelectItem>
                            <SelectItem value="2-weeks">Within 2 weeks</SelectItem>
                            <SelectItem value="1-month">Within 1 month</SelectItem>
                            <SelectItem value="flexible">Flexible schedule</SelectItem>
                            <SelectItem value="part-time">Part-time only</SelectItem>
                            <SelectItem value="full-time">Full-time only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Separator className="my-8" />
                      
                      {/* Pricing */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            <span>Pricing Information</span>
                          </Label>
                        </div>
                        
                        <Textarea
                          value={formData.pricing}
                          onChange={(e) => handleFieldChange('pricing', e.target.value)}
                          onFocus={() => handleFieldFocus('pricing')}
                          onBlur={handleFieldBlur}
                          placeholder="Describe your pricing structure (e.g., $50-100/hour, $500-2000/project, retainer packages, etc.)"
                          className="min-h-[80px] resize-none transition-all duration-200"
                        />
                      </div>
                      
                      <Separator className="my-8" />
                      
                      {/* Specializations */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                            <Zap className="h-5 w-5 text-green-600" />
                            <span>Specializations</span>
                          </Label>
                        </div>
                        
                        <Textarea
                          value={formData.specializations}
                          onChange={(e) => handleFieldChange('specializations', e.target.value)}
                          onFocus={() => handleFieldFocus('specializations')}
                          onBlur={handleFieldBlur}
                          placeholder="List your key specializations or areas of expertise (e.g., E-commerce, Mobile Apps, Enterprise Solutions, etc.)"
                          className="min-h-[80px] resize-none transition-all duration-200"
                        />
                      </div>
                      
                      <Separator className="my-8" />
                      
                      {/* Portfolio */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                            <ExternalLink className="h-5 w-5 text-green-600" />
                            <span>Portfolio/Work Samples</span>
                          </Label>
                        </div>
                        
                        <Textarea
                          value={formData.portfolio}
                          onChange={(e) => handleFieldChange('portfolio', e.target.value)}
                          onFocus={() => handleFieldFocus('portfolio')}
                          onBlur={handleFieldBlur}
                          placeholder="Share links to your portfolio, GitHub, Dribbble, or other work samples"
                          className="min-h-[80px] resize-none transition-all duration-200"
                        />
                      </div>
                    </div>
                  )}

                  {step === 2 && getCurrentRole() === 'client' && (
                    <div className="space-y-8">
                      {/* Preferred Categories */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                            <Target className="h-5 w-5 text-blue-600" />
                            <span>Preferred Service Categories *</span>
                          </Label>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Info className="h-4 w-4" />
                            <span>What services do you need?</span>
                          </div>
                        </div>
                        
                        <div className="relative">
                          <Textarea
                            value={formData.preferredCategories}
                            onChange={(e) => handleFieldChange('preferredCategories', e.target.value)}
                            onFocus={() => handleFieldFocus('preferredCategories')}
                            onBlur={handleFieldBlur}
                            placeholder="e.g., Web Development, Digital Marketing, Graphic Design, Content Writing, SEO Services, Social Media Management..."
                            className={`min-h-[120px] resize-none transition-all duration-200 ${
                              fieldFocus === 'preferredCategories' ? 'ring-2 ring-blue-500 shadow-lg' : ''
                            } ${errors.preferredCategories ? 'border-red-300' : 'border-gray-200'}`}
                          />
                          
                          {fieldFocus === 'preferredCategories' && (
                            <div className="absolute -bottom-8 left-0 right-0 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                              <div className="flex items-start space-x-2">
                                <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{getFieldTip('preferredCategories')}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {errors.preferredCategories && <span className="text-sm text-red-500 flex items-center space-x-1">
                          <AlertCircle className="h-4 w-4" />
                          <span>{errors.preferredCategories}</span>
                        </span>}
                      </div>
                      
                      <Separator className="my-8" />
                      
                      {/* Budget Range */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            <span>Budget Range *</span>
                          </Label>
                        </div>
                        
                        <Select 
                          value={formData.budgetRange} 
                          onValueChange={(value) => handleFieldChange('budgetRange', value)}
                        >
                          <SelectTrigger className={`transition-all duration-200 ${
                            fieldFocus === 'budgetRange' ? 'ring-2 ring-blue-500 shadow-lg' : ''
                          } ${errors.budgetRange ? 'border-red-300' : 'border-gray-200'}`}>
                            <SelectValue placeholder="Select your budget range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="under-1k">Under $1,000</SelectItem>
                            <SelectItem value="1k-5k">$1,000 - $5,000</SelectItem>
                            <SelectItem value="5k-10k">$5,000 - $10,000</SelectItem>
                            <SelectItem value="10k-25k">$10,000 - $25,000</SelectItem>
                            <SelectItem value="25k-plus">$25,000+</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {fieldFocus === 'budgetRange' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                            <div className="flex items-start space-x-2">
                              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{getFieldTip('budgetRange')}</span>
                            </div>
                          </div>
                        )}
                        
                        {errors.budgetRange && <span className="text-sm text-red-500 flex items-center space-x-1">
                          <AlertCircle className="h-4 w-4" />
                          <span>{errors.budgetRange}</span>
                        </span>}
                      </div>
                      
                      <Separator className="my-8" />
                      
                      {/* Project Timeline */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                            <Clock className="h-5 w-5 text-blue-600" />
                            <span>Project Timeline</span>
                          </Label>
                        </div>
                        
                        <Select 
                          value={formData.projectTimeline} 
                          onValueChange={(value) => handleFieldChange('projectTimeline', value)}
                        >
                          <SelectTrigger className="transition-all duration-200">
                            <SelectValue placeholder="When do you need the project completed?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asap">ASAP (Within 1 week)</SelectItem>
                            <SelectItem value="1-month">Within 1 month</SelectItem>
                            <SelectItem value="2-3-months">2-3 months</SelectItem>
                            <SelectItem value="3-6-months">3-6 months</SelectItem>
                            <SelectItem value="6-months-plus">6+ months</SelectItem>
                            <SelectItem value="flexible">Flexible timeline</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Separator className="my-8" />
                      
                      {/* Communication Preference */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                            <Mail className="h-5 w-5 text-blue-600" />
                            <span>Communication Preference</span>
                          </Label>
                        </div>
                        
                        <Select 
                          value={formData.communicationPreference} 
                          onValueChange={(value) => handleFieldChange('communicationPreference', value)}
                        >
                          <SelectTrigger className="transition-all duration-200">
                            <SelectValue placeholder="How would you like to communicate?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone calls</SelectItem>
                            <SelectItem value="video">Video calls</SelectItem>
                            <SelectItem value="chat">Chat/Instant messaging</SelectItem>
                            <SelectItem value="mixed">Mixed (Email + Calls)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-8">
                      <div className="text-center space-y-6">
                        <div className="w-24 h-24 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto">
                          <Award className="h-12 w-12 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold text-gray-900 mb-4">You're all set!</h3>
                          <p className="text-xl text-gray-600 mb-6">
                            Your profile is complete and ready to help you {getCurrentRole() === 'provider' ? 'attract clients' : 'find the perfect service providers'}.
                          </p>
                          <div className="flex items-center justify-center space-x-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-semibold">Profile {getCompletionPercentage()}% Complete</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Profile Summary for Providers */}
                      {getCurrentRole() === 'provider' && (
                        <div className="mt-8">
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                              <Briefcase className="h-5 w-5 text-green-600" />
                              <span>Your Business Profile Summary</span>
                            </h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              {formData.companyName && (
                                <div className="flex items-center space-x-2">
                                  <Building2 className="h-4 w-4 text-green-600" />
                                  <span className="font-medium">Company:</span>
                                  <span className="text-gray-700">{formData.companyName}</span>
                                </div>
                              )}
                              
                              {formData.experience && (
                                <div className="flex items-center space-x-2">
                                  <Award className="h-4 w-4 text-green-600" />
                                  <span className="font-medium">Experience:</span>
                                  <span className="text-gray-700 capitalize">{formData.experience}</span>
                                </div>
                              )}
                              
                              {formData.availability && (
                                <div className="flex items-center space-x-2">
                                  <Clock className="h-4 w-4 text-green-600" />
                                  <span className="font-medium">Availability:</span>
                                  <span className="text-gray-700 capitalize">{formData.availability.replace('-', ' ')}</span>
                                </div>
                              )}
                              
                              {formData.languages && (
                                <div className="flex items-center space-x-2">
                                  <Globe className="h-4 w-4 text-green-600" />
                                  <span className="font-medium">Languages:</span>
                                  <span className="text-gray-700">{formData.languages}</span>
                                </div>
                              )}
                            </div>
                            
                            {formData.services && (
                              <div className="mt-4">
                                <div className="flex items-start space-x-2">
                                  <Star className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                                  <div>
                                    <span className="font-medium text-sm">Services:</span>
                                    <p className="text-gray-700 text-sm mt-1">{formData.services}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {formData.specializations && (
                              <div className="mt-4">
                                <div className="flex items-start space-x-2">
                                  <Zap className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                                  <div>
                                    <span className="font-medium text-sm">Specializations:</span>
                                    <p className="text-gray-700 text-sm mt-1">{formData.specializations}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-6 bg-blue-50 rounded-xl p-6 border border-blue-200">
                            <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center space-x-2">
                              <Lightbulb className="h-5 w-5" />
                              <span>Next Steps</span>
                            </h4>
                            <ul className="space-y-2 text-sm text-blue-700">
                              <li className="flex items-start space-x-2">
                                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>Your profile will be reviewed and approved within 24-48 hours</span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>Once approved, you can start receiving client requests</span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>Complete your service listings to increase visibility</span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>Upload portfolio samples to showcase your work</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}
                      
                      {/* Profile Summary for Clients */}
                      {getCurrentRole() === 'client' && (
                        <div className="mt-8">
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                              <Target className="h-5 w-5 text-blue-600" />
                              <span>Your Preferences Summary</span>
                            </h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              {formData.preferredCategories && (
                                <div className="flex items-start space-x-2">
                                  <Star className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                                  <div>
                                    <span className="font-medium">Interested in:</span>
                                    <p className="text-gray-700">{formData.preferredCategories}</p>
                                  </div>
                                </div>
                              )}
                              
                              {formData.budgetRange && (
                                <div className="flex items-center space-x-2">
                                  <TrendingUp className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium">Budget:</span>
                                  <span className="text-gray-700 capitalize">{formData.budgetRange.replace('-', ' - ')}</span>
                                </div>
                              )}
                              
                              {formData.projectTimeline && (
                                <div className="flex items-center space-x-2">
                                  <Clock className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium">Timeline:</span>
                                  <span className="text-gray-700 capitalize">{formData.projectTimeline.replace('-', ' ')}</span>
                                </div>
                              )}
                              
                              {formData.communicationPreference && (
                                <div className="flex items-center space-x-2">
                                  <Mail className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium">Communication:</span>
                                  <span className="text-gray-700 capitalize">{formData.communicationPreference}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-6 bg-green-50 rounded-xl p-6 border border-green-200">
                            <h4 className="text-lg font-semibold text-green-800 mb-3 flex items-center space-x-2">
                              <Lightbulb className="h-5 w-5" />
                              <span>What's Next?</span>
                            </h4>
                            <ul className="space-y-2 text-sm text-green-700">
                              <li className="flex items-start space-x-2">
                                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>Browse available service providers in your area</span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>Compare profiles and portfolios</span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>Send project requests to qualified providers</span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>Review proposals and select the best match</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Sidebar */}
            <div className="space-y-6">
              {/* Profile Progress Card */}
              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <span>Profile Progress</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {[
                      { num: 1, title: 'Basic Info', desc: 'Personal details' },
                      { num: 2, title: getCurrentRole() === 'provider' ? 'Business' : 'Preferences', desc: getCurrentRole() === 'provider' ? 'Company info' : 'Your needs' },
                      { num: 3, title: 'Complete', desc: 'Final review' }
                    ].map((item) => (
                      <div key={item.num} className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                        step >= item.num ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                          step >= item.num 
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                            : 'bg-gray-200 text-gray-400'
                        }`}>
                          {step > item.num ? <CheckCircle className="h-4 w-4" /> : item.num}
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-semibold ${step >= item.num ? 'text-blue-600' : 'text-gray-400'}`}>
                            {item.title}
                          </div>
                          <div className="text-xs text-gray-500">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Completion</span>
                      <span className="font-semibold text-blue-600">{getCompletionPercentage()}%</span>
                    </div>
                    <Progress value={getCompletionPercentage()} className="h-2" />
                  </div>
                </CardContent>
              </Card>
              
              {/* Pro Tips Card */}
              {showTips && (
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-blue-800 flex items-center space-x-2">
                      <Lightbulb className="h-5 w-5" />
                      <span>Pro Tips</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-blue-700 space-y-2">
                      <div className="flex items-start space-x-2">
                        <Star className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                        <span>Be specific about your skills and experience</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Shield className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                        <span>Include relevant keywords for better discoverability</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Zap className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                        <span>Complete all fields to increase your profile strength</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowTips(false)}
                      className="w-full text-blue-600 hover:text-blue-700"
                    >
                      Hide Tips
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {/* Auto-save Status */}
              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Save className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Auto-save</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isAutoSaving ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                          <span className="text-xs text-blue-600">Saving...</span>
                        </>
                      ) : lastSaved ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span className="text-xs text-green-600">Saved</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">Ready</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Enhanced Navigation */}
          <div className="flex justify-between items-center mt-8 p-6 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
              className="flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Step {step} of 3
              </div>
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
            </div>
            
            {step < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Completing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Complete Profile</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto">
            <Building2 className="h-8 w-8 text-white animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-800">Loading your profile setup...</h2>
            <p className="text-gray-600">This will only take a moment</p>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">Loading</span>
          </div>
        </div>
      </div>
    }>
      <OnboardingForm />
    </Suspense>
  )
}