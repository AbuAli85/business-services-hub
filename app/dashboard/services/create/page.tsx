'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Trash2, 
  Upload, 
  Image as ImageIcon,
  Package,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Save,
  Eye,
  Settings,
  Star
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface ServicePackage {
  id: string
  name: string
  description: string
  price: number
  delivery_days: number
  revisions: number
  features: string[]
}

interface ServiceForm {
  title: string
  description: string
  category: string
  base_price: number
  currency: string
  cover_image_url?: string
  tags: string[]
  packages: ServicePackage[]
  terms_conditions: string
  cancellation_policy: string
}

const CATEGORIES = [
  'web-development',
  'mobile-development',
  'design',
  'marketing',
  'consulting',
  'translation',
  'legal-services',
  'accounting',
  'it-services',
  'hr-services',
  'content-creation',
  'financial-services',
  'healthcare-services',
  'education-training',
  'real-estate',
  'manufacturing'
]

const CURRENCIES = ['USD', 'EUR', 'GBP', 'OMR', 'AED', 'SAR', 'QAR', 'BHD', 'KWD']

export default function CreateServicePage() {
  const [formData, setFormData] = useState<ServiceForm>({
    title: '',
    description: '',
    category: '',
    base_price: 0,
    currency: 'USD',
    cover_image_url: '',
    tags: [],
    packages: [],
    terms_conditions: '',
    cancellation_policy: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [newTag, setNewTag] = useState('')
  const [newPackage, setNewPackage] = useState<Partial<ServicePackage>>({
    name: '',
    description: '',
    price: 0,
    delivery_days: 1,
    revisions: 1,
    features: []
  })
  const [newFeature, setNewFeature] = useState('')
  const router = useRouter()

  const totalSteps = 4

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      setUser(user)
    } catch (error) {
      console.error('Error checking user:', error)
      toast.error('Failed to load user data')
    }
  }

  const handleInputChange = (field: keyof ServiceForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePackageChange = (field: keyof ServicePackage, value: any) => {
    setNewPackage(prev => ({ ...prev, [field]: value }))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleInputChange('tags', [...formData.tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove))
  }

  const addFeature = () => {
    if (newFeature.trim() && !newPackage.features?.includes(newFeature.trim())) {
      handlePackageChange('features', [...(newPackage.features || []), newFeature.trim()])
      setNewFeature('')
    }
  }

  const removeFeature = (featureToRemove: string) => {
    handlePackageChange('features', newPackage.features?.filter(f => f !== featureToRemove) || [])
  }

  const addPackage = () => {
    if (newPackage.name && newPackage.description && newPackage.price && newPackage.price > 0) {
      const packageToAdd: ServicePackage = {
        id: Date.now().toString(),
        name: newPackage.name,
        description: newPackage.description,
        price: newPackage.price,
        delivery_days: newPackage.delivery_days || 1,
        revisions: newPackage.revisions || 1,
        features: newPackage.features || []
      }
      
      handleInputChange('packages', [...formData.packages, packageToAdd])
      setNewPackage({
        name: '',
        description: '',
        price: 0,
        delivery_days: 1,
        revisions: 1,
        features: []
      })
      toast.success('Package added successfully')
    } else {
      toast.error('Please fill in all required package fields')
    }
  }

  const removePackage = (packageId: string) => {
    handleInputChange('packages', formData.packages.filter(p => p.id !== packageId))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `service-images/${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath)

      handleInputChange('cover_image_url', publicUrl)
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
    } finally {
      setLoading(false)
    }
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.title && formData.description && formData.category && formData.base_price > 0)
      case 2:
        return formData.packages.length > 0
      case 3:
        return !!(formData.terms_conditions && formData.cancellation_policy)
      case 4:
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    } else {
      toast.error('Please complete all required fields before proceeding')
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      toast.error('Please complete all required fields')
      return
    }

    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      // Create service
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .insert({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          base_price: formData.base_price,
          currency: formData.currency,
          cover_image_url: formData.cover_image_url,
          tags: formData.tags,
          terms_conditions: formData.terms_conditions,
          cancellation_policy: formData.cancellation_policy,
          provider_id: user.id,
          status: 'draft',
          approval_status: 'pending'
        })
        .select()
        .single()

      if (serviceError) throw serviceError

      // Create packages
      if (formData.packages.length > 0) {
        const packagesToInsert = formData.packages.map(pkg => ({
          service_id: service.id,
          name: pkg.name,
          description: pkg.description,
          price: pkg.price,
          delivery_days: pkg.delivery_days,
          revisions: pkg.revisions,
          features: pkg.features
        }))

        const { error: packagesError } = await supabase
          .from('service_packages')
          .insert(packagesToInsert)

        if (packagesError) throw packagesError
      }

      toast.success('Service created successfully!')
      router.push('/dashboard/services')
    } catch (error) {
      console.error('Error creating service:', error)
      toast.error('Failed to create service')
    } finally {
      setLoading(false)
    }
  }

  const getStepStatus = (step: number) => {
    if (step < currentStep) return 'completed'
    if (step === currentStep) return 'current'
    return 'upcoming'
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Service</h1>
          <p className="text-gray-600 mt-1">Build your service offering step by step</p>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
              <div key={step} className="flex items-center">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2",
                  getStepStatus(step) === 'completed' && "bg-green-500 border-green-500 text-white",
                  getStepStatus(step) === 'current' && "bg-blue-500 border-blue-500 text-white",
                  getStepStatus(step) === 'upcoming' && "bg-gray-200 border-gray-300 text-gray-500"
                )}>
                  {getStepStatus(step) === 'completed' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{step}</span>
                  )}
                </div>
                {step < totalSteps && (
                  <div className={cn(
                    "w-16 h-0.5 mx-2",
                    getStepStatus(step) === 'completed' ? "bg-green-500" : "bg-gray-300"
                  )} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Basic Info</span>
            <span>Packages</span>
            <span>Terms</span>
            <span>Review</span>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Tell clients about your service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="title">Service Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Professional Web Development"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your service in detail..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="currency">Currency *</Label>
                    <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="base_price">Base Price *</Label>
                  <div className="relative mt-2">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="base_price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.base_price}
                      onChange={(e) => handleInputChange('base_price', parseFloat(e.target.value) || 0)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label>Cover Image</Label>
                  <div className="mt-2">
                    {formData.cover_image_url ? (
                      <div className="relative">
                        <img
                          src={formData.cover_image_url}
                          alt="Cover"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => handleInputChange('cover_image_url', '')}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <Label htmlFor="image-upload" className="cursor-pointer">
                          <span className="text-blue-600 hover:text-blue-700">Upload an image</span>
                          <span className="text-gray-500"> or drag and drop</span>
                        </Label>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 5MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Tags</Label>
                  <div className="mt-2 space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <Button type="button" onClick={addTag} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-1">
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-1 hover:text-red-600"
                            >
                              <XCircle className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Service Packages */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Service Packages</CardTitle>
                <CardDescription>Create different pricing tiers for your service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add New Package Form */}
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-medium">Add New Package</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="package-name">Package Name *</Label>
                      <Input
                        id="package-name"
                        placeholder="e.g., Basic, Standard, Premium"
                        value={newPackage.name}
                        onChange={(e) => handlePackageChange('name', e.target.value)}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="package-price">Price *</Label>
                      <div className="relative mt-2">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="package-price"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={newPackage.price}
                          onChange={(e) => handlePackageChange('price', parseFloat(e.target.value) || 0)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="package-description">Description *</Label>
                    <Textarea
                      id="package-description"
                      placeholder="Describe what's included in this package..."
                      value={newPackage.description}
                      onChange={(e) => handlePackageChange('description', e.target.value)}
                      rows={3}
                      className="mt-2"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="delivery-days">Delivery (Days) *</Label>
                      <Input
                        id="delivery-days"
                        type="number"
                        min="1"
                        value={newPackage.delivery_days}
                        onChange={(e) => handlePackageChange('delivery_days', parseInt(e.target.value) || 1)}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="revisions">Revisions *</Label>
                      <Input
                        id="revisions"
                        type="number"
                        min="0"
                        value={newPackage.revisions}
                        onChange={(e) => handlePackageChange('revisions', parseInt(e.target.value) || 0)}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Features</Label>
                    <div className="mt-2 space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a feature..."
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                        />
                        <Button type="button" onClick={addFeature} variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {newPackage.features && newPackage.features.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {newPackage.features.map((feature) => (
                            <Badge key={feature} variant="secondary" className="gap-1">
                              {feature}
                              <button
                                type="button"
                                onClick={() => removeFeature(feature)}
                                className="ml-1 hover:text-red-600"
                              >
                                <XCircle className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button onClick={addPackage} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Package
                  </Button>
                </div>

                {/* Existing Packages */}
                {formData.packages.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Your Packages</h4>
                    {formData.packages.map((pkg) => (
                      <div key={pkg.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h5 className="font-medium">{pkg.name}</h5>
                            <p className="text-sm text-gray-600">{pkg.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600">
                              ${pkg.price}
                            </div>
                            <div className="text-sm text-gray-500">
                              {pkg.delivery_days} days • {pkg.revisions} revisions
                            </div>
                          </div>
                        </div>
                        
                        {pkg.features.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {pkg.features.map((feature) => (
                              <Badge key={feature} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removePackage(pkg.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Terms & Conditions */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
                <CardDescription>Set clear expectations for your clients</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="terms">Terms & Conditions *</Label>
                  <Textarea
                    id="terms"
                    placeholder="Outline your service terms, what's included, and any important conditions..."
                    value={formData.terms_conditions}
                    onChange={(e) => handleInputChange('terms_conditions', e.target.value)}
                    rows={6}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="cancellation">Cancellation Policy *</Label>
                  <Textarea
                    id="cancellation"
                    placeholder="Explain your cancellation policy, refund terms, and any fees..."
                    value={formData.cancellation_policy}
                    onChange={(e) => handleInputChange('cancellation_policy', e.target.value)}
                    rows={6}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Review & Submit</CardTitle>
                <CardDescription>Review your service before publishing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Service Overview */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Service Overview</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Title:</span>
                      <span className="font-medium">{formData.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span className="font-medium">{formData.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Price:</span>
                      <span className="font-medium">{formData.currency} {formData.base_price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Packages:</span>
                      <span className="font-medium">{formData.packages.length}</span>
                    </div>
                  </div>
                </div>

                {/* Packages Review */}
                {formData.packages.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Packages</h4>
                    <div className="space-y-3">
                      {formData.packages.map((pkg) => (
                        <div key={pkg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">{pkg.name}</div>
                            <div className="text-sm text-gray-600">{pkg.description}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-blue-600">{formData.currency} {pkg.price}</div>
                            <div className="text-sm text-gray-500">
                              {pkg.delivery_days} days • {pkg.revisions} revisions
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Terms Review */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Terms & Policies</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="font-medium text-gray-700">Terms & Conditions:</div>
                      <div className="text-gray-600 mt-1 line-clamp-3">{formData.terms_conditions}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Cancellation Policy:</div>
                      <div className="text-gray-600 mt-1 line-clamp-3">{formData.cancellation_policy}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            
            {currentStep < totalSteps ? (
              <Button onClick={nextStep}>
                Next Step
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Creating Service...' : 'Create Service'}
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Basic Info</span>
                  {currentStep >= 1 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Packages</span>
                  {currentStep >= 2 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Terms</span>
                  {currentStep >= 3 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Review</span>
                  {currentStep >= 4 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                <span>Be specific about what's included in each package</span>
              </div>
              <div className="flex items-start space-x-2">
                <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                <span>Set realistic delivery timelines</span>
              </div>
              <div className="flex items-start space-x-2">
                <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                <span>Clear terms help avoid misunderstandings</span>
              </div>
              <div className="flex items-start space-x-2">
                <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                <span>High-quality images increase booking rates</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
