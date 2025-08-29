'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { getApiUrl } from '@/lib/api-utils'
import { createNonBlockingHandler } from '@/lib/performance'
import { formatDate, formatCurrency } from '@/lib/utils'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import ServiceNavigation from '@/components/service-navigation'

import { 
  Calendar, 
  Clock, 
  MapPin, 
  Star, 
  MessageSquare, 
  Phone, 
  Mail, 
  Globe, 
  Package, 
  CheckCircle, 
  ArrowLeft,
  Eye,
  Heart,
  Share2,
  CalendarDays,
  Clock as ClockIcon,
  MapPin as MapPinIcon,
  FileText,
  Users,
  Award,
  Shield,
  Zap,
  Edit,
  Trash2,
  Settings,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  UserCheck,
  UserX,
  Calendar as CalendarIcon,
  Target,
  Activity
} from 'lucide-react'

interface Service {
  id: string
  title: string
  description: string
  category: string
  status: string
  base_price: number
  currency: string
  cover_image_url: string
  created_at: string
  provider_id: string
  tags?: string[]
  service_packages?: {
    id: string
    name: string
    price: number
    delivery_days: number
    revisions: number
    features: string[]
  }[]
  provider?: {
    id: string
    full_name: string
    avatar_url?: string
    company_name?: string
    rating?: number
    total_reviews?: number
    response_time?: string
    completion_rate?: number
  }
}

interface User {
  id: string
  role: 'client' | 'provider' | 'admin'
  full_name: string
  email: string
}

interface BookingForm {
  package_id: string
  scheduled_date: string
  scheduled_time: string
  location: string
  notes: string
  requirements: string
  budget: number
  urgency: 'low' | 'medium' | 'high'
}

interface ServiceStats {
  totalViews: number
  totalBookings: number
  completedBookings: number
  totalRevenue: number
  averageRating: number
  responseRate: number
}

