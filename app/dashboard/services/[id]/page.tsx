'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ArrowLeft, Edit, Save, X, Eye, Calendar, DollarSign, 
  User, MapPin, Clock, Building2, Star, TrendingUp, MessageCircle
} from 'lucide-react'

// UUID validation utility
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

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
  provider_name?: string // Added for better UX
  provider_company?: string // Added for better UX
}

export default function DashboardServiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const serviceId = params.id as string
  
  // Debug logging
  console.log('DashboardServiceDetailPage - serviceId:', serviceId)
  console.log('DashboardServiceDetailPage - params:', params)
  
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isServiceOwner, setIsServiceOwner] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [contactLoading, setContactLoading] = useState(false)
  
  // Form state for editing
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    status: '',
    base_price: '',
    currency: '',
    tags: ''
  })

  useEffect(() => {
    console.log('🔍 useEffect triggered with serviceId:', serviceId)
    
    // Early validation - check if serviceId is valid before proceeding
    if (!serviceId || serviceId === 'undefined') {
      console.error('❌ Invalid service ID detected:', serviceId)
      setError('Invalid service ID. Please navigate to a valid service page.')
      setLoading(false)
      return
    }
    
    // Special case: redirect "create" to service creation page
    if (serviceId === 'create') {
      console.log('🔄 Redirecting "create" to service creation page')
      router.push('/dashboard/provider/create-service')
      return
    }
    
    // UUID format validation
    if (!isValidUUID(serviceId)) {
      console.error('❌ Invalid UUID format:', serviceId)
      setError(`Invalid service ID format: ${serviceId}. Please check the URL and try again.`)
      setLoading(false)
      return
    }
    
    console.log('✅ Service ID validation passed, proceeding with service fetch')
    checkUserAndFetchService()
  }, [serviceId, router])

  // Enhanced authentication validation
  const validateUser = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('❌ Authentication error:', error)
        router.push('/auth/sign-in')
        return null
      }
      
      if (!user) {
        console.error('❌ No authenticated user')
        router.push('/auth/sign-in')
        return null
      }
      
      if (!user.id || !isValidUUID(user.id)) {
        console.error('❌ Invalid user ID:', user.id)
        router.push('/auth/sign-in')
        return null
      }
      
      console.log('✅ User authenticated with valid ID:', user.id)
      return user
    } catch (error) {
      console.error('❌ Error validating user:', error)
      router.push('/auth/sign-in')
      return null
    }
  }

  const checkUserAndFetchService = async () => {
    try {
      console.log('🔍 Checking user authentication...')
      
      const user = await validateUser()
      if (!user) return
      
      // Set user state first
      setUser(user)
      
      // Validate serviceId before fetching
      if (!serviceId || serviceId === 'undefined' || !isValidUUID(serviceId)) {
        console.error('❌ Invalid service ID:', serviceId)
        setError('Invalid service ID format')
        setLoading(false)
        return
      }
      
      console.log('🚀 Fetching service with ID:', serviceId, 'for user:', user.id)
      // Wait a bit for state to update, then fetch service
      setTimeout(() => {
        fetchService(serviceId, user.id)
      }, 100)
      
    } catch (error) {
      console.error('❌ Error checking user:', error)
      setError('Authentication error')
    } finally {
      setLoading(false)
    }
  }

  const fetchService = async (id: string, userId?: string) => {
    try {
      console.log('📡 Fetching service...', { id, userId, userStateId: user?.id })
      
      // Enhanced UUID validation
      if (!isValidUUID(id)) {
        throw new Error(`Invalid service ID format: ${id}`)
      }
      
      // Use passed userId or fallback to state
      const currentUserId = userId || user?.id
      
      // Additional validation
      if (!currentUserId || !isValidUUID(currentUserId)) {
        console.error('❌ Validation failed:', { id, currentUserId })
        throw new Error(`Invalid user ID format: ${currentUserId}`)
      }

      console.log('✅ Validation passed, querying database...')
      const supabase = await getSupabaseClient()
      
      // First, check if the service exists (without provider restriction)
      const { data: serviceExists, error: checkError } = await supabase
        .from('services')
        .select('id, provider_id, status')
        .eq('id', id)
        .maybeSingle()

      if (checkError) {
        console.error('❌ Error checking service existence:', checkError)
        // Log more details about the error
        if (checkError.code) {
          console.error('❌ Error code:', checkError.code)
          console.error('❌ Error details:', checkError.details)
          console.error('❌ Error hint:', checkError.hint)
        }
        throw new Error(`Database error: ${checkError.message}`)
      }

      if (!serviceExists) {
        console.error('❌ Service not found with ID:', id)
        throw new Error('Service not found')
      }

      console.log('🔍 Service exists:', serviceExists)
      
      // Check if service is active
      if (serviceExists.status !== 'active') {
        console.error('❌ Service is not active:', serviceExists.status)
        throw new Error('This service is not currently available')
      }
      
      // Check if user owns this service (for editing) or is viewing as client
      const isOwner = serviceExists.provider_id === currentUserId
      setIsServiceOwner(isOwner)
      
      if (isOwner) {
        console.log('✅ User owns this service, fetching full data for editing')
        // Fetch full service data for owner (provider) without complex joins
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('id', id)
          .eq('provider_id', currentUserId)
          .maybeSingle()

        if (error) {
          console.error('❌ Database error:', error)
          throw new Error(`Database error: ${error.message}`)
        }

        if (!data) {
          console.error('❌ No service data returned')
          throw new Error('Service data not found')
        }

        // Use fallback method to fetch provider information
        const providerInfo = await fetchProviderInfo(data.provider_id)
        const transformedData = {
          ...data,
          provider_name: providerInfo.name,
          provider_company: providerInfo.company
        }

        console.log('✅ Service fetched successfully for owner:', transformedData)
        setService(transformedData)
        // Initialize edit form
        setEditForm({
          title: transformedData.title || '',
          description: transformedData.description || '',
          category: transformedData.category || '',
          status: transformedData.status || '',
          base_price: transformedData.base_price?.toString() || '',
          currency: transformedData.currency || 'OMR',
          tags: transformedData.tags?.join(', ') || ''
        })
      } else {
        console.log('👤 User is viewing as client, fetching service data for browsing')
        // Fetch service data for client viewing without complex joins
        const { data, error } = await supabase
          .from('services')
          .select(`
            id, title, description, category, status, base_price, currency, 
            cover_image_url, created_at, updated_at, provider_id, 
            views_count, bookings_count, rating, tags
          `)
          .eq('id', id)
          .eq('status', 'active')
          .maybeSingle()

        if (error) {
          console.error('❌ Database error:', error)
          throw new Error(`Database error: ${error.message}`)
        }

        if (!data) {
          console.error('❌ No service data returned')
          throw new Error('Service data not found')
        }

        // Use fallback method to fetch provider information
        const providerInfo = await fetchProviderInfo(data.provider_id)
        const transformedData = {
          ...data,
          provider_name: providerInfo.name,
          provider_company: providerInfo.company
        }

        console.log('✅ Service fetched successfully for client:', transformedData)
        setService(transformedData)
        // Don't initialize edit form for clients
      }
    } catch (err) {
      console.error('❌ Error fetching service:', err)
      // Better error handling with more context
      let errorMessage = 'Failed to fetch service'
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'object' && err !== null) {
        // Handle Supabase error objects
        if ('message' in err) {
          errorMessage = err.message as string
        } else if ('code' in err) {
          errorMessage = `Database error: ${err.code}`
        }
      }
      setError(errorMessage)
    }
  }

  const handleSave = async () => {
    if (!service || !user?.id) return

    setSaving(true)
    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('services')
        .update({
          title: editForm.title,
          description: editForm.description,
          category: editForm.category,
          status: editForm.status,
          base_price: parseFloat(editForm.base_price),
          currency: editForm.currency,
          tags: editForm.tags ? editForm.tags.split(',').map(tag => tag.trim()) : [],
          updated_at: new Date().toISOString()
        })
        .eq('id', service.id)
        .eq('provider_id', user.id)

      if (error) {
        throw error
      }

      // Refresh service data
      await fetchService(service.id, user.id)
      setEditing(false)
      alert('Service updated successfully!')
    } catch (err) {
      console.error('Error updating service:', err)
      alert('Failed to update service')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditing(false)
    // Reset form to original values
    if (service) {
      setEditForm({
        title: service.title || '',
        description: service.description || '',
        category: service.category || '',
        status: service.status || '',
        base_price: service.base_price?.toString() || '',
        currency: service.currency || 'OMR',
        tags: service.tags?.join(', ') || ''
      })
    }
  }

  const handleBookService = async () => {
    if (!service) return
    
    setBookingLoading(true)
    try {
      const supabase = await getSupabaseClient()
      
      // First, verify the service exists and is active
      const { data: serviceCheck, error: serviceError } = await supabase
        .from('services')
        .select('id, title, base_price, currency, status')
        .eq('id', service.id)
        .eq('status', 'active')
        .maybeSingle()

      if (serviceError) {
        console.error('❌ Error checking service:', serviceError)
        alert('Failed to verify service. Please try again.')
        return
      }

      if (!serviceCheck) {
        alert('Service not found or not available for booking.')
        return
      }

      // Create a new booking with all required fields
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          service_id: service.id,
          client_id: user.id,
          provider_id: service.provider_id,
          title: service.title,
          status: 'pending',
          subtotal: service.base_price || 0,
          currency: service.currency || 'OMR',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating booking:', error)
        
        // Handle specific foreign key constraint error
        if (error.code === '23503') {
          console.error('🔍 Foreign key constraint violation details:', error)
          
          // The constraint is referencing a non-existent table, so we need to handle this differently
          // Try to understand what the actual constraint is expecting
          alert('Service reference error. The database schema has a constraint issue. Please contact support to fix the database constraints.')
          return
        } else {
          alert('Failed to create booking. Please try again.')
        }
        return
      }

      console.log('✅ Booking created successfully:', booking)
      alert(`✅ Service booked successfully!\n\nService: ${service.title}\nProvider: ${service.provider_name}\nStatus: Pending\n\nYour booking has been created and is awaiting provider confirmation.`)
      
    } catch (err) {
      console.error('❌ Error creating booking:', err)
      alert('Failed to create booking. Please try again.')
    } finally {
      setBookingLoading(false)
    }
  }

  const handleContactProvider = async () => {
    if (!service) return
    
    setContactLoading(true)
    try {
      // For now, redirect to messages page with pre-filled recipient
      // In a full implementation, this would open a messaging modal or redirect to messages
      const message = `Hi ${service.provider_name}, I'm interested in your service "${service.title}". Could you please provide more details?`
      
      // Store the message in localStorage for the messages page to pick up
      localStorage.setItem('pendingMessage', JSON.stringify({
        recipientId: service.provider_id,
        recipientName: service.provider_name,
        subject: `Inquiry about ${service.title}`,
        message: message
      }))
      
      // Redirect to messages page
      router.push('/dashboard/messages')
      
    } catch (err) {
      console.error('❌ Error in handleContactProvider:', err)
      alert('An unexpected error occurred. Please try again.')
    } finally {
      setContactLoading(false)
    }
  }

  const handleViewProviderProfile = async () => {
    if (!service) return
    
    try {
      // For now, redirect to a provider profile page
      // In a full implementation, this would navigate to the provider's public profile
      router.push(`/dashboard/provider/${service.provider_id}`)
      
    } catch (err) {
      console.error('❌ Error in handleViewProviderProfile:', err)
      // Fallback: show provider info in a modal or alert
      alert(`Provider Profile: ${service.provider_name}\n\nCompany: ${service.provider_company}\n\nThis feature is coming soon!`)
    }
  }

  const handleWriteReview = () => {
    if (!service) return
    
    // For now, show a review form modal or redirect to review page
    // In a full implementation, this would open a review submission form
    const reviewData = {
      serviceId: service.id,
      serviceTitle: service.title,
      providerId: service.provider_id,
      providerName: service.provider_name
    }
    
    // Store review data for the review page
    localStorage.setItem('pendingReview', JSON.stringify(reviewData))
    
    // Redirect to a review page or show modal
    alert(`Review Service: ${service.title}\n\nProvider: ${service.provider_name}\n\nThis feature is coming soon! You'll be able to rate and review this service.`)
    
    // Optionally redirect to review page
    // router.push(`/dashboard/reviews/new?service=${service.id}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200'
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'featured': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCategoryColor = (category: string) => {
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }

  const fetchProviderInfo = async (providerId: string) => {
    try {
      console.log('🔍 Fetching provider info for:', providerId)
      const supabase = await getSupabaseClient()
      
      // Fetch provider profile information
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, company_id')
        .eq('id', providerId)
        .maybeSingle()

      if (profileError) {
        console.warn('⚠️ Could not fetch provider profile:', profileError)
        return { name: 'Unknown Provider', company: 'Independent Professional' }
      }

      if (!profile) {
        console.warn('⚠️ No profile found for provider:', providerId)
        return { name: 'Unknown Provider', company: 'Independent Professional' }
      }

      let companyName = 'Independent Professional'
      if (profile.company_id) {
        try {
          // Fetch company information
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('name')
            .eq('id', profile.company_id)
            .maybeSingle()

          if (!companyError && company && company.name) {
            companyName = company.name
            console.log('✅ Company found:', companyName)
          } else {
            console.warn('⚠️ Company not found or error:', companyError)
          }
        } catch (companyError) {
          console.warn('⚠️ Error fetching company:', companyError)
        }
      }

      const result = {
        name: profile.full_name || 'Unknown Provider',
        company: companyName
      }

      console.log('✅ Provider info fetched:', result)
      return result
    } catch (error) {
      console.warn('⚠️ Error fetching provider info:', error)
      return { name: 'Unknown Provider', company: 'Independent Professional' }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">Loading service...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Service Not Found</CardTitle>
              <CardDescription>
                {error || 'The service you are looking for could not be found.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error === 'Service not found' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    The service with ID <code className="bg-yellow-100 px-2 py-1 rounded">{serviceId}</code> does not exist in our system.
                  </p>
                </div>
              )}
              
              {error === 'You do not have permission to access this service' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">
                    This service belongs to another provider. You can only view and edit services that you created.
                  </p>
                </div>
              )}
              
              {error && error.includes('Invalid service ID') && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    <strong>Invalid Service ID:</strong> {serviceId}
                  </p>
                  <p className="text-blue-700 text-sm mt-2">
                    Service IDs must be valid UUIDs. If you're trying to create a new service, 
                    please use the "Create Service" button instead.
                  </p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard/services')}>
                  View My Services
                </Button>
                {error && error.includes('Invalid service ID') && (
                  <Button variant="outline" onClick={() => router.push('/dashboard/provider/create-service')}>
                    Create New Service
                  </Button>
                )}
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
              Back to Services
            </Button>
            
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {editing ? 'Edit Service' : service.title}
              </h1>
              <p className="text-gray-600 text-lg">
                {editing ? 'Update your service information' : 
                  isServiceOwner ? 'Service details and management' : 'Service details and booking'}
              </p>
            </div>

            <div className="flex gap-2">
              {isServiceOwner ? (
                // Provider view - can edit
                editing ? (
                  <>
                    <Button 
                      onClick={handleSave} 
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={handleCancelEdit}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Service
                  </Button>
                )
              ) : (
                // Client view - can book/contact
                <>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleBookService} disabled={bookingLoading}>
                    <Calendar className="h-4 w-4 mr-2" />
                    {bookingLoading ? 'Booking...' : 'Book Service'}
                  </Button>
                  <Button variant="outline" onClick={handleContactProvider} disabled={contactLoading}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {contactLoading ? 'Contacting...' : 'Contact Provider'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Service Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isServiceOwner && editing ? (
                  // Edit Form (only for service owners)
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Service Title</Label>
                      <Input
                        id="title"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder="Enter service title"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Enter service description"
                        rows={4}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={editForm.category}
                          onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Digital Marketing">Digital Marketing</SelectItem>
                            <SelectItem value="Legal Services">Legal Services</SelectItem>
                            <SelectItem value="Accounting">Accounting</SelectItem>
                            <SelectItem value="IT Services">IT Services</SelectItem>
                            <SelectItem value="Design & Branding">Design & Branding</SelectItem>
                            <SelectItem value="Consulting">Consulting</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={editForm.status}
                          onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="featured">Featured</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="base_price">Base Price</Label>
                        <Input
                          id="base_price"
                          type="number"
                          value={editForm.base_price}
                          onChange={(e) => setEditForm({ ...editForm, base_price: e.target.value })}
                          placeholder="Enter base price"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <Select
                          value={editForm.currency}
                          onValueChange={(value) => setEditForm({ ...editForm, currency: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OMR">OMR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        value={editForm.tags}
                        onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                        placeholder="Enter tags separated by commas"
                      />
                    </div>
                  </div>
                ) : (
                  // Display Mode (for both owners and clients)
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor(service.status)}>
                        {service.status}
                      </Badge>
                      <Badge className={getCategoryColor(service.category)}>
                        {service.category}
                      </Badge>
                      <div className="text-2xl font-bold text-green-600">
                        {service.base_price} {service.currency}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-700 leading-relaxed">
                        {service.description || 'No description available for this service.'}
                      </p>
                    </div>
                    
                    {service.tags && service.tags.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {service.tags.map((tag, index) => (
                            <Badge key={index} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {!isServiceOwner && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">Ready to Book?</h4>
                        <p className="text-blue-800 text-sm mb-3">
                          This service is provided by a verified business professional. 
                          You can book this service or contact the provider directly.
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleBookService} disabled={bookingLoading}>
                            <Calendar className="h-4 w-4 mr-2" />
                            {bookingLoading ? 'Booking...' : 'Book Now'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleContactProvider} disabled={contactLoading}>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            {contactLoading ? 'Contacting...' : 'Ask Questions'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service Image */}
            {service.cover_image_url && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Service Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <img 
                    src={service.cover_image_url} 
                    alt={service.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Service Stats */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Service Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900">
                      {service.views_count || 0}
                    </div>
                    <div className="text-sm text-blue-600">Views</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-900">
                      {service.bookings_count || 0}
                    </div>
                    <div className="text-sm text-green-600">Bookings</div>
                  </div>
                </div>
                
                {service.rating && (
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`h-4 w-4 ${star <= service.rating! ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                    <div className="text-lg font-bold text-yellow-900">
                      {service.rating.toFixed(1)} / 5.0
                    </div>
                    <div className="text-sm text-yellow-600">Average Rating</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service Details */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-600" />
                  Service Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Created: {new Date(service.created_at).toLocaleDateString()}</span>
                </div>
                
                {service.updated_at && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>Updated: {new Date(service.updated_at).toLocaleDateString()}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>Provider: {service.provider_name || 'Unknown Provider'}</span>
                </div>
                
                {service.provider_company && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="h-4 w-4" />
                    <span>Company: {service.provider_company}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign className="h-4 w-4" />
                  <span>Price: {service.base_price} {service.currency}</span>
                </div>
              </CardContent>
            </Card>

            {/* Provider Information (for clients) */}
            {!isServiceOwner && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-green-600" />
                    About the Provider
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span>{service.provider_name || 'Professional Business Provider'}</span>
                  </div>
                  
                  {service.provider_company && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="h-4 w-4" />
                      <span>{service.provider_company}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Star className="h-4 w-4" />
                    <span>Verified Service Provider</span>
                  </div>
                  
                  <div className="pt-2">
                    <Button variant="outline" className="w-full" onClick={handleViewProviderProfile}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      View Provider Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isServiceOwner ? (
                  // Provider actions
                  <>
                    <Button variant="outline" className="w-full justify-start">
                      <Eye className="h-4 w-4 mr-2" />
                      View Public Page
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      View Bookings
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      View Analytics
                    </Button>
                  </>
                ) : (
                  // Client actions
                  <>
                    <Button variant="outline" className="w-full justify-start" onClick={handleBookService} disabled={bookingLoading}>
                      <Calendar className="h-4 w-4 mr-2" />
                      {bookingLoading ? 'Booking...' : 'Book This Service'}
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleContactProvider} disabled={contactLoading}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {contactLoading ? 'Contacting...' : 'Message Provider'}
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleWriteReview}>
                      <Star className="h-4 w-4 mr-2" />
                      Write Review
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
