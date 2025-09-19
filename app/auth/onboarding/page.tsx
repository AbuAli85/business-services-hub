'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  X
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
  const hasProcessedRedirect = useRef(false)
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
        
        // Check if user already has a completed profile using the proper completion status
        if (profile?.profile_completed && profile?.verification_status === 'approved') {
          // User already has a complete and approved profile, redirect to dashboard
          if (!hasProcessedRedirect.current) {
            console.log('✅ Profile already completed and approved, redirecting to dashboard')
            hasProcessedRedirect.current = true
            setIsRedirecting(true)
            router.push('/dashboard')
            return
          }
        }
        
        if (profile?.verification_status === 'pending') {
          // User profile is pending approval, redirect to pending approval page
          if (!hasProcessedRedirect.current) {
            console.log('⏳ Profile pending approval, redirecting to pending approval page')
            hasProcessedRedirect.current = true
            setIsRedirecting(true)
            router.push('/auth/pending-approval')
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

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
    
    if (stepNumber === 1) {
      if (!formData.bio.trim()) newErrors.bio = 'Bio is required'
      if (!formData.location.trim()) newErrors.location = 'Location is required'
    } else if (stepNumber === 2) {
      if ((userRole || role) === 'provider') {
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

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1)
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
            cr_number: formData.crNumber,
            vat_number: formData.vatNumber,
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

  const getStepTitle = () => {
    if (step === 1) return 'Tell us about yourself'
    if (step === 2) return (userRole || role) === 'provider' ? 'Your business details' : 'Your preferences'
    return 'Complete your profile'
  }

  const getStepDescription = () => {
    if (step === 1) return 'Help others get to know you better'
    if (step === 2) return (userRole || role) === 'provider' ? 'Share details about your business and services' : 'Tell us what you\'re looking for'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
                </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">BusinessHub</h1>
                <p className="text-sm text-gray-500">Complete your profile</p>
              </div>
            </div>
            <Badge variant="outline" className="px-3 py-1">
              {(userRole || role) === 'provider' ? 'Service Provider' : 'Client'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Step {step} of 3</span>
              <span className="text-sm text-gray-500">{Math.round(getProgressPercentage())}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <Card className="shadow-lg border-0">
                <CardHeader className="pb-6">
                  <CardTitle className="text-2xl font-bold text-gray-900">{getStepTitle()}</CardTitle>
                  <CardDescription className="text-gray-600">{getStepDescription()}</CardDescription>
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
                      <div className="space-y-2">
                        <Label htmlFor="bio" className="text-sm font-semibold text-gray-700">Bio *</Label>
                        <Textarea
                          id="bio"
                          placeholder="Tell us about yourself, your experience, and what makes you unique..."
                          value={formData.bio}
                          onChange={(e) => handleInputChange('bio', e.target.value)}
                          className="min-h-[100px] resize-none"
                        />
                        {errors.bio && (
                          <p className="text-sm text-red-500">{errors.bio}</p>
                        )}
                      </div>

                      {/* Location */}
                      <div className="space-y-2">
                        <Label htmlFor="location" className="text-sm font-semibold text-gray-700">Location *</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="location"
                            placeholder="City, Country"
                            value={formData.location}
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        {errors.location && (
                          <p className="text-sm text-red-500">{errors.location}</p>
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

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* Role Benefits */}
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-blue-900 flex items-center">
                      {(userRole || role) === 'provider' ? (
                        <>
                          <Building2 className="h-5 w-5 mr-2" />
                          Provider Benefits
                        </>
                      ) : (
                        <>
                          <User className="h-5 w-5 mr-2" />
                          Client Benefits
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(userRole || role) === 'provider' ? (
                      <>
                        <div className="flex items-start space-x-3">
                          <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                          <span className="text-sm text-blue-800">Grow your business with new clients</span>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                          <span className="text-sm text-blue-800">Secure payment processing</span>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Star className="h-4 w-4 text-blue-600 mt-0.5" />
                          <span className="text-sm text-blue-800">Build your reputation and reviews</span>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Target className="h-4 w-4 text-blue-600 mt-0.5" />
                          <span className="text-sm text-blue-800">Target your ideal clients</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start space-x-3">
                          <Users className="h-4 w-4 text-blue-600 mt-0.5" />
                          <span className="text-sm text-blue-800">Access to verified professionals</span>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                          <span className="text-sm text-blue-800">Secure and protected transactions</span>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Star className="h-4 w-4 text-blue-600 mt-0.5" />
                          <span className="text-sm text-blue-800">Quality assured services</span>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Target className="h-4 w-4 text-blue-600 mt-0.5" />
                          <span className="text-sm text-blue-800">Find the perfect match for your needs</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Progress Steps */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-gray-900">Profile Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {[1, 2, 3].map((stepNumber) => (
                        <div key={stepNumber} className="flex items-center space-x-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                            stepNumber <= step 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-200 text-gray-500'
                          }`}>
                            {stepNumber < step ? <CheckCircle className="h-3 w-3" /> : stepNumber}
                          </div>
                          <span className={`text-sm ${
                            stepNumber <= step ? 'text-gray-900 font-medium' : 'text-gray-500'
                          }`}>
                            {stepNumber === 1 && 'Basic Information'}
                            {stepNumber === 2 && ((userRole || role) === 'provider' ? 'Business Details' : 'Preferences')}
                            {stepNumber === 3 && 'Complete Profile'}
                          </span>
                        </div>
                      ))}
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