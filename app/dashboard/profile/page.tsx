'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseClient } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Edit, 
  Save, 
  X, 
  Plus,
  Star,
  Calendar,
  DollarSign,
  TrendingUp,
  Award,
  Shield,
  CheckCircle,
  AlertCircle,
  Crown,
  Sparkles,
  Target,
  Zap,
  Trophy,
  Gem,

  Lock,
  Unlock,
  Eye,
  Settings,
  Bell,
  Heart
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ProviderProfile {
  id: string
  full_name: string
  email?: string
  phone: string
  country: string
  role: string
  is_verified: boolean
  created_at: string
  updated_at: string
  avatar_url?: string
  bio?: string
}

interface Company {
  id: string
  name: string
  cr_number: string
  vat_number: string
  logo_url: string
  created_at: string
}

interface Service {
  id: string
  title: string
  description: string
  category: string
  base_price: number
  currency: string
  status: string
  cover_image_url: string
  created_at: string
}

interface ProfileStats {
  totalServices: number
  totalBookings: number
  totalEarnings: number
  averageRating: number
  completionRate: number
  responseTime: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [userRole, setUserRole] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [stats, setStats] = useState<ProfileStats>({
    totalServices: 0,
    totalBookings: 0,
    totalEarnings: 0,
    averageRating: 0,
    completionRate: 0,
    responseTime: '0h'
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    country: ''
  })
  const router = useRouter()
  const [profileCompletion, setProfileCompletion] = useState<number>(0)

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      setError('')
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      setUserEmail(user.email ?? '')

