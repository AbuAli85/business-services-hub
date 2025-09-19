'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Mail, 
  Phone, 
  LogOut,
  User,
  Building2,
  AlertCircle,
  Shield
} from 'lucide-react'
import { PlatformLogo } from '@/components/ui/platform-logo'

interface ProfileStatus {
  id: string
  full_name: string
  role: string
  company_name?: string
  verification_status: 'pending' | 'approved' | 'rejected'
  profile_completed: boolean
  admin_notes?: string
  created_at: string
  verified_at?: string
}

export default function PendingApprovalPage() {
  const [profile, setProfile] = useState<ProfileStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkProfileStatus()
  }, [])

  const checkProfileStatus = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, company_name, verification_status, profile_completed, admin_notes, created_at, verified_at')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        toast.error('Failed to load profile status')
        return
      }

      setProfile(profileData)

      // If profile is approved, redirect to dashboard
      if (profileData.verification_status === 'approved') {
        toast.success('Your account has been approved! Redirecting to dashboard...')
        router.push('/dashboard')
        return
      }

      // Admin users bypass profile completion checks
      if (profileData.role === 'admin') {
        console.log('Admin user detected, redirecting to dashboard')
        router.push('/dashboard')
        return
      }

      // If profile is not completed, redirect to onboarding
      if (!profileData.profile_completed) {
        router.push('/auth/onboarding')
        return
      }

    } catch (error) {
      console.error('Error checking profile status:', error)
      toast.error('An error occurred while checking your status')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await checkProfileStatus()
    setRefreshing(false)
  }

  const handleSignOut = async () => {
    try {
      const supabase = await getSupabaseClient()
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      router.push('/')
    }
  }

  const getStatusIcon = () => {
    if (!profile) return null
    
    switch (profile.verification_status) {
      case 'approved':
        return <CheckCircle className="h-8 w-8 text-green-500" />
      case 'rejected':
        return <XCircle className="h-8 w-8 text-red-500" />
      default:
        return <Clock className="h-8 w-8 text-yellow-500" />
    }
  }

  const getStatusBadge = () => {
    if (!profile) return null
    
    switch (profile.verification_status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Pending Review</Badge>
    }
  }

  const getStatusMessage = () => {
    if (!profile) return ''
    
    switch (profile.verification_status) {
      case 'approved':
        return 'Your account has been approved and is ready to use!'
      case 'rejected':
        return 'Your account application has been rejected. Please contact support for more information.'
      default:
        return 'Your account is currently under review by our admin team.'
    }
  }

  const getNextSteps = () => {
    if (!profile) return []
    
    switch (profile.verification_status) {
      case 'approved':
        return [
          'You can now access all platform features',
          'Start connecting with other users',
          'Complete your profile setup if needed'
        ]
      case 'rejected':
        return [
          'Contact our support team for assistance',
          'Review your application details',
          'Consider reapplying with updated information'
        ]
      default:
        return [
          'Our admin team will review your application',
          'You will receive an email notification once reviewed',
          'This process typically takes 1-2 business days'
        ]
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your status...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">Unable to load your profile information.</p>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
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
              <PlatformLogo className="h-8 w-8" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">BusinessHub</h1>
                <p className="text-sm text-gray-500">Account Status</p>
              </div>
            </div>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Status Card */}
            <div className="lg:col-span-2">
              <Card className="shadow-lg border-0">
                <CardHeader className="text-center pb-6">
                  <div className="mx-auto mb-4">
                    {getStatusIcon()}
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                    Account Status
                  </CardTitle>
                  <div className="flex justify-center mb-4">
                    {getStatusBadge()}
                  </div>
                  <CardDescription className="text-gray-600 text-base">
                    {getStatusMessage()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Profile Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <span className="ml-2 font-medium">{profile.full_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Role:</span>
                        <span className="ml-2 font-medium capitalize">{profile.role}</span>
                      </div>
                      {profile.company_name && (
                        <div className="md:col-span-2">
                          <span className="text-gray-600">Company:</span>
                          <span className="ml-2 font-medium">{profile.company_name}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Applied:</span>
                        <span className="ml-2 font-medium">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {profile.verified_at && (
                        <div>
                          <span className="text-gray-600">Reviewed:</span>
                          <span className="ml-2 font-medium">
                            {new Date(profile.verified_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Notes */}
                  {profile.admin_notes && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Notes
                      </h3>
                      <p className="text-blue-800 text-sm">{profile.admin_notes}</p>
                    </div>
                  )}

                  {/* Next Steps */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">Next Steps</h3>
                    <ul className="space-y-2">
                      {getNextSteps().map((step, index) => (
                        <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      variant="outline"
                      className="flex-1"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                      {refreshing ? 'Refreshing...' : 'Refresh Status'}
                    </Button>
                    {profile.verification_status === 'rejected' && (
                      <Button
                        onClick={() => router.push('/contact')}
                        className="flex-1"
                      >
                        Contact Support
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* Contact Information */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-gray-900">Need Help?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email Support</p>
                        <p className="text-xs text-gray-500">support@businesshub.com</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Phone Support</p>
                        <p className="text-xs text-gray-500">+1 (555) 123-4567</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Process Information */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-gray-900">Review Process</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-2">
                      <p><strong>Step 1:</strong> Profile completion</p>
                      <p><strong>Step 2:</strong> Admin review</p>
                      <p><strong>Step 3:</strong> Approval notification</p>
                      <p><strong>Step 4:</strong> Dashboard access</p>
                    </div>
                    <div className="text-xs text-gray-500 mt-4">
                      <p>Review typically takes 1-2 business days. You'll receive an email notification once your account is reviewed.</p>
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