export default function ServiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const serviceId = params.id as string
  
  const [service, setService] = useState<Service | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBooking, setShowBooking] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    package_id: '',
    scheduled_date: '',
    scheduled_time: '',
    location: '',
    notes: '',
    requirements: '',
    budget: 0,
    urgency: 'medium'
  })
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'reviews' | 'provider' | 'analytics' | 'bookings'>('overview')
  const [serviceStats, setServiceStats] = useState<ServiceStats>({
    totalViews: 0,
    totalBookings: 0,
    completedBookings: 0,
    totalRevenue: 0,
    averageRating: 0,
    responseRate: 0
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = await getSupabaseClient()
        
        // Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.push('/auth/sign-in')
          return
        }

        // Get user profile and role
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('id', authUser.id)
          .single()

        if (profile) {
          setUser({
            id: profile.id,
            role: profile.role || 'client',
            full_name: profile.full_name,
            email: profile.email
          })
        }

        // Fetch service with packages
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select(`
            *,
            service_packages(*)
          `)
          .eq('id', serviceId)
          .single()

        if (serviceError) throw serviceError

        // Fetch provider details
        if (serviceData.provider_id) {
          const { data: providerData } = await supabase
            .from('profiles')
            .select(`
              id,
              full_name,
              avatar_url,
              company_name
            `)
            .eq('id', serviceData.provider_id)
            .single()

          if (providerData) {
            serviceData.provider = {
              ...providerData,
              rating: 4.8, // Mock data - replace with real reviews
              total_reviews: 24,
              response_time: '2 hours',
              completion_rate: 98
            }
          }
        }

        setService(serviceData)

        // If user is the provider, fetch service stats
        if (profile?.role === 'provider' && profile.id === serviceData.provider_id) {
          await fetchServiceStats(serviceId)
        }

      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    if (serviceId) {
      fetchData()
    }
  }, [serviceId, router])

  const fetchServiceStats = async (serviceId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Get bookings for this service
      const { data: bookings } = await supabase
        .from('bookings')
        .select('status, amount, created_at')
        .eq('service_id', serviceId)

      const totalBookings = bookings?.length || 0
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0
      const totalRevenue = bookings
        ?.filter(b => ['completed', 'in_progress'].includes(b.status))
        .reduce((sum, b) => sum + (b.amount || 0), 0) || 0

      setServiceStats({
        totalViews: Math.floor(Math.random() * 1000) + 100, // Mock data
        totalBookings,
        completedBookings,
        totalRevenue,
        averageRating: 4.8, // Mock data
        responseRate: totalBookings > 0 ? ((totalBookings - (bookings?.filter(b => b.status === 'pending').length || 0)) / totalBookings) * 100 : 0
      })
    } catch (error) {
      console.error('Error fetching service stats:', error)
    }
  }

  const handleBookingSubmit = async () => {
    if (!service) return

    try {
      setSubmitting(true)
      
      const scheduledDateTime = new Date(`${bookingForm.scheduled_date}T${bookingForm.scheduled_time}`)
      
      const res = await fetch(getApiUrl('BOOKINGS'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: service.id,
          scheduled_date: scheduledDateTime.toISOString(),
          notes: bookingForm.notes || undefined,
          service_package_id: bookingForm.package_id || undefined,
          location: bookingForm.location || undefined,
          requirements: bookingForm.requirements || undefined,
          budget: bookingForm.budget || undefined,
          urgency: bookingForm.urgency
        })
      })

      const json = await res.json()
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create booking')
      }

      setShowBooking(false)
      setBookingForm({
        package_id: '',
        scheduled_date: '',
        scheduled_time: '',
        location: '',
        notes: '',
        requirements: '',
        budget: 0,
        urgency: 'medium'
      })
      
      alert('Booking request submitted successfully! We will contact you soon.')
    } catch (error) {
      console.error('Booking error:', error)
      alert(error instanceof Error ? error.message : 'Failed to create booking')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteService = async () => {
    if (!service || !user || user.role !== 'provider') return

    if (confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      try {
        const supabase = await getSupabaseClient()
        const { error } = await supabase
          .from('services')
          .delete()
          .eq('id', service.id)

        if (error) throw error

        alert('Service deleted successfully!')
        router.push('/dashboard/services')
      } catch (error) {
        console.error('Error deleting service:', error)
        alert('Failed to delete service')
      }
    }
    setShowDelete(false)
  }

  const isOwner = user && service && user.role === 'provider' && user.id === service.provider_id
  const isClient = user && user.role === 'client'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !service || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Service Not Found</CardTitle>
              <CardDescription>
                {error || 'The service you are looking for could not be found.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Navigation */}
      <ServiceNavigation 
        serviceTitle={service.title}
        providerName={service.provider?.full_name}
        providerId={service.provider_id}
        showProviderInfo={!isOwner}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Service Header */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Service Image */}
              <div className="lg:col-span-1">
                {service.cover_image_url ? (
                  <img 
                    src={service.cover_image_url} 
                    alt={service.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-64 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                    <Package className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Service Info */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                      {service.status}
                    </Badge>
                    <Badge variant="outline">{service.category}</Badge>
                    {isOwner && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Your Service
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{service.title}</h1>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    {service.description}
                  </p>
                </div>

                {/* Provider Info (only show if not owner) */}
                {!isOwner && service.provider && (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={service.provider.avatar_url} />
                      <AvatarFallback>
                        {service.provider.full_name?.charAt(0) || 'P'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {service.provider.full_name}
                      </h3>
                      {service.provider.company_name && (
                        <p className="text-sm text-gray-600">{service.provider.company_name}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium">{service.provider.rating}</span>
                          <span className="text-sm text-gray-500">({service.provider.total_reviews})</span>
                        </div>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-500">{service.provider.response_time} response</span>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-500">{service.provider.completion_rate}% completion</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Service Stats (only show if owner) */}
                {isOwner && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{serviceStats.totalViews}</div>
                      <div className="text-sm text-gray-600">Total Views</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{serviceStats.totalBookings}</div>
                      <div className="text-sm text-gray-600">Total Bookings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{serviceStats.completedBookings}</div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{formatCurrency(serviceStats.totalRevenue, service.currency)}</div>
                      <div className="text-sm text-gray-600">Revenue</div>
                    </div>
                  </div>
                )}

                {/* Price and Actions */}
                <div className="flex items-center justify-between pt-4">
                  <div>
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(service.base_price, service.currency)}
                    </div>
                    <p className="text-sm text-gray-500">Starting price</p>
                  </div>
                  <div className="flex gap-3">
                    {/* Provider Actions */}
                    {isOwner ? (
                      <>
                        <Button variant="outline" size="lg" onClick={() => setShowEdit(true)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Service
                        </Button>
                        <Button variant="outline" size="lg" onClick={() => router.push('/dashboard/services')}>
                          <Settings className="w-4 h-4 mr-2" />
                          Manage
                        </Button>
                        <Button variant="outline" size="lg" onClick={() => router.push('/dashboard/bookings')}>
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          View Bookings
                        </Button>
                      </>
                    ) : (
                      /* Client Actions */
                      <>
                        <Button variant="outline" size="lg">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Contact Provider
                        </Button>
                        <Button size="lg" onClick={() => setShowBooking(true)}>
                          Book This Service
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="border-b">
              <nav className="flex space-x-8 px-6 overflow-x-auto">
                {[
                  { id: 'overview', label: 'Overview', icon: Eye },
                  { id: 'packages', label: 'Packages', icon: Package },
                  { id: 'reviews', label: 'Reviews', icon: Star },
                  ...(isOwner ? [
                    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                    { id: 'bookings', label: 'Bookings', icon: CalendarIcon }
                  ] : [
                    { id: 'provider', label: 'Provider', icon: Users }
                  ])
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600">Category</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-blue-500" />
                          <span className="font-semibold">{service.category}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600">Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                          {service.status}
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600">Created</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-green-500" />
                          <span>{formatDate(service.created_at)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {service.tags && service.tags.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {service.tags.map((tag, index) => (
                          <Badge key={index} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Packages Tab */}
              {activeTab === 'packages' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Service Packages</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Base Package */}
                      <Card className="border-2 border-blue-200">
                        <CardHeader>
                          <CardTitle className="text-blue-600">Base Package</CardTitle>
                          <CardDescription>Essential service delivery</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600 mb-4">
                            {formatCurrency(service.base_price, service.currency)}
                          </div>
                          <ul className="space-y-2 text-sm text-gray-600">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              Basic service delivery
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              Standard quality
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              Email support
                            </li>
                          </ul>
                        </CardContent>
                      </Card>

                      {/* Additional Packages */}
                      {service.service_packages?.map((pkg) => (
                        <Card key={pkg.id} className="border-2 border-purple-200">
                          <CardHeader>
                            <CardTitle className="text-purple-600">{pkg.name}</CardTitle>
                            <CardDescription>Enhanced service with additional features</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-green-600 mb-4">
                              {formatCurrency(pkg.price, service.currency)}
                            </div>
                            <ul className="space-y-2 text-sm text-gray-600">
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                {pkg.delivery_days} days delivery
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                {pkg.revisions} revisions included
                              </li>
                              {pkg.features?.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Reviews Tab */}
              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600">No Reviews Yet</h3>
                    <p className="text-gray-500">Be the first to review this service!</p>
                  </div>
                </div>
              )}

              {/* Provider Tab (only for clients) */}
              {activeTab === 'provider' && !isOwner && service.provider && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Provider Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-6">
                        <Avatar className="w-20 h-20">
                          <AvatarImage src={service.provider.avatar_url} />
                          <AvatarFallback className="text-2xl">
                            {service.provider.full_name?.charAt(0) || 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-4">
                          <div>
                            <h3 className="text-xl font-semibold">{service.provider.full_name}</h3>
                            {service.provider.company_name && (
                              <p className="text-gray-600">{service.provider.company_name}</p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">{service.provider.rating}</div>
                              <div className="text-sm text-gray-500">Rating</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">{service.provider.total_reviews}</div>
                              <div className="text-sm text-gray-500">Reviews</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">{service.provider.response_time}</div>
                              <div className="text-sm text-gray-500">Response Time</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-orange-600">{service.provider.completion_rate}%</div>
                              <div className="text-sm text-gray-500">Completion Rate</div>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <Button variant="outline">
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Send Message
                            </Button>
                            <Button variant="outline">
                              <Phone className="w-4 h-4 mr-2" />
                              Call Provider
                            </Button>
                            <Button variant="outline">
                              <Mail className="w-4 h-4 mr-2" />
                              Send Email
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Analytics Tab (only for owners) */}
              {activeTab === 'analytics' && isOwner && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Overview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Response Rate</span>
                              <span className="text-sm text-gray-600">{serviceStats.responseRate.toFixed(1)}%</span>
                            </div>
                            <Progress value={serviceStats.responseRate} className="h-2" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Completion Rate</span>
                              <span className="text-sm text-gray-600">
                                {serviceStats.totalBookings > 0 ? ((serviceStats.completedBookings / serviceStats.totalBookings) * 100).toFixed(1) : 0}%
                              </span>
                            </div>
                            <Progress 
                              value={serviceStats.totalBookings > 0 ? (serviceStats.completedBookings / serviceStats.totalBookings) * 100 : 0} 
                              className="h-2" 
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Revenue Trends</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600 mb-2">
                            {formatCurrency(serviceStats.totalRevenue, service.currency)}
                          </div>
                          <p className="text-sm text-gray-500">Total Revenue</p>
                          <div className="mt-4 text-sm text-gray-600">
                            <div className="flex items-center justify-between">
                              <span>Total Bookings:</span>
                              <span className="font-medium">{serviceStats.totalBookings}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Completed:</span>
                              <span className="font-medium">{serviceStats.completedBookings}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Average Rating:</span>
                              <span className="font-medium">{serviceStats.averageRating.toFixed(1)}/5</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Bookings Tab (only for owners) */}
              {activeTab === 'bookings' && isOwner && (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600">Manage Bookings</h3>
                    <p className="text-gray-500 mb-4">View and manage all booking requests for this service</p>
                    <Button onClick={() => router.push('/dashboard/bookings')}>
                      View All Bookings
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal (only for clients) */}
      {showBooking && isClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Book {service.title}</h2>
              <button 
                onClick={() => setShowBooking(false)} 
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Package Selection */}
              <div>
                <Label className="text-base font-medium">Select Package</Label>
                <Select
                  value={bookingForm.package_id}
                  onValueChange={(value) => setBookingForm(prev => ({ ...prev, package_id: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose a package" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">
                      Base Package - {formatCurrency(service.base_price, service.currency)}
                    </SelectItem>
                    {service.service_packages?.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} - {formatCurrency(pkg.price, service.currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-base font-medium">Preferred Date</Label>
                  <Input
                    type="date"
                    value={bookingForm.scheduled_date}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                    className="mt-2"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label className="text-base font-medium">Preferred Time</Label>
                  <Input
                    type="time"
                    value={bookingForm.scheduled_time}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, scheduled_time: e.target.value }))}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <Label className="text-base font-medium">Location</Label>
                <Input
                  placeholder="e.g., Muscat, Oman or Zoom meeting"
                  value={bookingForm.location}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, location: e.target.value }))}
                  className="mt-2"
                />
              </div>

              {/* Requirements */}
              <div>
                <Label className="text-base font-medium">Project Requirements</Label>
                <Textarea
                  placeholder="Describe your project requirements in detail..."
                  value={bookingForm.requirements}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, requirements: e.target.value }))}
                  className="mt-2"
                  rows={4}
                />
              </div>

              {/* Additional Notes */}
              <div>
                <Label className="text-base font-medium">Additional Notes</Label>
                <Textarea
                  placeholder="Any additional information or special requests..."
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="mt-2"
                  rows={3}
                />
              </div>

              {/* Budget and Urgency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-base font-medium">Budget (Optional)</Label>
                  <Input
                    type="number"
                    placeholder="Your budget range"
                    value={bookingForm.budget || ''}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, budget: Number(e.target.value) || 0 }))}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-base font-medium">Urgency Level</Label>
                  <Select
                    value={bookingForm.urgency}
                    onValueChange={(value: 'low' | 'medium' | 'high') => 
                      setBookingForm(prev => ({ ...prev, urgency: value }))
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Flexible timeline</SelectItem>
                      <SelectItem value="medium">Medium - Standard timeline</SelectItem>
                      <SelectItem value="high">High - Urgent delivery needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowBooking(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleBookingSubmit}
                  disabled={submitting || !bookingForm.scheduled_date || !bookingForm.scheduled_time}
                  className="min-w-[120px]"
                >
                  {submitting ? 'Submitting...' : 'Submit Booking'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="text-center">
              <Trash2 className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Delete Service</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{service.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setShowDelete(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteService}>
                  Delete Service
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
