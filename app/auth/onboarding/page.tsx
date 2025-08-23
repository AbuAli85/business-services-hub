'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { Loader2, Building2, User, CheckCircle } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams.get('role') as 'client' | 'provider'
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Provider fields
    companyName: '',
    crNumber: '',
    vatNumber: '',
    portfolioLinks: '',
    services: '',
    
    // Client fields
    billingPreference: 'email',
    preferredCategories: '',
    
    // Common fields
    bio: '',
    profileImage: null as File | null,
  })

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user in onboarding:', user)
      console.log('Role from query params:', role)
      
      if (!user) {
        toast.error('Please sign in to continue onboarding')
        router.push('/auth/sign-in')
        return
      }
      
      if (!role || !['client', 'provider'].includes(role)) {
        console.log('No valid role found, redirecting to sign-up')
        console.log('Available roles:', ['client', 'provider'])
        console.log('Current role:', role)
        router.push('/auth/sign-up')
        return
      }
      
      console.log('Auth check passed, role is valid:', role)
    }
    
    checkAuth()
  }, [role, router])

  const handleInputChange = (field: string, value: string | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    handleInputChange('profileImage', file)
  }

  const handleNext = () => {
    if (step === 1) {
      if (role === 'provider' && !formData.companyName) {
        toast.error('Please enter your company name')
        return
      }
      if (role === 'client' && !formData.billingPreference) {
        toast.error('Please select your billing preference')
        return
      }
    }
    // Step 2 and 3 are now just informational
    setStep(step + 1)
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    
    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please sign in again to continue')
        router.push('/auth/sign-in')
        return
      }

      // Update profile with onboarding data
      const profileUpdateData: any = {
        bio: formData.bio,
        updated_at: new Date().toISOString()
      }

      if (role === 'provider') {
        profileUpdateData.company_name = formData.companyName
        profileUpdateData.cr_number = formData.crNumber
        profileUpdateData.vat_number = formData.vatNumber
        profileUpdateData.portfolio_links = formData.portfolioLinks
        profileUpdateData.services = formData.services
      } else if (role === 'client') {
        profileUpdateData.billing_preference = formData.billingPreference
        profileUpdateData.preferred_categories = formData.preferredCategories
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        toast.error('Failed to complete profile setup')
        return
      }

      // First, ensure the profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (!existingProfile) {
        // Create profile if it doesn't exist - include required email field
        const profileData: any = {
          id: user.id,
          role: role,
          email: user.email, // Add required email field
        }
        
        // Only add optional fields if they exist in user metadata
        if (user.user_metadata?.full_name) {
          profileData.full_name = user.user_metadata.full_name
        }
        
        if (user.user_metadata?.phone) {
          profileData.phone = user.user_metadata.phone
        }
        
        // Note: country column doesn't exist in current database schema
        // Skip country field for now
        
        console.log('Attempting to create profile with data:', profileData)
        
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert(profileData)
        
        if (createProfileError) {
          console.error('Profile creation error:', createProfileError)
          console.error('Error details:', createProfileError.details)
          console.error('Error hint:', createProfileError.hint)
          toast.error(`Profile creation failed: ${createProfileError.message}`)
          return
        }
        
        console.log('Profile created successfully')
      } else {
        console.log('Profile already exists:', existingProfile)
      }

      // Note: bio and profile_image_url columns don't exist in current schema
      // These will be added in a future migration
      console.log('Skipping bio and profile image update - columns not yet available')

      if (role === 'provider') {
        // Skip company creation for now due to database schema mismatch
        // TODO: Fix database schema and re-enable company creation
        console.log('Skipping company creation - database schema mismatch')
        console.log('Company name would be:', formData.companyName)
        console.log('CR number would be:', formData.crNumber)
        console.log('VAT number would be:', formData.vatNumber)
      }

      // Profile update skipped - no updatable fields in current schema
      console.log('Profile update skipped - no updatable fields available')

      toast.success('Onboarding completed successfully!')
      router.push('/dashboard')
      
    } catch (error) {
      console.error('Onboarding error - Full details:', error)
      console.error('Error type:', typeof error)
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      
      if (error instanceof Error) {
        toast.error(`Unexpected error: ${error.message}`)
      } else {
        toast.error('An unexpected error occurred. Check console for details.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!role) {
    return null
  }

  const totalSteps = role === 'provider' ? 3 : 2

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>
            {role === 'provider' 
              ? 'Tell us about your business to get started'
              : 'Help us personalize your experience'
            }
          </CardDescription>
          
          {/* Debug info - remove after fixing */}
          <div className="mt-4 p-2 bg-yellow-100 rounded text-sm text-left">
            <strong>Debug Info:</strong><br />
            Role: {role || 'undefined'}<br />
            User ID: {typeof window !== 'undefined' ? 'Check console' : 'Loading...'}<br />
            Check console for detailed error information
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center mt-6 space-x-4">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i + 1 < step 
                    ? 'bg-green-500 text-white' 
                    : i + 1 === step 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {i + 1 < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
                </div>
                {i < totalSteps - 1 && (
                  <div className={`w-16 h-1 mx-2 ${
                    i + 1 < step ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardHeader>
        
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              {role === 'provider' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      placeholder="Enter your company name"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="crNumber">CR Number (Optional)</Label>
                      <Input
                        id="crNumber"
                        placeholder="Company registration number"
                        value={formData.crNumber}
                        onChange={(e) => handleInputChange('crNumber', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="vatNumber">VAT Number (Optional)</Label>
                      <Input
                        id="vatNumber"
                        placeholder="VAT registration number"
                        value={formData.vatNumber}
                        onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Billing Preference *</Label>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="billingPreference"
                          value="email"
                          checked={formData.billingPreference === 'email'}
                          onChange={(e) => handleInputChange('billingPreference', e.target.value)}
                          className="text-blue-600"
                        />
                        <span>Email</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="billingPreference"
                          value="sms"
                          checked={formData.billingPreference === 'sms'}
                          onChange={(e) => handleInputChange('billingPreference', e.target.value)}
                          className="text-blue-600"
                        />
                        <span>SMS</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="preferredCategories">Preferred Service Categories (Optional)</Label>
                    <Textarea
                      id="preferredCategories"
                      placeholder="e.g., Digital Marketing, Legal Services, IT Services"
                      value={formData.preferredCategories}
                      onChange={(e) => handleInputChange('preferredCategories', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

                     {step === 2 && (
             <div className="space-y-4">
               <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                 <p className="text-sm text-blue-800">
                   <strong>Note:</strong> Bio and profile image features will be available in the next update.
                 </p>
               </div>
             </div>
           )}

                     {step === 3 && role === 'provider' && (
             <div className="space-y-4">
               <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                 <p className="text-sm text-blue-800">
                   <strong>Note:</strong> Portfolio links and services details will be available in the next update.
                 </p>
               </div>
             </div>
           )}
          
          <div className="flex justify-between mt-8">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
              >
                Back
              </Button>
              
              {/* Temporary skip option */}
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="text-gray-500"
              >
                Skip for now
              </Button>
            </div>
            
            {step < totalSteps ? (
              <Button onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
