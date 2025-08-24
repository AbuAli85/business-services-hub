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
  User, MapPin, Clock, Building2, Star, TrendingUp
} from 'lucide-react'

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
    if (serviceId && serviceId !== 'undefined') {
      checkUserAndFetchService()
    } else {
      setError('Invalid service ID')
      setLoading(false)
    }
  }, [serviceId])

  const checkUserAndFetchService = async () => {
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
      // Set user state first
      setUser(user)
      
      // Validate serviceId before fetching
      if (!serviceId || serviceId === 'undefined') {
        console.error('❌ Invalid service ID:', serviceId)
        setError('Invalid service ID')
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
      
      // Use passed userId or fallback to state
      const currentUserId = userId || user?.id
      
      // Additional validation
      if (!id || id === 'undefined' || !currentUserId) {
        console.error('❌ Validation failed:', { id, currentUserId })
        throw new Error('Invalid service ID or user not authenticated')
      }

      console.log('✅ Validation passed, querying database...')
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .eq('provider_id', currentUserId) // Use validated user ID
        .single()

      if (error) {
        console.error('❌ Database error:', error)
        throw error
      }

      console.log('✅ Service fetched successfully:', data)
      setService(data)
      // Initialize edit form
      setEditForm({
        title: data.title || '',
        description: data.description || '',
        category: data.category || '',
        status: data.status || '',
        base_price: data.base_price?.toString() || '',
        currency: data.currency || 'OMR',
        tags: data.tags?.join(', ') || ''
      })
    } catch (err) {
      console.error('❌ Error fetching service:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch service')
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
            <CardContent>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
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
                {editing ? 'Update your service information' : 'Service details and management'}
              </p>
            </div>

            <div className="flex gap-2">
              {editing ? (
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
                {editing ? (
                  // Edit Form
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
                  // Display Mode
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
                  <span>Provider ID: {service.provider_id.slice(0, 8)}...</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign className="h-4 w-4" />
                  <span>Price: {service.base_price} {service.currency}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
