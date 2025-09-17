'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { Loader2, CheckCircle, AlertCircle, User, Building2 } from 'lucide-react'

interface ProfileVerificationProps {
  userId: string
  userRole: string
  onComplete?: () => void
}

export function ProfileVerification({ userId, userRole, onComplete }: ProfileVerificationProps) {
  const [loading, setLoading] = useState(true)
  const [profileExists, setProfileExists] = useState(false)
  const [profileComplete, setProfileComplete] = useState(false)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    checkProfileStatus()
  }, [userId])

  const checkProfileStatus = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // Check if profile exists
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (!profile) {
        setProfileExists(false)
        setLoading(false)
        return
      }

      setProfileExists(true)

      // Check profile completeness
      const requiredFields = ['full_name', 'phone']
      const missing = requiredFields.filter(field => !profile[field])
      
      setMissingFields(missing)
      setProfileComplete(missing.length === 0)
      setLoading(false)
    } catch (error) {
      console.error('Error checking profile status:', error)
      toast.error('Failed to verify profile status')
      setLoading(false)
    }
  }

  const createProfile = async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('User not found')

      const { data: result, error } = await supabase
        .rpc('create_user_profile', {
          user_id: userId,
          user_email: user.user.email || '',
          user_role: userRole,
          full_name: user.user.user_metadata?.full_name || '',
          phone: user.user.user_metadata?.phone || ''
        })

      if (error) throw error

      if (result?.success) {
        setProfileExists(true)
        toast.success('Profile created successfully!')
        checkProfileStatus()
      } else {
        throw new Error(result?.message || 'Profile creation failed')
      }
    } catch (error) {
      console.error('Error creating profile:', error)
      toast.error('Failed to create profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const goToProfile = () => {
    router.push('/dashboard/profile')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying profile...</p>
        </div>
      </div>
    )
  }

  if (!profileExists) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-xl">Profile Required</CardTitle>
          <CardDescription>
            You need to create a profile to continue using the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Button 
              onClick={createProfile}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Profile...
                </>
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" />
                  Create Profile
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!profileComplete) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle className="text-xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Please complete your profile to access all features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Missing information:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              {missingFields.map(field => (
                <li key={field} className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
                  {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </li>
              ))}
            </ul>
          </div>
          <div className="text-center">
            <Button 
              onClick={goToProfile}
              className="w-full"
            >
              <User className="mr-2 h-4 w-4" />
              Complete Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Profile exists and is complete
  if (onComplete) {
    onComplete()
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-4" />
        <p className="text-gray-600">Profile verified successfully!</p>
      </div>
    </div>
  )
}
