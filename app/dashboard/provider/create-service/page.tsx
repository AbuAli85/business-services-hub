'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Stepper } from '@/components/ui/stepper'
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { getSupabaseClient } from '@/lib/supabase'
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Building2, 
  Tag, 
  FileText, 
  Zap,
  CheckCircle,
  AlertCircle,
  Trash2,
  Eye,
  ArrowRight,
  Clock,
  Target,
  HelpCircle,
  ListChecks,
  Calendar,
  Info,
  DollarSign,
  Users,
  Package
} from 'lucide-react'
import { DeliverablesSelector } from '@/components/dashboard/deliverables-selector'
import { RequirementsSelector } from '@/components/dashboard/requirements-selector'
import { EnhancedMilestonesEditor, MilestoneTemplate } from '@/components/dashboard/enhanced-milestones-editor'
import { toast } from 'sonner'

// UUID validation utility
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

interface Company {
  id: string
  name: string
  industry?: string
  logo_url?: string
}

interface ServiceCategory {
  id: string
  name: string
  description?: string
  icon?: string
}

interface ServiceTitle {
  id: string
  title: string
  description?: string
  is_custom: boolean
}

interface ValidationErrors {
  [key: string]: string
}

interface CreateServiceFormData {
  // Step 1: Basic Information
  category_id: string
  service_title: string
  custom_title: string
  duration: string
  description: string
  price: string
  price_type: 'fixed' | 'starting_from' | 'custom_quotation'
  company_id: string
  
  // Step 2: Deliverables
  deliverables: string[]
  
  // Step 3: Requirements
  requirements: string[]
  
  // Step 4: Milestones
  milestones: MilestoneTemplate[]
  
  // Step 5: Review & Publish
  status: 'draft' | 'pending_approval' | 'active'
}

