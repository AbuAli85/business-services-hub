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
  Shield,
  Calendar,
  MessageCircle,
  ExternalLink,
  HelpCircle,
  Clock3,
  CheckCircle2,
  ArrowRight,
  Star,
  Globe,
  Headphones
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
      {/* Enhanced Header */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <PlatformLogo className="h-10 w-10" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">BusinessHub</h1>
                  <p className="text-sm text-gray-500">Business Services Platform</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => router.push('/contact')} 
                variant="outline" 
                size="sm"
                className="hidden sm:flex"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Help Center
              </Button>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Status Card - Takes 3 columns */}
            <div className="lg:col-span-3">
              <Card className="shadow-xl border-0 overflow-hidden">
                {/* Status Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white/20 rounded-full">
                        {getStatusIcon()}
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold">Account Status</h1>
                        <p className="text-blue-100 text-lg mt-1">{getStatusMessage()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge()}
                    </div>
                  </div>
                </div>

                <CardContent className="p-8 space-y-8">
                  {/* Profile Information - Enhanced */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <User className="h-5 w-5 mr-3 text-blue-600" />
                      Profile Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Full Name</p>
                        <p className="text-lg font-semibold text-gray-900">{profile.full_name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Role</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-sm">
                            {profile.role === 'provider' ? 'Service Provider' : 
                             profile.role === 'client' ? 'Client' : 
                             profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                          </Badge>
                        </div>
                      </div>
                      {profile.company_name && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Company</p>
                          <p className="text-lg font-semibold text-gray-900 flex items-center">
                            <Building2 className="h-4 w-4 mr-2 text-blue-600" />
                            {profile.company_name}
                          </p>
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Applied Date</p>
                        <p className="text-lg font-semibold text-gray-900 flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                          {new Date(profile.created_at).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                      {profile.verified_at && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Reviewed Date</p>
                          <p className="text-lg font-semibold text-gray-900 flex items-center">
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                            {new Date(profile.verified_at).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Notes - Enhanced */}
                  {profile.admin_notes && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                      <h3 className="text-xl font-semibold text-blue-900 mb-4 flex items-center">
                        <Shield className="h-5 w-5 mr-3" />
                        Admin Review Notes
                      </h3>
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <p className="text-blue-800 leading-relaxed">{profile.admin_notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Next Steps - Enhanced */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <ArrowRight className="h-5 w-5 mr-3 text-blue-600" />
                      What Happens Next?
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getNextSteps().map((step, index) => (
                        <div key={index} className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">{index + 1}</span>
                          </div>
                          <p className="text-gray-700 leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions - Enhanced */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                    <Button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      variant="outline"
                      size="lg"
                      className="flex-1"
                    >
                      <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                      {refreshing ? 'Refreshing Status...' : 'Refresh Status'}
                    </Button>
                    {profile.verification_status === 'rejected' && (
                      <Button
                        onClick={() => router.push('/contact')}
                        size="lg"
                        className="flex-1"
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Contact Support
                      </Button>
                    )}
                    <Button
                      onClick={() => router.push('/contact')}
                      variant="outline"
                      size="lg"
                      className="flex-1"
                    >
                      <HelpCircle className="h-5 w-5 mr-2" />
                      Get Help
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Sidebar - Takes 1 column */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* Contact Information - Enhanced */}
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                    <CardTitle className="text-lg font-semibold flex items-center">
                      <Headphones className="h-5 w-5 mr-2" />
                      Need Help?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                        <Mail className="h-5 w-5 text-blue-600 mt-1" />
                        <div>
                          <p className="font-semibold text-gray-900">Email Support</p>
                          <p className="text-sm text-gray-600">support@businesshub.com</p>
                          <p className="text-xs text-gray-500 mt-1">24/7 response within 2 hours</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                        <Phone className="h-5 w-5 text-green-600 mt-1" />
                        <div>
                          <p className="font-semibold text-gray-900">Phone Support</p>
                          <p className="text-sm text-gray-600">+1 (555) 123-4567</p>
                          <p className="text-xs text-gray-500 mt-1">Mon-Fri 9AM-6PM EST</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                        <MessageCircle className="h-5 w-5 text-purple-600 mt-1" />
                        <div>
                          <p className="font-semibold text-gray-900">Live Chat</p>
                          <p className="text-sm text-gray-600">Available 24/7</p>
                          <p className="text-xs text-gray-500 mt-1">Instant response</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                        <Globe className="h-5 w-5 text-orange-600 mt-1" />
                        <div>
                          <p className="font-semibold text-gray-900">Help Center</p>
                          <p className="text-sm text-gray-600">Self-service portal</p>
                          <p className="text-xs text-gray-500 mt-1">FAQs & guides</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <Button 
                        onClick={() => router.push('/contact')} 
                        className="w-full"
                        size="sm"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Contact Us Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Review Process - Enhanced */}
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
                    <CardTitle className="text-lg font-semibold flex items-center">
                      <Clock3 className="h-5 w-5 mr-2" />
                      Review Process
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Profile Completion</p>
                          <p className="text-xs text-gray-500">✓ Done</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                          <Clock className="h-4 w-4 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Admin Review</p>
                          <p className="text-xs text-gray-500">In Progress</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <Mail className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Approval Notification</p>
                          <p className="text-xs text-gray-500">Pending</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <Star className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Dashboard Access</p>
                          <p className="text-xs text-gray-500">Pending</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium">
                        ⏱️ Review typically takes 1-2 business days
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        You'll receive an email notification once your account is reviewed.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
                    <CardTitle className="text-lg font-semibold">Platform Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">500+</p>
                        <p className="text-sm text-gray-500">Active Users</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">24h</p>
                        <p className="text-sm text-gray-500">Average Review Time</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">99%</p>
                        <p className="text-sm text-gray-500">Approval Rate</p>
                      </div>
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
