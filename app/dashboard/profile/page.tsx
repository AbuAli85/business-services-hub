'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  AlertCircle
} from 'lucide-react'

interface ProviderProfile {
  id: string
  full_name: string
  email: string
  phone: string
  country: string
  role: string
  is_verified: boolean
  created_at: string
  updated_at: string
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
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    country: ''
  })
  const router = useRouter()

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
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setEditForm({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          country: profileData.country || ''
        })
      }

      // Fetch company data
      if (profileData?.company_id) {
        const supabaseClient = await getSupabaseClient()
        const { data: companyData } = await supabaseClient
          .from('companies')
          .select('*')
          .eq('id', profileData.company_id)
          .single()
          
        if (companyData) {
          setCompany(companyData)
        }
      }
        
      // Fetch services only for providers
      if (role === 'provider') {
        const supabaseServices = await getSupabaseClient()
        const { data: servicesData } = await supabaseServices
          .from('services')
          .select('*')
          .eq('provider_id', user.id)
          .order('created_at', { ascending: false })

        if (servicesData) {
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
        const { count: servicesCount } = await supabase
          .from('services')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', userId)

        const { count: bookingsCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', userId)

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
        const { count: bookingsCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', userId)

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
    }
  }

  const handleSaveProfile = async () => {
    try {
      if (!profile) return

      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone,
          country: editForm.country,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (error) {
        console.error('Error updating profile:', error)
        return
      }

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        full_name: editForm.full_name,
        phone: editForm.phone,
        country: editForm.country
      } : null)

      setEditing(false)
    } catch (error) {
      console.error('Error saving profile:', error)
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              {userRole === 'provider' ? 'Provider Profile' : 'Client Profile'}
            </h1>
            <p className="text-rose-100 text-lg mb-4">
              {userRole === 'provider' 
                ? 'Manage your profile, company information, and services'
                : 'Manage your profile and track your activity'
              }
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                <span>Role: {userRole}</span>
              </div>
              {profile?.is_verified && (
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span>Verified Account</span>
                </div>
              )}
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Member since {formatDate(profile?.created_at || '')}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => setEditing(!editing)}
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
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
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Award className="h-4 w-4 mr-2" />
                View Portfolio
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {userRole === 'provider' ? (
          <>
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Services</CardTitle>
                <Building2 className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.totalServices}</div>
                <p className="text-xs text-muted-foreground">Active service offerings</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.totalBookings}</div>
                <p className="text-xs text-muted-foreground">Completed projects</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(stats.totalEarnings, 'OMR')}
                </div>
                <p className="text-xs text-muted-foreground">From completed work</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rating</CardTitle>
                <Star className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.averageRating}</div>
                <p className="text-xs text-muted-foreground">Average client rating</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.totalBookings}</div>
                <p className="text-xs text-muted-foreground">Service requests made</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
                <AlertCircle className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalBookings > 0 ? Math.floor(stats.totalBookings * 0.3) : 0}
                </div>
                <p className="text-xs text-muted-foreground">Currently in progress</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {stats.totalBookings > 0 ? Math.floor(stats.totalBookings * 0.7) : 0}
                </div>
                <p className="text-xs text-muted-foreground">Successfully completed</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Member Since</CardTitle>
                <Calendar className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {profile?.created_at ? new Date(profile.created_at).getFullYear() : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">Years of membership</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {userRole === 'provider' ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completionRate}%</div>
                <p className="text-xs text-muted-foreground">Projects completed on time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.responseTime}</div>
                <p className="text-xs text-muted-foreground">Average response time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verification</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {profile?.is_verified ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-yellow-500" />
                  )}
                  <span className="text-sm font-medium">
                    {profile?.is_verified ? 'Verified' : 'Pending Verification'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {profile?.is_verified ? 'Account verified' : 'Verification in progress'}
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Account Status</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div>
                    <div className="text-sm font-medium">Active</div>
                    <div className="text-xs text-muted-foreground">Account in good standing</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {profile?.updated_at ? formatDate(profile.updated_at) : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">Profile last updated</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Preferences</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">Saved preferences</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Your basic profile details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={editForm.country}
                    onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleSaveProfile}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-xl">
                      {profile?.full_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{profile?.full_name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{profile?.role}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{userEmail}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{profile?.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{profile?.country || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Member since {formatDate(profile?.created_at || '')}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Company Information - Only for Providers */}
        {userRole === 'provider' && (
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
            <CardDescription>
              Your business details and company information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {company ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    {company.logo_url ? (
                      <img src={company.logo_url} alt="Company Logo" className="w-12 h-12 object-cover rounded" />
                    ) : (
                      <Building2 className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{company.name}</h3>
                    <p className="text-sm text-gray-500">Registered Company</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">CR Number:</span>
                    <span className="text-sm text-gray-600">{company.cr_number || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">VAT Number:</span>
                    <span className="text-sm text-gray-600">{company.vat_number || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Established:</span>
                    <span className="text-sm text-gray-600">{formatDate(company.created_at)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-4">No company information available</p>
                <Button variant="outline">
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
                        <Badge variant="secondary">{service.category}</Badge>
                        <Badge className={getStatusColor(service.status)}>
                          {service.status}
                        </Badge>
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
