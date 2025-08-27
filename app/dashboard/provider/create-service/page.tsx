'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseClient } from '@/lib/supabase'
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Building2, 
  DollarSign, 
  Tag, 
  FileText, 
  Zap,
  CheckCircle,
  AlertCircle,
  Trash2,
  Eye
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// UUID validation utility
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

interface ServiceFormData {
  title: string
  description: string
  category: string
  base_price: string
  currency: string
  status: string
  tags: string
  requirements: string
  // Digital marketing specific fields
  delivery_timeframe: string
  revision_policy: string
  service_packages: {
    name: string
    price: string
    delivery_days: number
    revisions: number
    features: string[]
  }[]
}

export default function CreateServicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ServiceFormData>({
    title: '',
    description: '',
    category: 'Digital Marketing',
    base_price: '',
    currency: 'OMR',
    status: 'draft',
    tags: '',
    requirements: '',
    // Digital marketing specific fields
    delivery_timeframe: '7-14 days',
    revision_policy: '2 revisions included',
    service_packages: [
      {
        name: 'Basic',
        price: '',
        delivery_days: 7,
        revisions: 1,
        features: ['Initial consultation', 'Basic strategy', 'Standard reporting']
      },
      {
        name: 'Professional',
        price: '',
        delivery_days: 14,
        revisions: 2,
        features: ['Comprehensive strategy', 'Advanced analytics', 'Priority support', 'Monthly reports']
      },
      {
        name: 'Enterprise',
        price: '',
        delivery_days: 21,
        revisions: 3,
        features: ['Full-service management', 'Custom reporting', 'Dedicated account manager', 'Weekly updates', 'Performance optimization']
      }
    ]
  })

  const categories = [
    'Digital Marketing',
    'Legal Services',
    'Accounting',
    'IT Services',
    'Design & Branding',
    'Consulting',
    'Translation',
    'PRO Services',
    'HR Services',
    'Web Development',
    'Content Creation',
    'Financial Services',
    'Healthcare Services',
    'Education & Training',
    'Real Estate',
    'Manufacturing'
  ]

  const currencies = ['OMR', 'USD', 'EUR', 'GBP']
  const statuses = ['draft', 'active', 'inactive']
  
  // Digital marketing specific options
  const deliveryTimeframes = [
    '3-5 days',
    '7-14 days', 
    '14-21 days',
    '21-30 days',
    '30+ days',
    'Custom timeframe'
  ]
  
  const revisionPolicies = [
    '1 revision included',
    '2 revisions included',
    '3 revisions included',
    'Unlimited revisions',
    'Custom policy'
  ]

  // Enhanced validation
  const validateForm = () => {
    const errors: string[] = []
    
    if (!formData.title.trim()) errors.push('Service title is required')
    if (!formData.description.trim()) errors.push('Service description is required')
    if (!formData.category) errors.push('Category selection is required')
    if (!formData.base_price || parseFloat(formData.base_price) <= 0) errors.push('Valid base price is required')
    
    // Validate service packages
    const validPackages = formData.service_packages.filter(pkg => pkg.price && pkg.price !== '' && parseFloat(pkg.price) > 0)
    if (validPackages.length === 0) errors.push('At least one service package with a valid price is required')
    
    return errors
  }

  const handleInputChange = (field: keyof ServiceFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePackageChange = (packageIndex: number, field: keyof ServiceFormData['service_packages'][0], value: string | number) => {
    setFormData(prev => ({
      ...prev,
      service_packages: prev.service_packages.map((pkg, idx) => 
        idx === packageIndex ? { ...pkg, [field]: value } : pkg
      )
    }))
  }

  const handleFeatureChange = (packageIndex: number, featureIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      service_packages: prev.service_packages.map((pkg, idx) => 
        idx === packageIndex ? { ...pkg, features: pkg.features.map((f, fid) => fid === featureIndex ? value : f) } : pkg
      )
    }))
  }

  const addFeature = (packageIndex: number) => {
    setFormData(prev => ({
      ...prev,
      service_packages: prev.service_packages.map((pkg, idx) => 
        idx === packageIndex ? { ...pkg, features: [...pkg.features, ''] } : pkg
      )
    }))
  }

  const addPackage = () => {
    setFormData(prev => ({
      ...prev,
      service_packages: [...prev.service_packages, {
        name: `Package ${prev.service_packages.length + 1}`,
        price: '',
        delivery_days: 14,
        revisions: 2,
        features: ['Custom feature']
      }]
    }))
  }

  const removePackage = (packageIndex: number) => {
    if (formData.service_packages.length > 1) {
      setFormData(prev => ({
        ...prev,
        service_packages: prev.service_packages.filter((_, idx) => idx !== packageIndex)
      }))
    }
  }

  const removeFeature = (packageIndex: number, featureIndex: number) => {
    setFormData(prev => ({
      ...prev,
      service_packages: prev.service_packages.map((pkg, idx) => 
        idx === packageIndex ? { ...pkg, features: pkg.features.filter((_, fid) => fid !== featureIndex) } : pkg
      )
    }))
  }

  // Enhanced authentication validation
  const validateUser = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('❌ Authentication error:', error)
        alert('Authentication error. Please sign in again.')
        router.push('/auth/sign-in')
        return null
      }
      
      if (!user) {
        console.error('❌ No authenticated user')
        alert('You must be logged in to create a service')
        router.push('/auth/sign-in')
        return null
      }
      
      if (!user.id || !isValidUUID(user.id)) {
        console.error('❌ Invalid user ID:', user.id)
        alert('Invalid user account. Please sign in again.')
        router.push('/auth/sign-in')
        return null
      }
      
      console.log('✅ User authenticated with valid ID:', user.id)
      return user
    } catch (error) {
      console.error('❌ Error validating user:', error)
      alert('Authentication error. Please sign in again.')
      router.push('/auth/sign-in')
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get and validate current user
      const user = await validateUser()
      if (!user) return
      
      // Enhanced form validation
      const validationErrors = validateForm()
      if (validationErrors.length > 0) {
        alert(`Please fix the following errors:\n\n${validationErrors.join('\n')}`)
        return
      }

      // Create service with correct schema fields
      const serviceData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        base_price: parseFloat(formData.base_price),
        currency: formData.currency,
        status: formData.status,
        provider_id: user.id,
        approval_status: 'pending',
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
        requirements: formData.requirements || null,
        delivery_timeframe: formData.delivery_timeframe,
        revision_policy: formData.revision_policy
      }

      console.log('Attempting to create service with data:', serviceData)

      // Use Edge Function utility instead of direct fetch
      const { createService } = await import('@/lib/edge-functions')
      
      const result = await createService({
        ...serviceData,
        service_packages: formData.service_packages
          .filter(pkg => pkg.price && pkg.price !== '')
          .map(pkg => ({
            name: pkg.name,
            price: parseFloat(pkg.price),
            delivery_days: pkg.delivery_days,
            revisions: pkg.revisions,
            features: pkg.features
          }))
      })

      if (!result.success) {
        console.error('Edge Function error:', result)
        
        let errorMessage = 'Failed to create service'
        if (result.error) {
          errorMessage = result.error
        } else if (result.details && Array.isArray(result.details)) {
          errorMessage = `Validation errors:\n${result.details.join('\n')}`
        }
        
        alert(errorMessage)
        return
      }

      console.log('Service created via Edge Function:', result.data)

      alert('Service created successfully!')
      router.push('/dashboard/provider/provider-services')
    } catch (error) {
      console.error('Error creating service:', error)
      alert('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-5xl mx-auto p-6 lg:p-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard/provider/provider-services"
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors duration-200 mb-6 group"
          >
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Back to My Services
          </Link>
          
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center justify-center lg:justify-start w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-6 shadow-lg">
              <Plus className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
              Create New Service
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0">
              Showcase your expertise and attract new clients with a professionally crafted service offering
            </p>
          </div>
        </div>

        {/* Enhanced Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-2xl text-slate-900">Service Details</CardTitle>
                </div>
                <CardDescription className="text-slate-600 text-base">
                  Fill in the details below to create your new service. Fields marked with * are required.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Basic Information Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-slate-900">Basic Information</h3>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="title" className="text-sm font-medium text-slate-700 mb-2 block">
                          Service Title *
                        </Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => handleInputChange('title', e.target.value)}
                          placeholder="e.g., Digital Marketing Campaign"
                          className="h-12 text-base border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="description" className="text-sm font-medium text-slate-700 mb-2 block">
                          Description *
                        </Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          placeholder="Describe your service in detail, including what clients can expect, deliverables, and unique value propositions..."
                          rows={5}
                          className="border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 resize-none"
                          required
                        />
                        <p className="text-xs text-slate-500 mt-2">
                          Be specific and highlight what makes your service unique
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="requirements" className="text-sm font-medium text-slate-700 mb-2 block">
                          Client Requirements
                        </Label>
                        <Textarea
                          id="requirements"
                          value={formData.requirements}
                          onChange={(e) => handleInputChange('requirements', e.target.value)}
                          placeholder="What information or materials do clients need to provide? (e.g., brand guidelines, target audience, project timeline, budget range...)"
                          rows={3}
                          className="border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 resize-none"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                          Help clients understand what they need to prepare for a successful project
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Category & Status Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-slate-900">Classification</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="category" className="text-sm font-medium text-slate-700 mb-2 block">
                          Category *
                        </Label>
                        <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                          <SelectTrigger className="h-12 border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(category => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="status" className="text-sm font-medium text-slate-700 mb-2 block">
                          Status
                        </Label>
                        <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                          <SelectTrigger className="h-12 border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map(status => (
                              <SelectItem key={status} value={status}>
                                <span className="capitalize">{status}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500 mt-2">
                          Draft: Save for later | Active: Visible to clients
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-slate-900">Pricing</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="base_price" className="text-sm font-medium text-slate-700 mb-2 block">
                          Base Price *
                        </Label>
                        <div className="relative">
                          <Input
                            id="base_price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.base_price}
                            onChange={(e) => handleInputChange('base_price', e.target.value)}
                            placeholder="0.00"
                            className="h-12 text-base border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 pl-12"
                            required
                          />
                          <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="currency" className="text-sm font-medium text-slate-700 mb-2 block">
                          Currency
                        </Label>
                        <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                          <SelectTrigger className="h-12 border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map(currency => (
                              <SelectItem key={currency} value={currency}>
                                {currency}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Tags Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1 h-6 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-slate-900">Tags & Keywords</h3>
                    </div>
                    
                    <div>
                      <Label htmlFor="tags" className="text-sm font-medium text-slate-700 mb-2 block">
                        Tags
                      </Label>
                      <Input
                        id="tags"
                        value={formData.tags}
                        onChange={(e) => handleInputChange('tags', e.target.value)}
                        placeholder="e.g., digital marketing, SEO, social media, branding"
                        className="h-12 text-base border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        Separate tags with commas to help clients find your service
                      </p>
                    </div>
                  </div>

                  {/* Digital Marketing Specific Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1 h-6 bg-gradient-to-b from-teal-500 to-cyan-500 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-slate-900">Service Details</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="delivery_timeframe" className="text-sm font-medium text-slate-700 mb-2 block">
                          Delivery Timeframe
                        </Label>
                        <Select value={formData.delivery_timeframe} onValueChange={(value) => handleInputChange('delivery_timeframe', value)}>
                          <SelectTrigger className="h-12 border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {deliveryTimeframes.map(timeframe => (
                              <SelectItem key={timeframe} value={timeframe}>
                                {timeframe}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="revision_policy" className="text-sm font-medium text-slate-700 mb-2 block">
                          Revision Policy
                        </Label>
                        <Select value={formData.revision_policy} onValueChange={(value) => handleInputChange('revision_policy', value)}>
                          <SelectTrigger className="h-12 border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {revisionPolicies.map(policy => (
                              <SelectItem key={policy} value={policy}>
                                {policy}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Service Packages Section */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-6 bg-gradient-to-b from-violet-500 to-purple-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-slate-900">Service Packages</h3>
                        <p className="text-sm text-slate-500">Create different pricing tiers for your service</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addPackage}
                        className="h-9 px-3 border-dashed border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Package
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {formData.service_packages.map((pkg, index) => (
                        <Card key={index} className="border-2 border-slate-200 hover:border-slate-300 transition-all duration-200">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Input
                                  value={pkg.name}
                                  onChange={(e) => handlePackageChange(index, 'name', e.target.value)}
                                  className="h-8 text-lg font-semibold text-slate-900 border-0 p-0 bg-transparent focus:ring-0 focus:border-0"
                                  placeholder="Package Name"
                                />
                                <Badge variant={index === 0 ? "default" : index === 1 ? "secondary" : "outline"}>
                                  {index === 0 ? "Basic" : index === 1 ? "Popular" : "Premium"}
                                </Badge>
                              </div>
                              {formData.service_packages.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removePackage(index)}
                                  className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                                  Price ({formData.currency})
                                </Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={pkg.price}
                                  onChange={(e) => handlePackageChange(index, 'price', e.target.value)}
                                  placeholder="0.00"
                                  className="h-10 border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                                  Delivery Days
                                </Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={pkg.delivery_days}
                                  onChange={(e) => handlePackageChange(index, 'delivery_days', parseInt(e.target.value))}
                                  className="h-10 border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                                  Revisions
                                </Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={pkg.revisions}
                                  onChange={(e) => handlePackageChange(index, 'revisions', parseInt(e.target.value))}
                                  className="h-10 border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                                Features
                              </Label>
                              <div className="space-y-2">
                                {pkg.features.map((feature, featureIndex) => (
                                  <div key={featureIndex} className="flex items-center gap-2">
                                    <Input
                                      value={feature}
                                      onChange={(e) => handleFeatureChange(index, featureIndex, e.target.value)}
                                      placeholder="Enter feature description"
                                      className="h-9 border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeFeature(index, featureIndex)}
                                      className="h-9 w-9 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addFeature(index)}
                                  className="h-9 px-3 border-dashed border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add Feature
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Enhanced Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-200">
                    <div className="flex items-center gap-3">
                      <Link href="/dashboard/provider/provider-services">
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="h-12 px-6 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
                        >
                          Cancel
                        </Button>
                      </Link>
                      
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => {
                          const errors = validateForm()
                          if (errors.length > 0) {
                            alert(`Please fix the following errors:\n\n${errors.join('\n')}`)
                          } else {
                            alert('Form validation passed! Ready to create service.')
                          }
                        }}
                        className="h-12 px-6 border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all duration-200"
                      >
                        Validate Form
                      </Button>
                    </div>
                    
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="h-12 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Creating Service...
                        </>
                      ) : (
                        <>
                          <Save className="mr-3 h-5 w-5" />
                          Create Service
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Tips Card */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg text-slate-900">Pro Tips</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-700">
                    <strong>Be specific:</strong> Clear descriptions help clients understand exactly what they'll get
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-700">
                    <strong>Use relevant tags:</strong> Help potential clients discover your service
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-700">
                    <strong>Start with draft:</strong> You can always activate your service when ready
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Requirements Card */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  </div>
                  <CardTitle className="text-lg text-slate-900">Requirements</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Service title is required
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Description is required
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Category selection is required
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Base price is required
                </div>
              </CardContent>
            </Card>

            {/* Service Preview Card */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Eye className="h-5 w-5 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg text-slate-900">Service Preview</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.title && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-800">{formData.title}</h4>
                    {formData.category && (
                      <Badge variant="outline" className="text-xs">
                        {formData.category}
                      </Badge>
                    )}
                    {formData.base_price && (
                      <p className="text-sm text-slate-600">
                        Starting from {formData.currency} {formData.base_price}
                      </p>
                    )}
                    {formData.delivery_timeframe && (
                      <p className="text-xs text-slate-500">
                        ⏱️ {formData.delivery_timeframe}
                      </p>
                    )}
                    {formData.revision_policy && (
                      <p className="text-xs text-slate-500">
                        🔄 {formData.revision_policy}
                      </p>
                    )}
                  </div>
                )}
                {!formData.title && (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Start filling out the form to see a preview of your service
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Next Steps Card */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <CardTitle className="text-lg text-slate-900">Next Steps</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-slate-700">
                  <p className="font-medium mb-2">After creating your service:</p>
                  <ul className="space-y-1 text-slate-600">
                    <li>• Review and edit details</li>
                    <li>• Add service images</li>
                    <li>• Set availability</li>
                    <li>• Activate when ready</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
