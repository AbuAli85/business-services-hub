'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Plus,
  Upload,
  Save,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Calendar,
  Tag,
  FileText,
  Image,
  Star,
  Users,
  Globe,
  Phone,
  Mail,
  MapPin
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface ServiceFormData {
  title: string
  description: string
  category: string
  base_price: number
  currency: string
  duration: string
  location: string
  delivery_method: string
  tags: string[]
  requirements: string
  terms_conditions: string
  cancellation_policy: string
  portfolio_url?: string
  contact_email?: string
  contact_phone?: string
  featured: boolean
}

const SERVICE_CATEGORIES = [
  'Web Development',
  'Mobile Development',
  'Graphic Design',
  'Digital Marketing',
  'Content Writing',
  'Translation',
  'Consulting',
  'Photography',
  'Video Production',
  'Data Analysis',
  'Accounting',
  'Legal Services',
  'Other'
]

const DELIVERY_METHODS = [
  'Online',
  'On-site',
  'Hybrid',
  'Remote'
]

const DURATION_OPTIONS = [
  '1-3 days',
  '1 week',
  '2-3 weeks',
  '1 month',
  '2-3 months',
  '6+ months',
  'Ongoing'
]

export default function CreateServicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<ServiceFormData>({
    title: '',
    description: '',
    category: '',
    base_price: 0,
    currency: 'OMR',
    duration: '',
    location: '',
    delivery_method: '',
    tags: [],
    requirements: '',
    terms_conditions: '',
    cancellation_policy: '',
    portfolio_url: '',
    contact_email: '',
    contact_phone: '',
    featured: false
  })
  const [tagInput, setTagInput] = useState('')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const handleInputChange = (field: keyof ServiceFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to create a service')
      return
    }

    // Validation
    if (!formData.title || !formData.description || !formData.category || !formData.base_price) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const supabase = await getSupabaseClient()
      
      const serviceData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        base_price: formData.base_price,
        currency: formData.currency,
        delivery_timeframe: formData.duration,

        tags: formData.tags,
        terms_conditions: formData.terms_conditions,
        cancellation_policy: formData.cancellation_policy,
        is_featured: formData.featured,
        provider_id: user.id,
        status: 'draft',
        approval_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('services')
        .insert(serviceData)
        .select()
        .single()

      if (error) {
        throw error
      }

      toast.success('Service created successfully! It will be reviewed by our admin team.')
      router.push('/dashboard/services')
    } catch (error: any) {
      console.error('Error creating service:', error)
      toast.error(error.message || 'Failed to create service')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="title">Service Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Professional Website Development"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Service Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your service in detail..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="mt-1 min-h-[120px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="duration">Duration</Label>
                <Select value={formData.duration} onValueChange={(value) => handleInputChange('duration', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((duration) => (
                      <SelectItem key={duration} value={duration}>
                        {duration}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="base_price">Base Price *</Label>
                <div className="flex mt-1">
                  <Input
                    id="base_price"
                    type="number"
                    placeholder="0"
                    value={formData.base_price}
                    onChange={(e) => handleInputChange('base_price', parseFloat(e.target.value) || 0)}
                    className="rounded-r-none"
                  />
                  <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                    <SelectTrigger className="w-20 rounded-l-none border-l-0">
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
                <Label htmlFor="delivery_method">Delivery Method</Label>
                <Select value={formData.delivery_method} onValueChange={(value) => handleInputChange('delivery_method', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select delivery method" />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Muscat, Oman or Remote"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="requirements">Client Requirements</Label>
              <Textarea
                id="requirements"
                placeholder="What do you need from clients to get started?"
                value={formData.requirements}
                onChange={(e) => handleInputChange('requirements', e.target.value)}
                className="mt-1 min-h-[100px]"
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="tags">Service Tags</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="tags"
                  placeholder="Add a tag (e.g., responsive, e-commerce)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="portfolio_url">Portfolio URL</Label>
              <Input
                id="portfolio_url"
                placeholder="https://yourportfolio.com"
                value={formData.portfolio_url}
                onChange={(e) => handleInputChange('portfolio_url', e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="contact@example.com"
                  value={formData.contact_email}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  placeholder="+968 1234 5678"
                  value={formData.contact_phone}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="terms_conditions">Terms & Conditions</Label>
              <Textarea
                id="terms_conditions"
                placeholder="Define your terms and conditions..."
                value={formData.terms_conditions}
                onChange={(e) => handleInputChange('terms_conditions', e.target.value)}
                className="mt-1 min-h-[120px]"
              />
            </div>

            <div>
              <Label htmlFor="cancellation_policy">Cancellation Policy</Label>
              <Textarea
                id="cancellation_policy"
                placeholder="Define your cancellation policy..."
                value={formData.cancellation_policy}
                onChange={(e) => handleInputChange('cancellation_policy', e.target.value)}
                className="mt-1 min-h-[120px]"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="featured"
                checked={formData.featured}
                onChange={(e) => handleInputChange('featured', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="featured">Feature this service (additional fee may apply)</Label>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Basic Information'
      case 2: return 'Pricing & Delivery'
      case 3: return 'Additional Details'
      case 4: return 'Terms & Policies'
      default: return ''
    }
  }

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return 'Tell us about your service and what you offer'
      case 2: return 'Set your pricing and delivery options'
      case 3: return 'Add tags, portfolio, and contact information'
      case 4: return 'Define terms, conditions, and policies'
      default: return ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Service</h1>
            <p className="text-muted-foreground">Add your service to our marketplace</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step <= currentStep 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {step < currentStep ? <CheckCircle className="h-4 w-4" /> : step}
            </div>
            {step < 4 && (
              <div className={`w-16 h-1 mx-2 ${
                step < currentStep ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {getStepTitle()}
          </CardTitle>
          <CardDescription>{getStepDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        
        <div className="flex space-x-2">
          {currentStep < 4 ? (
            <Button onClick={nextStep}>
              Next Step
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Creating Service...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Service
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Approval Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Service Approval Process</h4>
              <p className="text-sm text-blue-700 mt-1">
                Your service will be reviewed by our admin team before being published. 
                This usually takes 1-2 business days. You'll receive an email notification 
                once your service is approved or if any changes are needed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}