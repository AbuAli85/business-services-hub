'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { getApiUrl, crossDomainFetch } from '@/lib/api-config'
import { createNonBlockingHandler } from '@/lib/performance'
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'react-hot-toast'

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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
  XCircle,
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
  approval_status: string
  base_price: number
  currency: string
  cover_image_url: string
  created_at: string
  provider_id: string
  is_featured?: boolean
  tags?: string[]
  service_packages?: {
    id: string
    name: string
    description: string
    price: number
    delivery_days: number
    revisions: number
    features: string[]
    is_popular?: boolean
    is_premium?: boolean
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
  avatar_url?: string
}

interface ServiceStats {
  totalViews: number
  totalBookings: number
  completedBookings: number
  totalRevenue: number
  averageRating: number
  responseRate: number
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
  const [showContactModal, setShowContactModal] = useState(false)
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    package_id: 'base',
    scheduled_date: '',
    scheduled_time: '',
    location: '',
    notes: '',
    requirements: '',
    budget: 0,
    urgency: 'medium'
  })
  const [submitting, setSubmitting] = useState(false)
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    contactMethod: 'message',
    urgency: 'normal'
  })
  const [isContactSending, setIsContactSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'reviews' | 'provider' | 'analytics' | 'bookings' | 'settings' | 'admin'>('overview')
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
        
        // Get current user with better error handling
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.error('Auth error:', authError)
          setError('Authentication error. Please try signing in again.')
          setLoading(false)
          return
        }

        if (!authUser) {
          // Don't redirect immediately, just set loading to false
          setLoading(false)
          setError('Please sign in to view this service')
          return
        }

        // Get user profile and role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('id', authUser.id)
          .maybeSingle() // Use maybeSingle instead of single to handle no rows

        if (profileError) {
          console.error('Profile error:', profileError)
          setError('Failed to load user profile')
          setLoading(false)
          return
        }

        if (profile) {
          setUser({
            id: profile.id,
            role: profile.role || 'client',
            full_name: profile.full_name,
            email: profile.email
          })
        } else {
          // Profile doesn't exist, create a basic user object
          setUser({
            id: authUser.id,
            role: 'client',
            full_name: authUser.user_metadata?.full_name || 'User',
            email: authUser.email || ''
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
          .maybeSingle() // Use maybeSingle instead of single to handle no rows

        if (serviceError) {
          console.error('Service error:', serviceError)
          setError('Service not found or access denied')
          setLoading(false)
          return
        }

        if (!serviceData) {
          setError('Service not found')
          setLoading(false)
          return
        }

        // Fetch provider details
        if (serviceData.provider_id) {
          const { data: providerData, error: providerError } = await supabase
            .from('profiles')
            .select(`
              id,
              full_name,
              avatar_url,
              company_name
            `)
            .eq('id', serviceData.provider_id)
            .maybeSingle() // Use maybeSingle instead of single to handle no rows

          if (providerData && !providerError) {
            serviceData.provider = {
              ...providerData,
              rating: 4.8, // Mock data - replace with real reviews
              total_reviews: 24,
              response_time: '2 hours',
              completion_rate: 98
            }
          } else {
            // Provider profile doesn't exist, create a fallback
            serviceData.provider = {
              id: serviceData.provider_id,
              full_name: 'Unknown Provider',
              avatar_url: null,
              company_name: 'Unknown Company',
              rating: 0,
              total_reviews: 0,
              response_time: 'Unknown',
              completion_rate: 0
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
  }, [serviceId])

  // Add session listener to handle auth state changes
  useEffect(() => {
    let mounted = true

    const setupSessionListener = async () => {
      try {
        const supabase = await getSupabaseClient()
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return

            if (event === 'SIGNED_IN' && session?.user) {
              // User signed in, refresh data
              setError(null)
              setLoading(true)
              
              try {
                // Get user profile
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('id, full_name, email, role')
                  .eq('id', session.user.id)
                  .maybeSingle() // Use maybeSingle instead of single to handle no rows

                if (profile) {
                  setUser({
                    id: profile.id,
                    role: profile.role || 'client',
                    full_name: profile.full_name,
                    email: profile.email
                  })
                } else {
                  // Profile doesn't exist, create a basic user object
                  setUser({
                    id: session.user.id,
                    role: 'client',
                    full_name: session.user.user_metadata?.full_name || 'User',
                    email: session.user.email || ''
                  })
                }

                // Re-fetch service data
                if (serviceId) {
                  const { data: serviceData } = await supabase
                    .from('services')
                    .select(`
                      *,
                      service_packages(*)
                    `)
                    .eq('id', serviceId)
                    .maybeSingle() // Use maybeSingle instead of single to handle no rows

                  if (serviceData) {
                    setService(serviceData)
                    
                    // If user is the provider, fetch service stats
                    if (profile?.role === 'provider' && profile.id === serviceData.provider_id) {
                      await fetchServiceStats(serviceId)
                    }
                  }
                }
              } catch (error) {
                console.error('Error refreshing data after sign in:', error)
              } finally {
                setLoading(false)
              }
            } else if (event === 'SIGNED_OUT') {
              // User signed out, clear data
              setUser(null)
              setService(null)
              setError('Please sign in to view this service')
              setLoading(false)
            }
          }
        )

        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('Error setting up session listener:', error)
      }
    }

    setupSessionListener()

    return () => {
      mounted = false
    }
  }, [serviceId])

  const fetchServiceStats = async (serviceId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Get bookings for this service
      const { data: bookings } = await supabase
        .from('bookings')
        .select('status, subtotal, created_at')
        .eq('service_id', serviceId)

      const totalBookings = bookings?.length || 0
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0
      const totalRevenue = bookings
        ?.filter(b => ['completed', 'in_progress'].includes(b.status))
        .reduce((sum, b) => {
          const subtotal = b.subtotal || 0
          const vatAmount = subtotal * 0.05 // Default 5% VAT
          return sum + subtotal + vatAmount
        }, 0) || 0

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

      // Enhanced validation
      if (!bookingForm.scheduled_date || !bookingForm.scheduled_time) {
        toast.error('Please select a date and time for your booking')
        return
      }

      if (!bookingForm.requirements?.trim()) {
        toast.error('Please describe your requirements for this service')
        return
      }

      // Validate date is not in the past
      const scheduledDateTime = new Date(`${bookingForm.scheduled_date}T${bookingForm.scheduled_time}`)
      const now = new Date()
      if (scheduledDateTime <= now) {
        toast.error('Please select a future date and time')
        return
      }

      // Validate business hours (9 AM to 6 PM)
      const selectedHour = parseInt(bookingForm.scheduled_time.split(':')[0])
      if (selectedHour < 9 || selectedHour >= 18) {
        toast.error('Please select a time between 9:00 AM and 6:00 PM')
        return
      }

      // Check if user is authenticated
      const supabase = await getSupabaseClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        toast.error('Please sign in to make a booking')
        router.push('/auth/sign-in')
        return
      }

      // Get session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error:', sessionError)
        toast.error('Authentication error. Please sign in again.')
        router.push('/auth/sign-in')
        return
      }

      if (!session?.access_token) {
        console.error('No access token in session')
        toast.error('Please sign in to make a booking')
        router.push('/auth/sign-in')
        return
      }
      
      console.log('🔍 Making booking request with token:', session.access_token.substring(0, 20) + '...')
      
      const res = await crossDomainFetch('/api/bookings', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          service_id: service.id,
          scheduled_date: scheduledDateTime.toISOString(),
          notes: bookingForm.notes || undefined,
          service_package_id: bookingForm.package_id === 'base' ? undefined : bookingForm.package_id || undefined,
          location: bookingForm.location || 'Remote',
          requirements: bookingForm.requirements,
          budget: bookingForm.budget || service.base_price,
          urgency: bookingForm.urgency
        })
      })

      const json = await res.json()

      if (!res.ok) {
        // Check if it's a server error (API endpoint not available)
        if (res.status >= 500) {
          toast.error('Booking service is temporarily unavailable. Please try again later or contact support.')
          console.error('Server error:', res.status, json)
          return
        }
        throw new Error(json.error || 'Failed to create booking')
      }

      // Send notification to provider
      try {
        await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            recipient_id: service.provider_id,
            service_id: service.id,
            subject: `New Booking Request: ${service.title}`,
            content: `You have received a new booking request for your service "${service.title}".
            
Booking Details:
- Date: ${bookingForm.scheduled_date}
- Time: ${bookingForm.scheduled_time}
- Location: ${bookingForm.location || 'Remote'}
- Budget: ${formatCurrency(bookingForm.budget || service.base_price)}
- Urgency: ${bookingForm.urgency}

Requirements: ${bookingForm.requirements}

${bookingForm.notes ? `Notes: ${bookingForm.notes}` : ''}

Please review and respond to this booking request.`,
            message_type: 'booking_request',
            urgency: bookingForm.urgency
          })
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError)
        // Don't fail the booking if notification fails
      }

      setShowBooking(false)
      setBookingForm({
        package_id: 'base',
        scheduled_date: '',
        scheduled_time: '',
        location: '',
        notes: '',
        requirements: '',
        budget: 0,
        urgency: 'medium'
      })

      toast.success('Booking request submitted successfully! The provider will be notified and will contact you soon.')

      // Refresh service stats if owner
      if (isOwner) {
        fetchServiceStats(service.id)
      }

      // Redirect to bookings page
      router.push('/dashboard/bookings')
    } catch (error) {
      console.error('Booking error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create booking')
    } finally {
      setSubmitting(false)
    }
  }

  const handleContactProvider = async () => {
    if (!service || !service.provider) return

    try {
      // Check if user is authenticated
      const supabase = await getSupabaseClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        toast.error('Please sign in to contact the provider')
        router.push('/auth/sign-in')
        return
      }

      // Check if user is trying to contact themselves
      if (user.id === service.provider_id) {
        toast.error('You cannot contact yourself')
        return
      }

      // Open contact modal instead of redirecting
      setShowContactModal(true)
    } catch (error) {
      console.error('Contact provider error:', error)
      toast.error('Failed to open contact form')
    }
  }

  const handleSendMessage = async () => {
    if (!service || !user || !contactForm.subject.trim() || !contactForm.message.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsContactSending(true)
    try {
      const supabase = await getSupabaseClient()
      
      // Create a message record
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: service.provider_id,
          service_id: service.id,
          subject: contactForm.subject,
          content: contactForm.message,
          urgency: contactForm.urgency,
          message_type: contactForm.contactMethod
        })
        .select()
        .single()

      if (messageError) {
        throw messageError
      }

      // If contact method is email, also send email notification
      if (contactForm.contactMethod === 'email' && service.provider?.email) {
        // You can implement email notification here
        console.log('Email notification would be sent to:', service.provider.email)
      }

      toast.success('Message sent successfully!')
      setShowContactModal(false)
      setContactForm({
        subject: '',
        message: '',
        contactMethod: 'message',
        urgency: 'normal'
      })

      // Optionally redirect to messages page to continue conversation
      if (contactForm.contactMethod === 'message') {
        router.push(`/dashboard/messages?conversation=${messageData.id}`)
      }
    } catch (error) {
      console.error('Send message error:', error)
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsContactSending(false)
    }
  }

  const refreshServiceData = async () => {
    if (!serviceId) return
    
    try {
      const supabase = await getSupabaseClient()
      
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select(`
          *,
          service_packages(*)
        `)
        .eq('id', serviceId)
        .maybeSingle()

      if (serviceData && !serviceError) {
        setService(serviceData)
      }
    } catch (error) {
      console.error('Error refreshing service data:', error)
    }
  }

  const handleServiceStatusChange = async (newStatus: string) => {
    if (!service || !isAdmin) return

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('services')
        .update({ status: newStatus })
        .eq('id', service.id)

      if (error) {
        throw error
      }

      toast.success(`Service ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`)
      
      // Refresh service data
      await refreshServiceData()
    } catch (error) {
      console.error('Service status change error:', error)
      toast.error('Failed to update service status')
    }
  }

  const handleServiceApproval = async (action: 'approve' | 'reject') => {
    if (!service || !isAdmin) return

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('services')
        .update({ 
          approval_status: action === 'approve' ? 'approved' : 'rejected',
          status: action === 'approve' ? 'active' : 'inactive'
        })
        .eq('id', service.id)

      if (error) {
        throw error
      }

      toast.success(`Service ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
      
      // Refresh service data
      await refreshServiceData()
    } catch (error) {
      console.error('Service approval error:', error)
      toast.error(`Failed to ${action} service`)
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
  const isClient = user && user.role === 'client' && !isOwner
  const isAdmin = user && user.role === 'admin'

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
              <CardTitle className="text-red-600">
                {!user ? 'Authentication Required' : 'Service Not Found'}
              </CardTitle>
              <CardDescription>
                {!user 
                  ? 'Please sign in to view this service'
                  : error || 'The service you are looking for could not be found.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!user ? (
                <div className="flex gap-3">
                  <Button onClick={() => router.push('/auth/sign-in')}>
                    Sign In
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/auth/sign-up')}>
                    Sign Up
                  </Button>
                </div>
              ) : (
                <Button onClick={() => router.back()}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
              )}
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
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
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
                    {/* Only show status to owner or if service is active/approved */}
                    {(isOwner || service.status === 'active' || service.approval_status === 'approved') && (
                      <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                        {service.status}
                      </Badge>
                    )}
                    {/* Show approval status only to owner */}
                    {isOwner && service.approval_status && (
                      <Badge variant={
                        service.approval_status === 'approved' ? 'default' : 
                        service.approval_status === 'pending' ? 'secondary' : 
                        'destructive'
                      }>
                        {service.approval_status}
                      </Badge>
                    )}
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

                {/* Owner Info (only show if owner) */}
                {isOwner && (
                  <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-blue-600 text-white">
                        {user.full_name?.charAt(0) || 'Y'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900">
                        Your Service
                      </h3>
                      <p className="text-sm text-blue-700">You are the owner of this service</p>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium text-green-700">Service Owner</span>
                        </div>
                        <span className="text-sm text-blue-500">•</span>
                        <span className="text-sm text-blue-500">Full Management Access</span>
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

                {/* Approval Status Notice (only show if owner and pending) */}
                {isOwner && service.approval_status === 'pending' && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-900">Service Pending Approval</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          Your service is currently under review by our admin team. 
                          It will be visible to clients once approved. This usually takes 1-2 business days.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejected Status Notice (only show if owner and rejected) */}
                {isOwner && service.approval_status === 'rejected' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-900">Service Rejected</h4>
                        <p className="text-sm text-red-700 mt-1">
                          Your service was not approved. Please review our guidelines and update your service 
                          before resubmitting for approval.
                        </p>
                      </div>
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
                        <Button size="lg" onClick={() => router.push(`/dashboard/services/${service.id}/edit`)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Service
                        </Button>
                        <Button variant="outline" size="lg" onClick={() => router.push(`/dashboard/services/${service.id}/packages`)}>
                          <Package className="w-4 h-4 mr-2" />
                          Manage Packages
                        </Button>
                        <Button variant="outline" size="lg" onClick={() => router.push('/dashboard/services/manage')}>
                          <Settings className="w-4 h-4 mr-2" />
                          Manage All Services
                        </Button>
                        <Button variant="outline" size="lg" onClick={() => router.push('/dashboard/bookings')}>
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          View Bookings
                        </Button>
                        <Button variant="outline" size="lg" onClick={() => router.push(`/dashboard/services/${service.id}/analytics`)}>
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Analytics
                        </Button>
                      </>
                    ) : isAdmin ? (
                      /* Admin Actions */
                      <>
                        <Button variant="outline" size="lg" onClick={() => router.push('/dashboard/admin/services')}>
                          <Settings className="w-4 h-4 mr-2" />
                          Admin Panel
                        </Button>
                        <Button variant="outline" size="lg" onClick={handleContactProvider}>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Contact Provider
                        </Button>
                      </>
                    ) : (
                      /* Client Actions */
                      <>
                        <Button variant="outline" size="lg" onClick={handleContactProvider}>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Contact Provider
                        </Button>
                        {/* Only show booking button if service is approved and active */}
                        {(service.approval_status === 'approved' && service.status === 'active') ? (
                          <Button size="lg" onClick={() => setShowBooking(true)}>
                            Book This Service
                          </Button>
                        ) : (
                          <Button size="lg" disabled>
                            Service Not Available
                          </Button>
                        )}
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
              <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-6 overflow-x-auto scrollbar-hide">
                {[
                  { id: 'overview', label: 'Overview', icon: Eye },
                  { id: 'packages', label: 'Packages', icon: Package },
                  { id: 'reviews', label: 'Reviews', icon: Star },
                  ...(isOwner ? [
                    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                    { id: 'bookings', label: 'Bookings', icon: CalendarIcon },
                    { id: 'settings', label: 'Settings', icon: Settings }
                  ] : isAdmin ? [
                    { id: 'provider', label: 'Provider', icon: Users },
                    { id: 'admin', label: 'Admin', icon: Shield }
                  ] : [
                    { id: 'provider', label: 'Provider', icon: Users }
                  ])
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-4 px-2 sm:px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
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

            <div className="p-4 sm:p-6">
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

                    {/* Only show status card to owner or if service is active/approved */}
                    {(isOwner || service.status === 'active' || service.approval_status === 'approved') && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-gray-600">Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                            {service.status}
                          </Badge>
                          {isOwner && service.approval_status && (
                            <div className="mt-2">
                              <Badge variant={
                                service.approval_status === 'approved' ? 'default' : 
                                service.approval_status === 'pending' ? 'secondary' : 
                                'destructive'
                              }>
                                {service.approval_status}
                              </Badge>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

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
                            <Button variant="outline" onClick={handleContactProvider}>
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Send Message
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                if (service?.provider?.phone) {
                                  window.open(`tel:${service.provider.phone}`, '_self')
                                } else {
                                  toast.error('Phone number not available')
                                }
                              }}
                            >
                              <Phone className="w-4 h-4 mr-2" />
                              Call Provider
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                if (service?.provider?.email) {
                                  window.open(`mailto:${service.provider.email}?subject=Inquiry about ${service.title}`, '_blank')
                                } else {
                                  toast.error('Email not available')
                                }
                              }}
                            >
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

              {/* Settings Tab (only for owners) */}
              {activeTab === 'settings' && isOwner && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Service Settings</CardTitle>
                        <CardDescription>Manage your service configuration</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Service Status</h4>
                            <p className="text-sm text-gray-600">Control service visibility</p>
                          </div>
                          <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                            {service.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Featured Service</h4>
                            <p className="text-sm text-gray-600">Highlight your service</p>
                          </div>
                          <Badge variant={service.is_featured ? 'default' : 'outline'}>
                            {service.is_featured ? 'Featured' : 'Standard'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Approval Status</h4>
                            <p className="text-sm text-gray-600">Current approval state</p>
                          </div>
                          <Badge variant={
                            service.approval_status === 'approved' ? 'default' : 
                            service.approval_status === 'pending' ? 'secondary' : 
                            'destructive'
                          }>
                            {service.approval_status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Manage your service</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button 
                          className="w-full justify-start" 
                          variant="outline"
                          onClick={() => router.push(`/dashboard/services/${service.id}/edit`)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Service Details
                        </Button>
                        <Button 
                          className="w-full justify-start" 
                          variant="outline"
                          onClick={() => router.push(`/dashboard/services/${service.id}/packages`)}
                        >
                          <Package className="w-4 h-4 mr-2" />
                          Manage Packages
                        </Button>
                        <Button 
                          className="w-full justify-start" 
                          variant="outline"
                          onClick={() => router.push('/dashboard/services/manage')}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Service Management
                        </Button>
                        <Button 
                          className="w-full justify-start text-red-600 hover:text-red-700" 
                          variant="outline"
                          onClick={() => setShowDelete(true)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Service
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Admin Tab (only for admins) */}
              {activeTab === 'admin' && isAdmin && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Admin Controls</CardTitle>
                      <CardDescription>Administrative actions for this service</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">Service Status</h4>
                          <p className="text-sm text-gray-600 mb-3">Current: {service.status}</p>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleServiceStatusChange('active')}
                              disabled={service.status === 'active'}
                            >
                              Activate
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleServiceStatusChange('inactive')}
                              disabled={service.status === 'inactive'}
                            >
                              Deactivate
                            </Button>
                          </div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">Approval Status</h4>
                          <p className="text-sm text-gray-600 mb-3">Current: {service.approval_status}</p>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-green-600"
                              onClick={() => handleServiceApproval('approve')}
                              disabled={service.approval_status === 'approved'}
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600"
                              onClick={() => handleServiceApproval('reject')}
                              disabled={service.approval_status === 'rejected'}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="pt-4 border-t">
                        <Button 
                          className="w-full" 
                          onClick={() => router.push('/dashboard/admin/services')}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Go to Admin Panel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
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
                <Label className="text-base font-medium mb-4 block">Select Package</Label>
                <div className="space-y-3">
                  {/* Base Package Card */}
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      bookingForm.package_id === 'base' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setBookingForm(prev => ({ ...prev, package_id: 'base' }))}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center">
                          {bookingForm.package_id === 'base' && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Base Package</h4>
                          <p className="text-sm text-gray-600">Standard service delivery</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-gray-900">
                          {formatCurrency(service.base_price, service.currency)}
                        </div>
                        <div className="text-sm text-gray-500">Standard delivery</div>
                      </div>
                    </div>
                  </div>

                  {/* Custom Packages */}
                  {service.service_packages?.map((pkg) => (
                    <div 
                      key={pkg.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        bookingForm.package_id === pkg.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      } ${pkg.is_popular ? 'ring-2 ring-blue-200' : ''}`}
                      onClick={() => setBookingForm(prev => ({ ...prev, package_id: pkg.id }))}
                    >
                      {pkg.is_popular && (
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-xs font-semibold text-yellow-600">Most Popular</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center">
                            {bookingForm.package_id === pkg.id && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{pkg.name}</h4>
                            <p className="text-sm text-gray-600">{pkg.description}</p>
                            {pkg.features && pkg.features.length > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span className="text-xs text-green-600">
                                  {pkg.features.length} features included
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-gray-900">
                            {formatCurrency(pkg.price, service.currency)}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="h-3 w-3" />
                            {pkg.delivery_days} days
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                <Label className="text-base font-medium">Project Requirements *</Label>
                <Textarea
                  placeholder="Describe your project requirements in detail... (minimum 20 characters)"
                  value={bookingForm.requirements}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, requirements: e.target.value }))}
                  className={`mt-2 ${bookingForm.requirements.length > 0 && bookingForm.requirements.length < 20 ? 'border-red-300 focus:border-red-500' : bookingForm.requirements.length >= 20 ? 'border-green-300 focus:border-green-500' : ''}`}
                  rows={4}
                  maxLength={500}
                />
                <div className="flex justify-between text-xs mt-1">
                  <span className={bookingForm.requirements.length < 20 ? 'text-red-500' : 'text-green-600'}>
                    {bookingForm.requirements.length < 20 ? 'Please provide more details about your requirements' : 'Great! Your requirements are detailed enough.'}
                  </span>
                  <span className={bookingForm.requirements.length < 20 ? 'text-red-500' : bookingForm.requirements.length > 450 ? 'text-orange-500' : 'text-green-600'}>
                    {bookingForm.requirements.length}/500
                  </span>
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <Label className="text-base font-medium">Additional Notes (Optional)</Label>
                <Textarea
                  placeholder="Any additional information, special requests, or preferences..."
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="mt-2"
                  rows={3}
                  maxLength={300}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Share any additional context that might help the provider</span>
                  <span className={bookingForm.notes.length > 250 ? 'text-orange-500' : 'text-gray-500'}>
                    {bookingForm.notes.length}/300
                  </span>
                </div>
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
                  disabled={
                    submitting || 
                    !bookingForm.scheduled_date || 
                    !bookingForm.scheduled_time || 
                    !bookingForm.requirements?.trim() ||
                    bookingForm.requirements.length < 20
                  }
                  className="min-w-[120px]"
                >
                  {submitting ? 'Submitting...' : 'Submit Booking'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Contact Provider Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent className="sm:max-w-md lg:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Contact {service?.provider?.full_name || 'Provider'}
            </DialogTitle>
            <DialogDescription>
              Send a message to the service provider. They will receive your message and can respond directly.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Provider Info Summary */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <Avatar className="h-12 w-12">
                <AvatarImage src={service?.provider?.avatar_url} />
                <AvatarFallback>
                  {service?.provider?.full_name?.charAt(0) || 'P'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold">{service?.provider?.full_name}</h3>
                {service?.provider?.company_name && (
                  <p className="text-sm text-gray-600">{service?.provider?.company_name}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    {service?.provider?.rating || '5.0'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {service?.provider?.response_time || '2h'} response
                  </Badge>
                </div>
              </div>
            </div>

            {/* Contact Method */}
            <div>
              <Label className="text-sm font-medium">Contact Method</Label>
              <Select
                value={contactForm.contactMethod}
                onValueChange={(value) => setContactForm(prev => ({ ...prev, contactMethod: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="message">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Platform Message
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Notification
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div>
              <Label className="text-sm font-medium">Subject *</Label>
              <Input
                placeholder="What would you like to discuss?"
                value={contactForm.subject}
                onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                className="mt-2"
              />
            </div>

            {/* Message */}
            <div>
              <Label className="text-sm font-medium">Message *</Label>
              <Textarea
                placeholder="Describe your project, requirements, timeline, or any questions you have..."
                value={contactForm.message}
                onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                className="mt-2"
                rows={4}
              />
            </div>

            {/* Urgency */}
            <div>
              <Label className="text-sm font-medium">Urgency Level</Label>
              <Select
                value={contactForm.urgency}
                onValueChange={(value) => setContactForm(prev => ({ ...prev, urgency: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Low - General inquiry
                    </div>
                  </SelectItem>
                  <SelectItem value="normal">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      Normal - Standard request
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      High - Urgent matter
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setContactForm(prev => ({ 
                  ...prev, 
                  subject: 'Service Inquiry', 
                  message: `Hi ${service?.provider?.full_name}, I'm interested in your ${service?.title} service. Could you please provide more details about...` 
                }))}
                className="text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                General Inquiry
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setContactForm(prev => ({ 
                  ...prev, 
                  subject: 'Quote Request', 
                  message: `Hi ${service?.provider?.full_name}, I would like to request a quote for your ${service?.title} service. My project involves...` 
                }))}
                className="text-xs"
              >
                <DollarSign className="h-3 w-3 mr-1" />
                Quote Request
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setContactForm(prev => ({ 
                  ...prev, 
                  subject: 'Schedule Consultation', 
                  message: `Hi ${service?.provider?.full_name}, I'm interested in scheduling a consultation for your ${service?.title} service. Are you available for...` 
                }))}
                className="text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Schedule Call
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowContactModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSendMessage}
                disabled={isContactSending || !contactForm.subject.trim() || !contactForm.message.trim()}
                className="min-w-[120px]"
              >
                {isContactSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-xs text-gray-500 text-center">
              Your message will be sent securely to the provider. You'll receive a response in your dashboard messages.
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