export default function CreateServicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [companies, setCompanies] = useState<Company[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [serviceTitles, setServiceTitles] = useState<ServiceTitle[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  const [formData, setFormData] = useState<CreateServiceFormData>({
    category_id: '',
    service_title: '',
    custom_title: '',
    duration: '7-14 days',
    description: '',
    price: '',
    price_type: 'fixed',
    company_id: '',
    deliverables: [],
    requirements: [],
    milestones: [],
    status: 'draft'
  })

  const steps = [
    {
      id: 1,
      title: 'Basic Information',
      description: 'Service details and pricing',
      isCompleted: currentStep > 1,
      isActive: currentStep === 1
    },
    {
      id: 2,
      title: 'Deliverables',
      description: 'What clients will receive',
      isCompleted: currentStep > 2,
      isActive: currentStep === 2
    },
    {
      id: 3,
      title: 'Requirements',
      description: 'What clients need to provide',
      isCompleted: currentStep > 3,
      isActive: currentStep === 3
    },
    {
      id: 4,
      title: 'Milestones',
      description: 'Project phases and timeline',
      isCompleted: currentStep > 4,
      isActive: currentStep === 4
    },
    {
      id: 5,
      title: 'Review & Publish',
      description: 'Final review and submission',
      isCompleted: currentStep > 5,
      isActive: currentStep === 5
    }
  ]

  const durationOptions = [
    '1-3 days',
    '4-7 days',
    '7-14 days',
    '15-30 days',
    '30+ days',
    'Custom timeframe'
  ]

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = await getSupabaseClient()
        
        // Fetch companies
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/sign-in')
          return
        }
        
        // Verify user is a provider
        let role = user.user_metadata?.role
        if (!role) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          role = profile?.role || 'client'
        }
        
        // If not a provider, redirect to appropriate dashboard
        if (role !== 'provider') {
          if (role === 'client') {
            router.push('/dashboard/client')
          } else {
            router.push('/dashboard')
          }
          return
        }
        
        // User is authenticated as provider, continue with data loading

        const [companiesResult, categoriesResult] = await Promise.all([
          supabase
            .from('companies')
            .select('id, name, industry, logo_url')
            .eq('owner_id', user.id)
            .order('name'),
          supabase
            .from('service_categories')
            .select('id, name, description, icon')
            .eq('is_active', true)
            .order('sort_order')
        ])

        if (companiesResult.error) {
          console.error('Error fetching companies:', companiesResult.error)
        } else {
          setCompanies(companiesResult.data || [])
          if (companiesResult.data && companiesResult.data.length === 1) {
            setFormData(prev => ({
              ...prev,
              company_id: companiesResult.data[0].id
            }))
          }
        }

        if (categoriesResult.error) {
          console.error('Error fetching categories:', categoriesResult.error)
        } else {
          setCategories(categoriesResult.data || [])
        }

      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoadingCompanies(false)
        setLoadingCategories(false)
        setAuthLoading(false)
      }
    }

    fetchData()
  }, [router])

  // Fetch service titles when category changes
  useEffect(() => {
    const fetchServiceTitles = async () => {
      if (!formData.category_id) {
        setServiceTitles([])
        return
      }

      try {
        const supabase = await getSupabaseClient()
        const { data: titles, error } = await supabase
          .from('service_titles')
          .select('id, title, description, is_custom')
          .eq('category_id', formData.category_id)
          .eq('is_active', true)
          .order('sort_order')

        if (error) {
          console.error('Error fetching service titles:', error)
          return
        }

        setServiceTitles(titles || [])
      } catch (error) {
        console.error('Error fetching service titles:', error)
      }
    }

    fetchServiceTitles()
  }, [formData.category_id])

  // Validation functions
  const validateStep1 = (): ValidationErrors => {
    const errors: ValidationErrors = {}
    
    if (!formData.category_id) errors.category_id = 'Category selection is required'
    if (!formData.service_title && !formData.custom_title) {
      errors.service_title = 'Service title is required'
    }
    if (!formData.description.trim()) errors.description = 'Service description is required'
    if (formData.description.trim().length < 50) {
      errors.description = 'Description must be at least 50 characters'
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      errors.price = 'Valid price is required'
    }
    if (!formData.duration) errors.duration = 'Duration is required'
    if (!formData.company_id) errors.company_id = 'Please select a company to provide this service'
    
    return errors
  }

  const validateStep2 = (): ValidationErrors => {
    const errors: ValidationErrors = {}
    
    if (formData.deliverables.length === 0) {
      errors.deliverables = 'At least one deliverable is required'
    }
    
    return errors
  }

  const validateStep3 = (): ValidationErrors => {
    // Requirements are optional
    return {}
  }

  const validateStep4 = (): ValidationErrors => {
    const errors: ValidationErrors = {}
    
    if (formData.milestones.length === 0) {
      errors.milestones = 'At least one milestone is required'
    } else {
      const validMilestones = formData.milestones.filter(m => m.title.trim())
      if (validMilestones.length === 0) {
        errors.milestones = 'At least one milestone with a title is required'
      }
    }
    
    return errors
  }

  const validateCurrentStep = (): boolean => {
    let errors: ValidationErrors = {}
    
    switch (currentStep) {
      case 1:
        errors = validateStep1()
        break
      case 2:
        errors = validateStep2()
        break
      case 3:
        errors = validateStep3()
        break
      case 4:
        errors = validateStep4()
        break
      default:
        errors = {}
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Form handling functions
  const handleInputChange = (field: keyof CreateServiceFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleCoverChange = (file: File | null) => {
    setCoverFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setCoverPreview(url)
    } else {
      setCoverPreview(null)
    }
  }

  const handleDeliverablesChange = (deliverables: string[]) => {
    setFormData(prev => ({
      ...prev,
      deliverables
    }))
  }

  const handleRequirementsChange = (requirements: string[]) => {
    setFormData(prev => ({
      ...prev,
      requirements
    }))
  }

  const handleMilestonesChange = (milestones: MilestoneTemplate[]) => {
    setFormData(prev => ({
      ...prev,
      milestones
    }))
  }

  // Navigation functions
  const nextStep = () => {
    if (validateCurrentStep() && currentStep < 5) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  // Submit function
  const handleSubmit = async () => {
    setLoading(true)

    try {
      const user = await validateUser()
      if (!user) return
      
      // Final validation
      const step1Errors = validateStep1()
      const step2Errors = validateStep2()
      const step3Errors = validateStep3()
      const step4Errors = validateStep4()
      
      const allErrors = { ...step1Errors, ...step2Errors, ...step3Errors, ...step4Errors }
      if (Object.keys(allErrors).length > 0) {
        setValidationErrors(allErrors)
        toast.error('Please fix all validation errors before submitting')
        return
      }

      const supabase = await getSupabaseClient()

      // Get category name
      const selectedCategory = categories.find(c => c.id === formData.category_id)
      const categoryName = selectedCategory?.name || 'General'

      // Get service title
      let serviceTitle = formData.custom_title
      if (formData.service_title !== 'custom') {
        const selectedTitle = serviceTitles.find(t => t.id === formData.service_title)
        serviceTitle = selectedTitle?.title || formData.service_title
      }

      // Optionally upload cover image first
      let coverImageUrl: string | undefined
      if (coverFile) {
        try {
          const fileExt = coverFile.name.split('.').pop()
          const fileName = `cover_${Date.now()}.${fileExt}`
          const filePath = `${user.id}/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('service-images')
            .upload(filePath, coverFile, {
              cacheControl: '3600',
              upsert: true
            })
          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('service-images')
            .getPublicUrl(filePath)
          coverImageUrl = publicUrl
        } catch (e) {
          console.warn('Cover image upload failed, proceeding without it:', e)
        }
      }

      // Create service
      const serviceData = {
        title: serviceTitle,
        description: formData.description,
        category: categoryName,
        base_price: parseFloat(formData.price),
        currency: 'OMR',
        status: formData.status,
        provider_id: user.id,
        company_id: formData.company_id,
        duration: formData.duration,
        deliverables: formData.deliverables,
        cover_image_url: coverImageUrl
      }

      const { data: service, error: serviceError } = await supabase
        .from('services')
        .insert(serviceData)
        .select()
        .single()

      if (serviceError) {
        console.error('Error creating service:', serviceError)
        toast.error('Failed to create service: ' + serviceError.message)
        return
      }

      // Create service requirements
      if (formData.requirements.length > 0) {
        const requirementsData = Array.isArray(formData.requirements) ? formData.requirements.map((requirement, index) => ({
          service_id: service.id,
          requirement,
          is_required: true,
          order_index: index + 1
        })) : []

        const { error: requirementsError } = await supabase
          .from('service_requirements')
          .insert(requirementsData)

        if (requirementsError) {
          console.error('Error creating requirements:', requirementsError)
        }
      }

      // Create service milestones
      const milestonesData = formData.milestones
        .filter(m => m.title.trim())
        .map((milestone, index) => ({
          service_id: service.id,
          milestone_title: milestone.title,
          description: milestone.description,
          estimated_duration: milestone.estimated_duration,
          order_index: index + 1,
          is_required: true
        }))

      if (milestonesData.length > 0) {
        const { error: milestonesError } = await supabase
          .from('service_milestones')
          .insert(milestonesData)

        if (milestonesError) {
          console.error('Error creating milestones:', milestonesError)
        }
      }

      toast.success('Service created successfully!')
      router.push('/dashboard/services')
    } catch (error) {
      console.error('Error creating service:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Enhanced authentication validation
  const validateUser = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('❌ Authentication error:', error)
        toast.error('Authentication error. Please sign in again.')
        router.push('/auth/sign-in')
        return null
      }
      
      if (!user) {
        console.error('❌ No authenticated user')
        toast.error('You must be logged in to create a service')
        router.push('/auth/sign-in')
        return null
      }
      
      if (!user.id || !isValidUUID(user.id)) {
        console.error('❌ Invalid user ID:', user.id)
        toast.error('Invalid user account. Please sign in again.')
        router.push('/auth/sign-in')
        return null
      }
      
      return user
    } catch (error) {
      console.error('❌ Error validating user:', error)
      toast.error('Authentication error. Please sign in again.')
      router.push('/auth/sign-in')
      return null
    }
  }

  // Step components
  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Cover Image */}
      <div>
        <Label className="text-sm font-medium text-slate-700 mb-2 block">Cover Image</Label>
        <div className="flex items-center gap-4">
          <div className="w-40 h-24 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border relative">
            {coverPreview ? (
              <Image src={coverPreview} alt="Cover preview" fill className="object-cover" sizes="160px" />
            ) : (
              <Building2 className="h-8 w-8 text-gray-400" />
            )}
          </div>
          <div className="space-y-2">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(e) => handleCoverChange(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-gray-500">PNG, JPG, or WEBP up to 5MB. Shown as service cover.</p>
          </div>
        </div>
      </div>

      {/* Category Selection */}
      <div>
        <Label htmlFor="category_id" className="text-sm font-medium text-slate-700 mb-2 block">
          Service Category *
          <TooltipProvider>
            <Tooltip content="Choose the category that best fits your service">
              <HelpCircle className="inline h-4 w-4 ml-1 text-slate-400" />
            </Tooltip>
          </TooltipProvider>
        </Label>
        {loadingCategories ? (
          <div className="h-12 border-2 border-slate-200 rounded-md flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-slate-600">Loading categories...</span>
          </div>
        ) : (
          <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
            <SelectTrigger className={`h-12 border-2 transition-all duration-200 ${
              validationErrors.category_id ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center text-white text-xs font-bold">
                      {category.icon || category.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{category.name}</div>
                      {category.description && (
                        <div className="text-xs text-slate-500">{category.description}</div>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {validationErrors.category_id && (
          <p className="text-red-500 text-sm mt-1">{validationErrors.category_id}</p>
        )}
      </div>

      {/* Service Title */}
      <div>
        <Label htmlFor="service_title" className="text-sm font-medium text-slate-700 mb-2 block">
          Service Title *
          <TooltipProvider>
            <Tooltip content="Choose from professional service titles or create a custom one">
              <HelpCircle className="inline h-4 w-4 ml-1 text-slate-400" />
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Select value={formData.service_title} onValueChange={(value) => handleInputChange('service_title', value)}>
          <SelectTrigger className={`h-12 border-2 transition-all duration-200 ${
            validationErrors.service_title ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'
          }`}>
            <SelectValue placeholder="Select or create a service title" />
          </SelectTrigger>
          <SelectContent>
            {serviceTitles.map(title => (
              <SelectItem key={title.id} value={title.id}>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">{title.title}</div>
                    {title.description && (
                      <div className="text-xs text-slate-500">{title.description}</div>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))}
            <SelectItem value="custom">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                  <Plus className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium">Custom Title</div>
                  <div className="text-xs text-slate-500">Create your own service title</div>
                </div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        
        {formData.service_title === 'custom' && (
          <Input
            value={formData.custom_title}
            onChange={(e) => handleInputChange('custom_title', e.target.value)}
            placeholder="Enter custom service title"
            className="mt-2 h-12 text-base border-2 border-slate-200 focus:border-blue-500 transition-all duration-200"
          />
        )}
        
        {validationErrors.service_title && (
          <p className="text-red-500 text-sm mt-1">{validationErrors.service_title}</p>
        )}
      </div>

      {/* Duration and Price Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="duration" className="text-sm font-medium text-slate-700 mb-2 block">
            Duration *
            <TooltipProvider>
              <Tooltip content="Estimated time to complete the service">
                <HelpCircle className="inline h-4 w-4 ml-1 text-slate-400" />
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Select value={formData.duration} onValueChange={(value) => handleInputChange('duration', value)}>
            <SelectTrigger className={`h-12 border-2 transition-all duration-200 ${
              validationErrors.duration ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}>
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {durationOptions.map(duration => (
                <SelectItem key={duration} value={duration}>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span>{duration}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validationErrors.duration && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.duration}</p>
          )}
        </div>

        <div>
          <Label htmlFor="price" className="text-sm font-medium text-slate-700 mb-2 block">
            Price (OMR) *
            <TooltipProvider>
              <Tooltip content="Set your service pricing">
                <HelpCircle className="inline h-4 w-4 ml-1 text-slate-400" />
              </Tooltip>
            </TooltipProvider>
          </Label>
          <div className="space-y-2">
            <div className="relative">
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                placeholder="0.00"
                className={`h-12 text-base border-2 transition-all duration-200 pl-12 ${
                  validationErrors.price ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                }`}
              />
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 font-medium">OMR</span>
            </div>
            
            {/* Price Type Toggle */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="price-type"
                  checked={formData.price_type === 'starting_from'}
                  onCheckedChange={(checked) => 
                    handleInputChange('price_type', checked ? 'starting_from' : 'fixed')
                  }
                />
                <Label htmlFor="price-type" className="text-sm text-slate-600">
                  Starting from
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="custom-quotation"
                  checked={formData.price_type === 'custom_quotation'}
                  onCheckedChange={(checked) => 
                    handleInputChange('price_type', checked ? 'custom_quotation' : 'fixed')
                  }
                />
                <Label htmlFor="custom-quotation" className="text-sm text-slate-600">
                  Custom quotation
                </Label>
              </div>
            </div>
          </div>
          {validationErrors.price && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.price}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description" className="text-sm font-medium text-slate-700 mb-2 block">
          Description *
          <TooltipProvider>
            <Tooltip content="Describe your service in detail, including scope, value, and compliance notes">
              <HelpCircle className="inline h-4 w-4 ml-1 text-slate-400" />
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Describe your service in detail, including scope, value, and compliance notes..."
          rows={4}
          className={`border-2 transition-all duration-200 resize-none ${
            validationErrors.description ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
          }`}
        />
        <div className="flex justify-between items-center mt-1">
          {validationErrors.description ? (
            <p className="text-red-500 text-sm">{validationErrors.description}</p>
          ) : (
            <p className="text-slate-500 text-sm">Minimum 50 characters</p>
          )}
          <p className="text-slate-400 text-sm">{formData.description.length}/500</p>
        </div>
      </div>

      {/* Company Selection */}
      <div>
        <Label htmlFor="company_id" className="text-sm font-medium text-slate-700 mb-2 block">
          Company Providing Service *
          <TooltipProvider>
            <Tooltip content="Select which company will provide this service">
              <HelpCircle className="inline h-4 w-4 ml-1 text-slate-400" />
            </Tooltip>
          </TooltipProvider>
        </Label>
        {loadingCompanies ? (
          <div className="h-12 border-2 border-slate-200 rounded-md flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-slate-600">Loading companies...</span>
          </div>
        ) : companies.length === 0 ? (
          <div className="h-12 border-2 border-slate-200 rounded-md flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <Building2 className="h-5 w-5 text-slate-400 mx-auto mb-1" />
              <p className="text-slate-600 text-sm">No companies found</p>
              <Link href="/dashboard/company" className="text-blue-600 text-sm hover:underline">
                Create a company first
              </Link>
            </div>
          </div>
        ) : (
          <Select 
            value={formData.company_id} 
            onValueChange={(value) => handleInputChange('company_id', value)}
          >
            <SelectTrigger className={`h-12 border-2 transition-all duration-200 ${
              validationErrors.company_id ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}>
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  <div className="flex items-center space-x-3">
                    {company.logo_url ? (
                      <div className="relative w-6 h-6 rounded overflow-hidden">
                        <Image 
                          src={company.logo_url} 
                          alt={`${company.name} logo`} 
                          fill
                          className="object-cover"
                          sizes="24px"
                        />
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center text-white text-xs font-bold">
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{company.name}</div>
                      {company.industry && (
                        <div className="text-xs text-slate-500">{company.industry}</div>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {validationErrors.company_id && (
          <p className="text-red-500 text-sm mt-1">{validationErrors.company_id}</p>
        )}
      </div>
    </div>
  )

  const renderStep2 = () => (
    <DeliverablesSelector
      categoryId={formData.category_id}
      selectedDeliverables={formData.deliverables}
      onChange={handleDeliverablesChange}
      error={validationErrors.deliverables}
    />
  )

  const renderStep3 = () => (
    <RequirementsSelector
      categoryId={formData.category_id}
      selectedRequirements={formData.requirements}
      onChange={handleRequirementsChange}
      error={validationErrors.requirements}
    />
  )

  const renderStep4 = () => (
    <EnhancedMilestonesEditor
      categoryId={formData.category_id}
      milestones={formData.milestones}
      onChange={handleMilestonesChange}
      error={validationErrors.milestones}
    />
  )

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Eye className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Review & Publish</h3>
        <p className="text-slate-600">
          Review your service details before publishing
        </p>
      </div>

      <Card className="border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Service Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Service Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-slate-500">Service Title</Label>
              <p className="text-slate-900 font-medium">
                {formData.service_title === 'custom' ? formData.custom_title : 
                 serviceTitles.find(t => t.id === formData.service_title)?.title || formData.service_title}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-500">Category</Label>
              <p className="text-slate-900">
                {categories.find(c => c.id === formData.category_id)?.name || 'Not selected'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-500">Duration</Label>
              <p className="text-slate-900">{formData.duration}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-500">Price</Label>
              <p className="text-slate-900 font-medium">
                OMR {formData.price} 
                {formData.price_type === 'starting_from' && ' (starting from)'}
                {formData.price_type === 'custom_quotation' && ' (custom quotation)'}
              </p>
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-slate-500">Description</Label>
            <p className="text-slate-900">{formData.description}</p>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-slate-500">Deliverables ({formData.deliverables.length})</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.deliverables.map((deliverable, index) => (
                <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                  {deliverable}
                </Badge>
              ))}
            </div>
          </div>
          
          {formData.requirements.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-slate-500">Requirements ({formData.requirements.length})</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {Array.isArray(formData.requirements) && formData.requirements.map((requirement, index) => (
                  <Badge key={index} variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                    {requirement}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <Label className="text-sm font-medium text-slate-500">Milestones ({formData.milestones.filter(m => m.title.trim()).length})</Label>
            <div className="space-y-2 mt-2">
              {formData.milestones.filter(m => m.title.trim()).map((milestone, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Badge variant="outline" className="text-xs">
                    {index + 1}
                  </Badge>
                  <div className="flex-1">
                    <div className="font-medium">{milestone.title}</div>
                    {milestone.description && (
                      <div className="text-sm text-slate-500">{milestone.description}</div>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {milestone.estimated_duration} days
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <Label className="text-sm font-medium text-slate-700 mb-2 block">
          Publication Status
        </Label>
        <Select value={formData.status} onValueChange={(value: 'draft' | 'pending_approval' | 'active') => handleInputChange('status', value)}>
          <SelectTrigger className="h-12 border-2 border-slate-200 focus:border-blue-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Save as Draft</SelectItem>
            <SelectItem value="pending_approval">Submit for Approval</SelectItem>
            <SelectItem value="active">Publish Service</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500 mt-2">
          {formData.status === 'draft' 
            ? 'Save as draft to continue editing later' 
            : formData.status === 'pending_approval'
            ? 'Submit for admin approval to make it available to clients'
            : 'Publish immediately to make it available to clients'
          }
        </p>
      </div>
    </div>
  )

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Verifying access...</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/dashboard/services"
              className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors duration-200 mb-6 group"
            >
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
              Back to My Services
            </Link>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-6 shadow-lg">
                <Plus className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                Create Professional Service
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Build a comprehensive service offering with structured categories and professional templates
              </p>
            </div>
          </div>

          {/* Stepper */}
          <Stepper steps={steps} className="mb-8" />

          {/* Form Content */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-slate-900 flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-600" />
                {steps[currentStep - 1]?.title}
              </CardTitle>
              <CardDescription className="text-slate-600">
                {steps[currentStep - 1]?.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
              {currentStep === 5 && renderStep5()}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="h-11 px-6"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                
                {currentStep < 5 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    Next Step
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="h-11 px-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Creating Service...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Create Service
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service Creation Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Professional Service Creation</h4>
                <p className="text-sm text-blue-700">
                  This enhanced form uses professional templates and categories to ensure consistency across all services. 
                  Your service will be structured with proper deliverables, requirements, and milestones for a professional client experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}