      // Get user role from metadata
      const role = user.user_metadata?.role || 'client'
      setUserRole(role)

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError)
        setError('Failed to load profile data. Please try again.')
        return
      }

      if (profileData) {
        setProfile(profileData)
        setEditForm({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          country: profileData.country || ''
        })
        // compute completion percentage (non-blocking)
        const requiredFields = [profileData.full_name, profileData.phone, profileData.country]
        const optionalFields = [profileData.avatar_url, profileData.bio]
        const requiredFilled = requiredFields.filter(Boolean).length
        const optionalFilled = optionalFields.filter(Boolean).length
        const completion = Math.round(((requiredFilled / requiredFields.length) * 0.7 + (optionalFilled / optionalFields.length) * 0.3) * 100)
        setProfileCompletion(Math.min(completion, 100)) // Ensure it doesn't exceed 100%
      } else {
        // Handle case where no profile exists - create a basic one
        console.log('No profile found, creating basic profile data')
        const basicProfile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email,
          phone: '',
          country: '',
          role: role,
          is_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        setProfile(basicProfile)
        setEditForm({
          full_name: basicProfile.full_name,
          phone: '',
          country: ''
        })
        setProfileCompletion(33) // Basic completion with just name
      }

      // Fetch company data
      if (profileData?.company_id) {
        const supabaseClient = await getSupabaseClient()
        const { data: companyData, error: companyError } = await supabaseClient
          .from('companies')
          .select('*')
          .eq('id', profileData.company_id)
          .single()
          
        if (companyError && companyError.code !== 'PGRST116') {
          console.error('Error fetching company data:', companyError)
        } else if (companyData) {
          setCompany(companyData)
        }
      }
        
      // Fetch services only for providers
      if (role === 'provider') {
        const supabaseServices = await getSupabaseClient()
        const { data: servicesData, error: servicesError } = await supabaseServices
          .from('services')
          .select('*')
          .eq('provider_id', user.id)
          .order('created_at', { ascending: false })

        if (servicesError) {
          console.error('Error fetching services:', servicesError)
        } else if (servicesData) {
          setServices(servicesData)
        }
      }

      // Calculate stats based on role
      await calculateStats(user.id, role)

    } catch (error) {
      console.error('Error fetching profile data:', error)
      setError('Failed to load your profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = async (userId: string, role: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      if (role === 'provider') {
        // Provider stats
        const { count: servicesCount, error: servicesError } = await supabase
          .from('services')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', userId)

        const { count: bookingsCount, error: bookingsError } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', userId)

        if (servicesError) console.error('Error fetching services count:', servicesError)
        if (bookingsError) console.error('Error fetching bookings count:', bookingsError)

        setStats({
          totalServices: servicesCount || 0,
          totalBookings: bookingsCount || 0,
          totalEarnings: (bookingsCount || 0) * 150, // Mock earnings
          averageRating: 4.8,
          completionRate: 95,
          responseTime: '2h'
        })
      } else {
        // Client stats
        const { count: bookingsCount, error: bookingsError } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', userId)

        if (bookingsError) console.error('Error fetching client bookings count:', bookingsError)

        setStats({
          totalServices: 0, // Clients don't have services
          totalBookings: bookingsCount || 0,
          totalEarnings: 0, // Clients don't earn
          averageRating: 0, // Clients don't have ratings
          completionRate: 0, // Not applicable for clients
          responseTime: '0h' // Not applicable for clients
        })
      }
    } catch (error) {
      console.error('Error calculating stats:', error)
      // Set default stats on error
      setStats({
        totalServices: 0,
        totalBookings: 0,
        totalEarnings: 0,
        averageRating: 0,
        completionRate: 0,
        responseTime: '0h'
      })
    }
  }

  const handleSaveProfile = async () => {
    try {
      if (!profile) return

      const supabase = await getSupabaseClient()
      
      // Try to update first, if that fails, try to insert
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone,
          country: editForm.country,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (updateError) {
        // If update fails, try to insert a new profile
        console.log('Update failed, trying to create new profile:', updateError)
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: profile.id,
            full_name: editForm.full_name,
            phone: editForm.phone,
            country: editForm.country,
            role: userRole,
            is_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          console.error('Error creating profile:', insertError)
          setError('Failed to save profile. Please try again.')
          return
        }
      }

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        full_name: editForm.full_name,
        phone: editForm.phone,
        country: editForm.country
      } : null)

      // Recalculate completion
      const requiredFields = [editForm.full_name, editForm.phone, editForm.country]
      const optionalFields = [profile.avatar_url, profile.bio]
      const requiredFilled = requiredFields.filter(Boolean).length
      const optionalFilled = optionalFields.filter(Boolean).length
      const completion = Math.round(((requiredFilled / requiredFields.length) * 0.7 + (optionalFilled / optionalFields.length) * 0.3) * 100)
      setProfileCompletion(Math.min(completion, 100))

      setSuccess('Profile updated successfully!')
      setEditing(false)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error saving profile:', error)
      setError('Failed to save profile. Please try again.')
    }
  }

  const handleCancelEdit = () => {
    setEditForm({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      country: profile?.country || ''
    })
    setEditing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'in_progress':
        return 'bg-purple-100 text-purple-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'on_hold':
        return 'bg-gray-100 text-gray-800'
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">{error}</p>
          <Button onClick={fetchProfileData} variant="outline">Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl p-8 text-white shadow-2xl">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-start gap-6">
            {/* Premium Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-3xl font-bold shadow-xl">
                {(profile?.full_name || userEmail || 'U').charAt(0).toUpperCase()}
              </div>
              {profile?.is_verified && (
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                  <Crown className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  {userRole === 'provider' ? 'Provider Profile' : 'Client Profile'}
                </h1>
                {profile?.is_verified && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 rounded-full border border-yellow-400/30">
                    <Sparkles className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-200">Verified</span>
                  </div>
                )}
              </div>
              
              <p className="text-purple-100 text-xl font-medium">
                {userRole === 'provider' 
                  ? 'Professional service provider dashboard'
                  : 'Premium client experience center'
                }
              </p>
              
              <div className="flex items-center space-x-8 text-sm">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm">
                  <User className="h-4 w-4" />
                  <span className="capitalize font-medium">{userRole}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm">
                  <Calendar className="h-4 w-4" />
                  <span>Member since {formatDate(profile?.created_at || '')}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm">
                  <Target className="h-4 w-4" />
                  <span>{profileCompletion}% Complete</span>
                  {profileCompletion >= 90 && <Sparkles className="h-3 w-3 text-yellow-300" />}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => setEditing(!editing)}
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-105"
            >
              {editing ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </>
              )}
            </Button>
            
            {userRole === 'provider' && (
              <Button 
                variant="secondary"
                className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/30 text-white hover:from-purple-500/30 hover:to-pink-500/30 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-105"
              >
                <Award className="h-4 w-4 mr-2" />
                View Portfolio
              </Button>
            )}
            
            {userRole === 'client' && (
              <Button 
                variant="secondary" 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-105" 
                onClick={() => router.push('/dashboard/settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-green-800 font-medium">{success}</p>
        </div>
      )}

      {/* Premium Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {userRole === 'provider' ? (
          <>
            <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/10"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-blue-700">Total Services</CardTitle>
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-blue-600 mb-1">{stats.totalServices}</div>
                <p className="text-xs text-blue-600/70 font-medium">Active service offerings</p>
                <div className="mt-3 w-full bg-blue-200 rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full" style={{width: `${Math.min((stats.totalServices / 10) * 100, 100)}%`}}></div>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/10"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-green-700">Total Bookings</CardTitle>
                <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-green-600 mb-1">{stats.totalBookings}</div>
                <p className="text-xs text-green-600/70 font-medium">Completed projects</p>
                <div className="mt-3 w-full bg-green-200 rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 h-1.5 rounded-full" style={{width: `${Math.min((stats.totalBookings / 50) * 100, 100)}%`}}></div>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/10"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-purple-700">Total Earnings</CardTitle>
                <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {formatCurrency(stats.totalEarnings, 'OMR')}
                </div>
                <p className="text-xs text-purple-600/70 font-medium">From completed work</p>
                <div className="mt-3 w-full bg-purple-200 rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-1.5 rounded-full" style={{width: `${Math.min((stats.totalEarnings / 10000) * 100, 100)}%`}}></div>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/10"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-orange-700">Rating</CardTitle>
                <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                  <Star className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-orange-600 mb-1">{stats.averageRating}</div>
                <p className="text-xs text-orange-600/70 font-medium">Average client rating</p>
                <div className="mt-3 flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={`h-3 w-3 ${star <= stats.averageRating ? 'text-orange-500 fill-current' : 'text-orange-200'}`} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/10"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-green-700">Total Bookings</CardTitle>
                <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-green-600 mb-1">{stats.totalBookings}</div>
                <p className="text-xs text-green-600/70 font-medium">Service requests made</p>
                <div className="mt-3 w-full bg-green-200 rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-1.5 rounded-full transition-all duration-700 ease-out" 
                    style={{width: `${Math.min((stats.totalBookings / 20) * 100, 100)}%`}}
                  ></div>
                </div>
                {stats.totalBookings > 0 && (
                  <div className="mt-2 flex items-center space-x-1">
                    <Trophy className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600/70 font-medium">Active Client</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/10"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-blue-700">Active Requests</CardTitle>
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <Zap className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {stats.totalBookings > 0 ? Math.floor(stats.totalBookings * 0.3) : 0}
                </div>
                <p className="text-xs text-blue-600/70 font-medium">Currently in progress</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 bg-white/50 border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={() => router.push('/dashboard/bookings')}
                >
                  View All Bookings
                </Button>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-emerald-700">Completed</CardTitle>
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-emerald-600 mb-1">
                  {stats.totalBookings > 0 ? Math.floor(stats.totalBookings * 0.7) : 0}
                </div>
                <p className="text-xs text-emerald-600/70 font-medium">Successfully completed</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 bg-white/50 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => router.push('/dashboard/bookings')}
                >
                  View All Bookings
                </Button>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/10"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-purple-700">Member Since</CardTitle>
                <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                  <Gem className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {profile?.created_at ? new Date(profile.created_at).getFullYear() : 'N/A'}
                </div>
                <p className="text-xs text-purple-600/70 font-medium">Years of membership</p>
                <div className="mt-3 flex items-center space-x-1">
                  <Heart className="h-3 w-3 text-purple-500" />
                  <span className="text-xs text-purple-600/70 font-medium">Loyal Member</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Premium Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {userRole === 'provider' ? (
          <>
            <Card className="group relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-slate-600/10"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Completion Rate</CardTitle>
                <div className="p-2 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl shadow-lg">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-slate-600 mb-1">{stats.completionRate}%</div>
                <p className="text-xs text-slate-600/70 font-medium">Projects completed on time</p>
                <div className="mt-3 w-full bg-slate-200 rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-slate-500 to-slate-600 h-1.5 rounded-full" style={{width: `${stats.completionRate}%`}}></div>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-gradient-to-br from-indigo-50 to-indigo-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-indigo-600/10"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-indigo-700">Response Time</CardTitle>
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-indigo-600 mb-1">{stats.responseTime}</div>
                <p className="text-xs text-indigo-600/70 font-medium">Average response time</p>
                <div className="mt-3 flex items-center space-x-1">
                  <Zap className="h-3 w-3 text-indigo-500" />
                  <span className="text-xs text-indigo-600/70 font-medium">Fast Response</span>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-emerald-700">Verification</CardTitle>
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                  <Shield className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex items-center space-x-3 mb-2">
                  {profile?.is_verified ? (
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                  ) : (
                    <div className="p-2 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-emerald-700">
                      {profile?.is_verified ? 'Verified' : 'Pending Verification'}
                    </div>
                    <div className="text-xs text-emerald-600/70">
                      {profile?.is_verified ? 'Account verified' : 'Verification in progress'}
                    </div>
                  </div>
                </div>
                {profile?.is_verified && (
                  <div className="flex items-center space-x-1">
                    <div className="h-3 w-3 bg-emerald-500 rounded-full" />
                    <span className="text-xs text-emerald-600/70 font-medium">Trusted Provider</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-emerald-700">Account Status</CardTitle>
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                  <Shield className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-emerald-700">Active</div>
                    <div className="text-xs text-emerald-600/70">Account in good standing</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center space-x-1">
                  <Lock className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600/70 font-medium">Secure Account</span>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-amber-600/10"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-amber-700">Profile Completion</CardTitle>
                <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg">
                  <Target className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-amber-600 mb-1">{profileCompletion}%</div>
                <p className="text-xs text-amber-600/70 font-medium">
                  {profileCompletion < 70 ? 'Complete your profile for better matches' : profileCompletion < 90 ? 'Almost perfect!' : 'Profile looks great!'}
                </p>
                <div className="mt-3 w-full bg-amber-200 rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-amber-600 h-1.5 rounded-full transition-all duration-500 ease-out" 
                    style={{width: `${profileCompletion}%`}}
                  ></div>
                </div>
                {profileCompletion < 70 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 bg-white/50 border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={() => setEditing(true)}
                  >
                    Complete Profile
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-gradient-to-br from-rose-50 to-rose-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-rose-600/10"></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-rose-700">Preferences</CardTitle>
                <div className="p-2 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl shadow-lg">
                  <Heart className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-rose-600 mb-1">3</div>
                <p className="text-xs text-rose-600/70 font-medium">Saved preferences</p>
                <div className="mt-3 flex items-center space-x-1">
                  <Bell className="h-3 w-3 text-rose-500" />
                  <span className="text-xs text-rose-600/70 font-medium">Personalized</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>



      {/* Premium Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card className="group relative overflow-hidden bg-gradient-to-br from-white to-slate-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              Personal Information
            </CardTitle>
            <CardDescription className="text-base">
              Your basic profile details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-6">
            {editing ? (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-sm font-semibold">Full Name</Label>
                    <Input
                      id="full_name"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                      className="border-2 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-semibold">Phone Number</Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="border-2 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-sm font-semibold">Country</Label>
                    <Input
                      id="country"
                      value={editForm.country}
                      onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                      className="border-2 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Button onClick={handleSaveProfile} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit} className="border-2 hover:bg-gray-50">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-2xl">
                        {profile?.full_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {profile?.is_verified && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                        <Crown className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{profile?.full_name}</h3>
                    <p className="text-sm text-gray-600 capitalize font-medium">{profile?.role}</p>
                    {profile?.is_verified && (
                      <div className="flex items-center gap-1 mt-1">
                        <Sparkles className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs text-yellow-600 font-medium">Verified Account</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-3 bg-white rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{userEmail}</p>
                      <p className="text-xs text-gray-500">Email Address</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-3 bg-white rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Phone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{profile?.phone || 'Not provided'}</p>
                      <p className="text-xs text-gray-500">Phone Number</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-3 bg-white rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <MapPin className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{profile?.country || 'Not specified'}</p>
                      <p className="text-xs text-gray-500">Location</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-3 bg-white rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Member since {formatDate(profile?.created_at || '')}</p>
                      <p className="text-xs text-gray-500">Join Date</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Company Information - Only for Providers */}
        {userRole === 'provider' && (
          <Card className="group relative overflow-hidden bg-gradient-to-br from-white to-slate-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-3 text-xl font-bold">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                Company Information
              </CardTitle>
              <CardDescription className="text-base">
                Your business details and company information
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              {company ? (
                <div className="space-y-6">
                  <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                      {company?.logo_url ? (
                        <img src={company.logo_url} alt="Company Logo" className="w-12 h-12 object-cover rounded-xl" />
                      ) : (
                        <Building2 className="h-10 w-10 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{company?.name}</h3>
                      <p className="text-sm text-gray-600 font-medium">Registered Company</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="h-3 w-3 bg-purple-500 rounded-full" />
                        <span className="text-xs text-purple-600 font-medium">Verified Business</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-purple-200 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">CR Number</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{company?.cr_number || 'Not provided'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-purple-200 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <DollarSign className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">VAT Number</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{company?.vat_number || 'Not provided'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-purple-200 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <Calendar className="h-4 w-4 text-orange-600" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">Established</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{formatDate(company?.created_at || '')}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Building2 className="h-12 w-12 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Company Information</h3>
                  <p className="text-gray-500 mb-6">Add your company details to build trust with clients</p>
                  <Button className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Company
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Services Overview - Only for Providers */}
      {userRole === 'provider' && (
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Your Services
          </CardTitle>
          <CardDescription>
            Overview of all your service offerings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No services yet</p>
              <p className="text-sm mb-4">Start by creating your first service offering</p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Service
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      {service.cover_image_url ? (
                        <img src={service.cover_image_url} alt={service.title} className="w-8 h-8 object-cover rounded" />
                      ) : (
                        <Building2 className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{service.title}</h4>
                      <p className="text-sm text-gray-500 line-clamp-2">{service.description}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{service.category}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(service.status)}`}>
                          {service.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(service.base_price, service.currency)}
                    </div>
                    <p className="text-xs text-gray-400">
                      Created {formatDate(service.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  )
}
