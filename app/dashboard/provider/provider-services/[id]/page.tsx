'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, Edit, Eye, Calendar, DollarSign, 
  User, MapPin, Clock, Building2, Star, TrendingUp, MessageCircle
} from 'lucide-react'
import { Label } from '@/components/ui/label'

interface Service {
  id: string
  title: string
  description: string
  category: string
  status: string
  base_price: number
  currency: string
  cover_image_url?: string
  created_at: string
  updated_at?: string
  provider_id: string
  views_count?: number
  bookings_count?: number
  rating?: number
  tags?: string[]
}

export default function ProviderServiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const serviceId = params.id as string
  
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [isServiceOwner, setIsServiceOwner] = useState(false)

  useEffect(() => {
    if (serviceId && serviceId !== 'undefined') {
      checkUserAndFetchService()
    } else {
      setError('Invalid service ID')
      setLoading(false)
    }
  }, [serviceId])

  const checkUserAndFetchService = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      setUser(user)
      
      // Fetch the service
      await fetchService(serviceId, user.id)
      
    } catch (error) {
      console.error('Error checking user:', error)
      setError('Authentication error')
    } finally {
      setLoading(false)
    }
  }

  const fetchService = async (id: string, userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single()

      if (serviceError) {
        console.error('Error fetching service:', serviceError)
        setError('Service not found')
        return
      }

      if (service.provider_id !== userId) {
        setError('You do not have permission to view this service')
        return
      }

      setService(service)
      setIsServiceOwner(true)
      
    } catch (error) {
      console.error('Error fetching service:', error)
      setError('Failed to fetch service')
    }
  }

  const handleEditService = () => {
    router.push(`/dashboard/provider/provider-services/${serviceId}/edit`)
  }

  const handleBackToServices = () => {
    router.push('/dashboard/provider/provider-services')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">Loading service details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="h-12 w-12 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Error</h3>
              <p className="text-gray-600 mb-6 text-lg">{error}</p>
              <Button onClick={handleBackToServices} variant="outline" size="lg">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Services
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="h-12 w-12 text-gray-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Service Not Found</h3>
              <p className="text-gray-600 mb-6 text-lg">The service you're looking for doesn't exist.</p>
              <Button onClick={handleBackToServices} variant="outline" size="lg">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Services
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            onClick={handleBackToServices} 
            variant="outline" 
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Services
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{service.title}</h1>
              <p className="text-gray-600 text-lg">{service.description}</p>
            </div>
            <Button onClick={handleEditService} className="bg-blue-600 hover:bg-blue-700">
              <Edit className="mr-2 h-4 w-4" />
              Edit Service
            </Button>
          </div>
        </div>

        {/* Service Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Service Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Category</Label>
                  <Badge variant="secondary" className="mt-1">
                    {service.category}
                  </Badge>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <Badge className="mt-1">
                    {service.status}
                  </Badge>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">Description</Label>
                  <p className="mt-1 text-gray-600">{service.description}</p>
                </div>
                
                {service.tags && service.tags.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {service.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {service.base_price} {service.currency}
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Views</span>
                  <span className="font-semibold">{service.views_count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Bookings</span>
                  <span className="font-semibold">{service.bookings_count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Rating</span>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{service.rating ? service.rating.toFixed(1) : 'N/A'}</span>
                    {service.rating && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Created</span>
                  <span className="font-semibold">
                    {new Date(service.created_at).toLocaleDateString()}
                  </span>
                </div>
                {service.updated_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Updated</span>
                    <span className="font-semibold">
                      {new Date(service.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
