'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft,
  Save,
  X,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Upload,
  Image as ImageIcon,
  Clock,
  DollarSign,
  Tag,
  CheckCircle,
  AlertCircle,
  Star,
  Users,
  Calendar,
  Settings,
  BarChart3,
  FileText,
  Zap
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'

interface Service {
  id: string
  title: string
  description: string
  base_price: number
  currency: string
  category: string
  status: string
  approval_status: string
  created_at: string
  updated_at: string
  provider_id: string
  deliverables: string[]
  requirements: string[]
  milestones: any[]
  estimated_duration?: string
  max_revisions?: number
  delivery_time?: string
  service_type?: string
  difficulty_level?: string
  tags?: string[]
  featured?: boolean
  image_url?: string
  gallery?: string[]
  pricing_tiers?: PricingTier[]
  faq?: FAQ[]
}

interface PricingTier {
  id: string
  name: string
  price: number
  description: string
  features: string[]
  popular?: boolean
}

interface FAQ {
  id: string
  question: string
  answer: string
}

interface ValidationErrors {
  title?: string
  description?: string
  base_price?: string
  category?: string
  deliverables?: string
  requirements?: string
}

export default function EditServicePage() {
  const params = useParams()
  const router = useRouter()
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('basic')
  const [showPreview, setShowPreview] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    base_price: 0,
    currency: 'OMR',
    category: '',
    status: 'active',
    deliverables: [] as string[],
    requirements: [] as string[],
    estimated_duration: '',
    max_revisions: 3,
    delivery_time: '',
    service_type: 'one-time',
    difficulty_level: 'intermediate',
    tags: [] as string[],
    featured: false,
    image_url: '',
    gallery: [] as string[],
    pricing_tiers: [] as PricingTier[],
    faq: [] as FAQ[]
  })

  // New item states
  const [newDeliverable, setNewDeliverable] = useState('')
  const [newRequirement, setNewRequirement] = useState('')
  const [newTag, setNewTag] = useState('')
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' })
  const [editingFaq, setEditingFaq] = useState<string | null>(null)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user && params.id) {
      loadService()
    }
  }, [user, params.id])

  const loadUser = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const loadService = async () => {
    if (!params.id) return

    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      
      setService(data)
      setFormData({
        title: data.title || '',
        description: data.description || '',
        base_price: data.base_price || 0,
        currency: data.currency || 'OMR',
        category: data.category || '',
        status: data.status || 'active',
        deliverables: Array.isArray(data.deliverables) ? data.deliverables : [],
        requirements: Array.isArray(data.requirements) ? data.requirements : [],
        estimated_duration: data.estimated_duration || '',
        max_revisions: data.max_revisions || 3,
        delivery_time: data.delivery_time || '',
        service_type: data.service_type || 'one-time',
        difficulty_level: data.difficulty_level || 'intermediate',
        tags: Array.isArray(data.tags) ? data.tags : [],
        featured: data.featured || false,
        image_url: data.image_url || '',
        gallery: Array.isArray(data.gallery) ? data.gallery : [],
        pricing_tiers: Array.isArray(data.pricing_tiers) ? data.pricing_tiers : [],
        faq: Array.isArray(data.faq) ? data.faq : []
      })
    } catch (error) {
      console.error('Error loading service:', error)
      toast.error('Failed to load service')
      router.push('/dashboard/services')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {}
    
    if (!formData.title.trim()) {
      errors.title = 'Service title is required'
    } else if (formData.title.length < 5) {
      errors.title = 'Service title must be at least 5 characters'
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Service description is required'
    } else if (formData.description.length < 20) {
      errors.description = 'Service description must be at least 20 characters'
    }
    
    if (formData.base_price <= 0) {
      errors.base_price = 'Price must be greater than 0'
    }
    
    if (!formData.category.trim()) {
      errors.category = 'Category is required'
    }
    
    if (formData.deliverables.length === 0) {
      errors.deliverables = 'At least one deliverable is required'
    }
    
    if (formData.requirements.length === 0) {
      errors.requirements = 'At least one requirement is required'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear validation error when user starts typing
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  const handleDeliverableAdd = () => {
    if (newDeliverable.trim()) {
      setFormData(prev => ({
        ...prev,
        deliverables: [...prev.deliverables, newDeliverable.trim()]
      }))
      setNewDeliverable('')
    }
  }

  const handleDeliverableRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index)
    }))
  }

  const handleRequirementAdd = () => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()]
      }))
      setNewRequirement('')
    }
  }

  const handleRequirementRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }))
  }

  const handleTagAdd = () => {
    if (newTag.trim()) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleTagRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }))
  }

  const handleFaqAdd = () => {
    if (newFaq.question.trim() && newFaq.answer.trim()) {
      setFormData(prev => ({
        ...prev,
        faq: [...prev.faq, { id: Date.now().toString(), ...newFaq }]
      }))
      setNewFaq({ question: '', answer: '' })
    }
  }

  const handleFaqEdit = (id: string) => {
    const faq = formData.faq.find(f => f.id === id)
    if (faq) {
      setNewFaq({ question: faq.question, answer: faq.answer })
      setEditingFaq(id)
    }
  }

  const handleFaqUpdate = () => {
    if (editingFaq && newFaq.question.trim() && newFaq.answer.trim()) {
      setFormData(prev => ({
        ...prev,
        faq: prev.faq.map(f => f.id === editingFaq ? { ...f, ...newFaq } : f)
      }))
      setNewFaq({ question: '', answer: '' })
      setEditingFaq(null)
    }
  }

  const handleFaqRemove = (id: string) => {
    setFormData(prev => ({
      ...prev,
      faq: prev.faq.filter(f => f.id !== id)
    }))
  }

  const handleFaqCancel = () => {
    setNewFaq({ question: '', answer: '' })
    setEditingFaq(null)
  }

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix the validation errors before saving')
      return
    }

    setSaving(true)

    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('services')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim(),
          base_price: formData.base_price,
          currency: formData.currency,
          category: formData.category,
          status: formData.status,
          deliverables: formData.deliverables,
          requirements: formData.requirements,
          estimated_duration: formData.estimated_duration,
          max_revisions: formData.max_revisions,
          delivery_time: formData.delivery_time,
          service_type: formData.service_type,
          difficulty_level: formData.difficulty_level,
          tags: formData.tags,
          featured: formData.featured,
          image_url: formData.image_url,
          gallery: formData.gallery,
          pricing_tiers: formData.pricing_tiers,
          faq: formData.faq,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)

      if (error) throw error

      toast.success('Service updated successfully!')
      router.push(`/dashboard/services/${params.id}`)
    } catch (error) {
      console.error('Error updating service:', error)
      toast.error('Failed to update service')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Not Found</h2>
          <p className="text-gray-600 mb-4">The service you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/dashboard/services')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Services
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/services/${params.id}`)}
                className="hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Service
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Service</h1>
                <p className="text-sm text-gray-500">Update and enhance your service details</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>{showPreview ? 'Hide Preview' : 'Preview'}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/services/${params.id}`)}
                className="text-gray-600 hover:text-gray-700"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {Object.keys(validationErrors).length > 0 && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Please fix the validation errors below before saving your changes.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="basic" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Basic Info</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Details</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Pricing</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center space-x-2">
              <ImageIcon className="h-4 w-4" />
              <span>Media</span>
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>FAQ</span>
            </TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Basic Information</span>
                  </CardTitle>
                  <CardDescription>Essential details about your service</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-sm font-medium">
                      Service Title *
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Enter a compelling service title"
                      className={`mt-1 ${validationErrors.title ? 'border-red-500' : ''}`}
                    />
                    {validationErrors.title && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.title}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm font-medium">
                      Description *
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Describe what your service offers and its benefits"
                      className={`mt-1 ${validationErrors.description ? 'border-red-500' : ''}`}
                      rows={4}
                    />
                    {validationErrors.description && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.description.length}/500 characters
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category" className="text-sm font-medium">
                        Category *
                      </Label>
                      <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                        <SelectTrigger className={`mt-1 ${validationErrors.category ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Design & Branding">Design & Branding</SelectItem>
                          <SelectItem value="Web Development">Web Development</SelectItem>
                          <SelectItem value="Digital Marketing">Digital Marketing</SelectItem>
                          <SelectItem value="Content Writing">Content Writing</SelectItem>
                          <SelectItem value="Consulting">Consulting</SelectItem>
                          <SelectItem value="Photography">Photography</SelectItem>
                          <SelectItem value="Video Production">Video Production</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {validationErrors.category && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.category}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="status" className="text-sm font-medium">
                        Status
                      </Label>
                      <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Tag className="h-5 w-5" />
                    <span>Tags & Classification</span>
                  </CardTitle>
                  <CardDescription>Help clients find your service</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Service Tags</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add a tag"
                          onKeyPress={(e) => e.key === 'Enter' && handleTagAdd()}
                        />
                        <Button type="button" onClick={handleTagAdd} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                            <span>{tag}</span>
                            <button
                              onClick={() => handleTagRemove(index)}
                              className="ml-1 hover:text-red-600"
                              title="Remove tag"
                              aria-label={`Remove tag ${tag}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="service_type" className="text-sm font-medium">
                        Service Type
                      </Label>
                      <Select value={formData.service_type} onValueChange={(value) => handleInputChange('service_type', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one-time">One-time</SelectItem>
                          <SelectItem value="recurring">Recurring</SelectItem>
                          <SelectItem value="subscription">Subscription</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="difficulty_level" className="text-sm font-medium">
                        Difficulty Level
                      </Label>
                      <Select value={formData.difficulty_level} onValueChange={(value) => handleInputChange('difficulty_level', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="featured"
                      checked={formData.featured}
                      onChange={(e) => handleInputChange('featured', e.target.checked)}
                      title="Mark as featured service"
                      aria-label="Mark as featured service"
                      placeholder="Mark as featured service"
                      className="rounded border-gray-300"
                      aria-describedby="featured-description"
                    />
                    <Label htmlFor="featured" className="text-sm font-medium">
                      Featured Service
                    </Label>
                  </div>
                  <p id="featured-description" className="text-xs text-gray-500">
                    Featured services appear prominently in search results
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>Deliverables</span>
                  </CardTitle>
                  <CardDescription>What clients will receive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={newDeliverable}
                        onChange={(e) => setNewDeliverable(e.target.value)}
                        placeholder="Add a deliverable"
                        onKeyPress={(e) => e.key === 'Enter' && handleDeliverableAdd()}
                      />
                      <Button type="button" onClick={handleDeliverableAdd} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {validationErrors.deliverables && (
                      <p className="text-sm text-red-600">{validationErrors.deliverables}</p>
                    )}
                    <div className="space-y-2">
                      {formData.deliverables.map((deliverable, index) => (
                        <div key={index} className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-200">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-800">{deliverable}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeliverableRemove(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>Requirements</span>
                  </CardTitle>
                  <CardDescription>What you need from clients</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={newRequirement}
                        onChange={(e) => setNewRequirement(e.target.value)}
                        placeholder="Add a requirement"
                        onKeyPress={(e) => e.key === 'Enter' && handleRequirementAdd()}
                      />
                      <Button type="button" onClick={handleRequirementAdd} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {validationErrors.requirements && (
                      <p className="text-sm text-red-600">{validationErrors.requirements}</p>
                    )}
                    <div className="space-y-2">
                      {Array.isArray(formData.requirements) && formData.requirements.map((requirement, index) => (
                        <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-blue-800">{requirement}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRequirementRemove(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Timing & Delivery</span>
                </CardTitle>
                <CardDescription>Set expectations for delivery time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="estimated_duration" className="text-sm font-medium">
                      Estimated Duration
                    </Label>
                    <Input
                      id="estimated_duration"
                      value={formData.estimated_duration}
                      onChange={(e) => handleInputChange('estimated_duration', e.target.value)}
                      placeholder="e.g., 2-3 days"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_revisions" className="text-sm font-medium">
                      Max Revisions
                    </Label>
                    <Input
                      id="max_revisions"
                      type="number"
                      value={formData.max_revisions}
                      onChange={(e) => handleInputChange('max_revisions', parseInt(e.target.value) || 0)}
                      placeholder="3"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="delivery_time" className="text-sm font-medium">
                      Delivery Time
                    </Label>
                    <Input
                      id="delivery_time"
                      value={formData.delivery_time}
                      onChange={(e) => handleInputChange('delivery_time', e.target.value)}
                      placeholder="e.g., 9 AM - 5 PM"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Pricing Information</span>
                </CardTitle>
                <CardDescription>Set your service pricing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="base_price" className="text-sm font-medium">
                      Base Price *
                    </Label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">{formData.currency}</span>
                      </div>
                      <Input
                        id="base_price"
                        type="number"
                        value={formData.base_price}
                        onChange={(e) => handleInputChange('base_price', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className={`pl-12 ${validationErrors.base_price ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {validationErrors.base_price && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.base_price}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="currency" className="text-sm font-medium">
                      Currency
                    </Label>
                    <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OMR">OMR (Omani Rial)</SelectItem>
                        <SelectItem value="USD">USD (US Dollar)</SelectItem>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                        <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ImageIcon className="h-5 w-5" />
                  <span>Media & Images</span>
                </CardTitle>
                <CardDescription>Add images to showcase your service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="image_url" className="text-sm font-medium">
                    Main Service Image URL
                  </Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => handleInputChange('image_url', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Gallery Images</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add image URL"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement
                            if (input.value.trim()) {
                              setFormData(prev => ({
                                ...prev,
                                gallery: [...prev.gallery, input.value.trim()]
                              }))
                              input.value = ''
                            }
                          }
                        }}
                      />
                      <Button type="button" size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {formData.gallery.map((url, index) => (
                        <div key={index} className="relative group h-24">
                          <Image
                            src={url}
                            alt={`Gallery ${index + 1}`}
                            fill
                            className="object-cover rounded-lg border"
                            sizes="(max-width: 768px) 50vw, 33vw"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                gallery: prev.gallery.filter((_, i) => i !== index)
                              }))
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Frequently Asked Questions</span>
                </CardTitle>
                <CardDescription>Help clients understand your service better</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Question</Label>
                      <Input
                        value={newFaq.question}
                        onChange={(e) => setNewFaq(prev => ({ ...prev, question: e.target.value }))}
                        placeholder="What is your question?"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Answer</Label>
                      <Input
                        value={newFaq.answer}
                        onChange={(e) => setNewFaq(prev => ({ ...prev, answer: e.target.value }))}
                        placeholder="Provide a clear answer"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {editingFaq ? (
                      <>
                        <Button onClick={handleFaqUpdate} size="sm">
                          Update FAQ
                        </Button>
                        <Button onClick={handleFaqCancel} variant="outline" size="sm">
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button onClick={handleFaqAdd} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add FAQ
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {formData.faq.map((faq) => (
                    <div key={faq.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-2">{faq.question}</h4>
                          <p className="text-sm text-gray-600">{faq.answer}</p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFaqEdit(faq.id)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFaqRemove(faq.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}