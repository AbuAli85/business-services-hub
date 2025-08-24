'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, User, Building2, Star, Calendar, MessageCircle, 
  MapPin, Phone, Mail, Globe, Award, Clock, TrendingUp
} from 'lucide-react'

interface ProviderProfile {
  id: string
  full_name: string
  email: string
  phone?: string
  bio?: string
  avatar_url?: string
  company_id?: string
  company_name?: string
  location?: string
  website?: string
  verified: boolean
  rating?: number
  total_services: number
  total_bookings: number
  member_since: string
}

interface ProviderService {
  id: string
  title: string
  description: string
  category: string
  status: string
  base_price: number
  currency: string
  cover_image_url?: string
  created_at: string
  views_count?: number
  bookings_count?: number
  rating?: number
}

export default function ProviderProfilePage() {
  const params = useParams()
  const router = useRouter()
  const providerId = params.id as string
  
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [services, setServices] = useState<ProviderService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    if (providerId && providerId !== 'undefined') {
      checkUserAndFetchProfile()
    } else {
      setError('Invalid provider ID')
      setLoading(false)
    }
  }, [providerId])

  const checkUserAndFetchProfile = async () => {
    try {
      console.log('🔍 Checking user authentication...')
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('❌ No authenticated user')
        router.push('/auth/sign-in')
        return
      }

      console.log('✅ User authenticated:', user.id)
      setUser(user)
      
      // Fetch provider profile and services
      await fetchProviderProfile(providerId)
      
    } catch (error) {
      console.error('❌ Error checking user:', error)
      setError('Authentication error')
    } finally {
      setLoading(false)
    }
  }

  const fetchProviderProfile = async (id: string) => {
    try {
      console.log('📡 Fetching provider profile...', { id })
      const supabase = await getSupabaseClient()
      
      // Fetch provider profile information
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (profileError) {
        console.error('❌ Error fetching profile:', profileError)
        throw profileError
      }

      if (!profile) {
        throw new Error('Provider profile not found')
      }

      // Fetch company information if available
      let companyName = 'Independent Professional'
      if (profile.company_id) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('name')
          .eq('id', profile.company_id)
          .maybeSingle()

        if (!companyError && company?.name) {
          companyName = company.name
        }
      }

      // Fetch provider services
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (servicesError) {
        console.error('❌ Error fetching services:', servicesError)
        throw servicesError
      }

      // Calculate statistics
      const totalServices = services?.length || 0
      const totalBookings = services?.reduce((sum, service) => sum + (service.bookings_count || 0), 0) || 0
      const avgRating = services?.length > 0 
        ? services.reduce((sum, service) => sum + (service.rating || 0), 0) / services.length
        : 0

      // Transform profile data
      const transformedProfile: ProviderProfile = {
        id: profile.id,
        full_name: profile.full_name || 'Unknown Provider',
        email: profile.email || '',
        phone: profile.phone,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        company_id: profile.company_id,
        company_name: companyName,
        location: profile.location,
        website: profile.website,
        verified: profile.verified || false,
        rating: avgRating,
        total_services: totalServices,
        total_bookings: totalBookings,
        member_since: profile.created_at
      }

      console.log('✅ Provider profile fetched successfully:', transformedProfile)
      setProfile(transformedProfile)
      setServices(services || [])

    } catch (err) {
      console.error('❌ Error fetching provider profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch provider profile')
    }
  }

  const handleContactProvider = () => {
    if (!profile) return
    
    // Store message data and redirect to messages page
    const message = `Hi ${profile.full_name}, I'm interested in your services. Could you please provide more details?`
    
    localStorage.setItem('pendingMessage', JSON.stringify({
      recipientId: profile.id,
      recipientName: profile.full_name,
      subject: `Inquiry about services`,
      message: message
    }))
    
    router.push('/dashboard/messages')
  }

  const handleBookService = (service: ProviderService) => {
    // Redirect to service detail page for booking
    router.push(`/dashboard/services/${service.id}`)
  }

  const getCategoryColor = (category: string) => {
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">Loading provider profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Provider Not Found</CardTitle>
              <CardDescription>
                {error || 'The provider profile you are looking for could not be found.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard/services')}>
                  Browse Services
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {profile.full_name}
              </h1>
              <p className="text-gray-600 text-lg">
                Professional Service Provider
              </p>
            </div>

            <div className="flex gap-2">
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleContactProvider}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact Provider
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Provider Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  About the Provider
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Header */}
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                    {profile.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.full_name}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-blue-600" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {profile.full_name}
                      </h2>
                      {profile.verified && (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <Award className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    
                    {profile.company_name && (
                      <p className="text-gray-600 mb-2">
                        <Building2 className="w-4 h-4 inline mr-2" />
                        {profile.company_name}
                      </p>
                    )}
                    
                    {profile.location && (
                      <p className="text-gray-600 mb-2">
                        <MapPin className="w-4 h-4 inline mr-2" />
                        {profile.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {profile.bio}
                    </p>
                  </div>
                )}

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span>{profile.email}</span>
                    </div>
                  )}
                  
                  {profile.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                  
                  {profile.website && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Globe className="h-4 w-4" />
                      <a 
                        href={profile.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {profile.website}
                      </a>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>Member since {new Date(profile.member_since).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Services */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Services Offered ({profile.total_services})
                </CardTitle>
                <CardDescription>
                  Browse and book services from this provider
                </CardDescription>
              </CardHeader>
              <CardContent>
                {services.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {services.map((service) => (
                      <Card key={service.id} className="border border-gray-200 hover:border-blue-300 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-semibold text-gray-900 line-clamp-2">
                              {service.title}
                            </h3>
                            <Badge className={getCategoryColor(service.category)}>
                              {service.category}
                            </Badge>
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {service.description}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="text-lg font-bold text-green-600">
                              {service.base_price} {service.currency}
                            </div>
                            
                            <Button 
                              size="sm" 
                              onClick={() => handleBookService(service)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              Book Now
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No services available at the moment</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Provider Stats */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Provider Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900">
                      {profile.total_services}
                    </div>
                    <div className="text-sm text-blue-600">Services</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-900">
                      {profile.total_bookings}
                    </div>
                    <div className="text-sm text-green-600">Total Bookings</div>
                  </div>
                </div>
                
                {profile.rating && profile.rating > 0 && (
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`h-4 w-4 ${star <= profile.rating! ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                    <div className="text-lg font-bold text-yellow-900">
                      {profile.rating.toFixed(1)} / 5.0
                    </div>
                    <div className="text-sm text-yellow-600">Average Rating</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700" 
                  onClick={handleContactProvider}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Provider
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push('/dashboard/services')}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Browse All Services
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
