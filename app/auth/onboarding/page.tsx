'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, ArrowLeft, ArrowRight, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

function OnboardingForm() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    bio: '',
    location: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  console.log('🔍 Onboarding component rendering, step:', step)
  
  // Validation function
  const validateStep = (stepNumber: number) => {
    const newErrors: Record<string, string> = {}
    
    if (stepNumber === 1) {
      if (!formData.bio.trim()) {
        newErrors.bio = 'Bio is required'
      } else if (formData.bio.trim().length < 50) {
        newErrors.bio = 'Bio should be at least 50 characters'
      }
      
      if (!formData.location.trim()) {
        newErrors.location = 'Location is required'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  // Navigation functions
  const handleNext = () => {
    const isValid = validateStep(step)
    if (isValid) {
      setStep(prev => prev + 1)
    }
  }
  
  const handleBack = () => {
    setStep(prev => prev - 1)
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Business Services Hub</h1>
                  <p className="text-sm text-gray-600">Complete your profile to get started</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-gray-800">Step {step} of 3</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-600">{Math.round((step / 3) * 100)}% Complete</span>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${(step / 3) * 100}%` }}
                  />
                </div>
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
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {step === 1 ? 'Tell us about yourself' : step === 2 ? 'Business Details' : 'Complete Profile'}
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-lg mt-2">
                    {step === 1 ? 'Help others get to know you better' : step === 2 ? 'Tell us about your business' : 'Review and complete your profile'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {step === 1 && (
                    <>
                      {/* Bio */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-gray-700">Bio *</Label>
                        <Textarea
                          value={formData.bio}
                          onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                          placeholder="Tell us about yourself, your experience, and what makes you unique..."
                          className="min-h-[120px] resize-none"
                        />
                        <div className="flex justify-between text-sm">
                          <span className={errors.bio ? 'text-red-500' : 'text-gray-500'}>
                            {errors.bio || `${formData.bio.length}/500 characters`}
                          </span>
                        </div>
                      </div>
                      
                      {/* Location */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-gray-700">Location *</Label>
                        <Input
                          value={formData.location}
                          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="City, Country"
                        />
                        {errors.location && <span className="text-sm text-red-500">{errors.location}</span>}
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <div className="text-center space-y-6">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <Building2 className="h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Step 2 Content</h3>
                        <p className="text-gray-600">This is step 2 content.</p>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="text-center space-y-6">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <Building2 className="h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">You're all set!</h3>
                        <p className="text-gray-600">Your profile is complete.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-800">Profile Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className={`flex items-center space-x-3 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                      1
                    </div>
                    <span className="text-sm">Basic Information</span>
                  </div>
                  <div className={`flex items-center space-x-3 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                      2
                    </div>
                    <span className="text-sm">Business Details</span>
                  </div>
                  <div className={`flex items-center space-x-3 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                      3
                    </div>
                    <span className="text-sm">Complete Profile</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

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
                className="flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg font-semibold shadow-lg"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                type="button"
                onClick={() => alert('Profile completed!')}
                className="flex items-center bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-2 rounded-lg font-semibold shadow-lg"
              >
                Complete Profile
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
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      <button 
        onClick={() => {
          alert('SIMPLE BUTTON WORKS!')
          console.log('Simple button clicked!')
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        SIMPLE TEST BUTTON
      </button>
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
    </div>
  )
}