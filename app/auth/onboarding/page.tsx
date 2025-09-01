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
import { Loader2, Building2, User, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'

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
      try {
        const supabase = await getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          toast.error('Please sign in to continue onboarding')
          router.push('/auth/sign-in')
          return
        }
        
        if (!role || !['client', 'provider'].includes(role)) {
          router.push('/auth/sign-up')
          return
        }
      } catch (error) {
        toast.error('Authentication check failed')
        router.push('/auth/sign-in')
      }
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
      if (role === 'provider' && !formData.companyName.trim()) {
        toast.error('Please enter your company name')
        return
      }
      if (role === 'client' && !formData.billingPreference) {
        toast.error('Please select your billing preference')
        return
      }
    }
    setStep(step + 1)
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please sign in again to continue')
        router.push('/auth/sign-in')
        return
      }

      // First, ensure the profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (!existingProfile) {
        // Create profile if it doesn't exist
        const profileData: any = {
          id: user.id,
          role: role,
          email: user.email,
        }
        
        if (user.user_metadata?.full_name) {
          profileData.full_name = user.user_metadata.full_name
        }
        
        if (user.user_metadata?.phone) {
          profileData.phone = user.user_metadata.phone
        }
        
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert(profileData)
        
        if (createProfileError) {
          toast.error(`Profile creation failed: ${createProfileError.message}`)
          return
        }
      }

      if (role === 'provider') {
        // Create company for provider
        try {
          // First, ensure the user has a profile
          const { data: existingProfile, error: profileCheckError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single()

          if (profileCheckError && profileCheckError.code !== 'PGRST116') {
            console.error('Error checking profile:', profileCheckError)
            toast.error('Failed to verify user profile')
            return
          }

          // If no profile exists, create one
          if (!existingProfile) {
            console.log('Creating missing profile for provider:', user.email)
            const { error: profileCreateError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                email: user.email,
                full_name: formData.fullName,
                role: 'provider',
                phone: formData.phone || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })

            if (profileCreateError) {
              console.error('Profile creation error:', profileCreateError)
              toast.error(`Profile creation failed: ${profileCreateError.message}`)
              return
            }
            console.log('Profile created successfully for provider')
          }

          // Now create company
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .insert({
              owner_id: user.id,
              name: formData.companyName,
              cr_number: formData.crNumber || null,
              vat_number: formData.vatNumber || null,
              description: formData.bio || null
            })
            .select()
            .single()

          if (companyError) {
            console.error('Company creation error:', companyError)
            toast.error(`Company creation failed: ${companyError.message}`)
            return
          }

          // Update profile with company_id
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({ company_id: company.id })
            .eq('id', user.id)

          if (profileUpdateError) {
            console.error('Profile update error:', profileUpdateError)
            toast.error(`Profile update failed: ${profileUpdateError.message}`)
            return
          }
        } catch (error) {
          console.error('Error creating company profile:', error)
          toast.error('Failed to create company profile')
          return
        }
      }

      toast.success('Onboarding completed successfully!')
      router.push('/dashboard')
      
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.')
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
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
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
                        className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="vatNumber">VAT Number (Optional)</Label>
                      <Input
                        id="vatNumber"
                        placeholder="VAT registration number"
                        value={formData.vatNumber}
                        onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                        className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
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
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
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
                  <strong>Coming Soon:</strong> Bio and profile image features will be available in the next update.
                </p>
              </div>
            </div>
          )}

          {step === 3 && role === 'provider' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Coming Soon:</strong> Portfolio links and services details will be available in the next update.
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
                className="transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                Skip for now
              </Button>
            </div>
            
            {step < totalSteps ? (
              <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 transition-colors duration-200">
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 transition-colors duration-200"
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
