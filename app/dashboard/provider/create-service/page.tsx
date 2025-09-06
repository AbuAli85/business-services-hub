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
import { Stepper } from '@/components/ui/stepper'
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'
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
  Eye,
  ArrowRight,
  Clock,
  Target,
  HelpCircle,
  ListChecks,
  Calendar,
  Info
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CreateServiceFormData, ServiceFormStep } from '@/types/services'

// UUID validation utility
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

interface ValidationErrors {
  [key: string]: string
}

export default function CreateServicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  
  const [formData, setFormData] = useState<CreateServiceFormData>({
    // Step 1: Basic Information
    title: '',
    description: '',
    category: 'Digital Marketing',
    duration: '7-14 days',
    price: '',
    deliverables: [''],
    
    // Step 2: Requirements
    requirements: [''],
    
    // Step 3: Milestones Template
    milestones: [
      {
        milestone_title: 'Project Kickoff',
        description: 'Initial consultation and project planning',
        estimated_duration: 2,
        order_index: 1
      }
    ],
    
    // Step 4: Review & Publish
    status: 'draft'
  })

  const steps: ServiceFormStep[] = [
    {
      id: 1,
      title: 'Basic Information',
      description: 'Service details and pricing',
      isCompleted: currentStep > 1,
      isActive: currentStep === 1
    },
    {
      id: 2,
      title: 'Requirements',
      description: 'Client deliverables needed',
      isCompleted: currentStep > 2,
      isActive: currentStep === 2
    },
    {
      id: 3,
      title: 'Milestones Template',
      description: 'Default project milestones',
      isCompleted: currentStep > 3,
      isActive: currentStep === 3
    },
    {
      id: 4,
      title: 'Review & Publish',
      description: 'Final review and submission',
      isCompleted: currentStep > 4,
      isActive: currentStep === 4
    }
  ]

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

  const durationOptions = [
    '1-3 days',
    '3-5 days',
    '7-14 days', 
    '14-21 days',
    '21-30 days',
    '30+ days',
    'Custom timeframe'
  ]

  // Step validation functions
  const validateStep1 = (): ValidationErrors => {
    const errors: ValidationErrors = {}
    
    if (!formData.title.trim()) errors.title = 'Service title is required'
    if (!formData.description.trim()) errors.description = 'Service description is required'
    if (!formData.category) errors.category = 'Category selection is required'
    if (!formData.price || parseFloat(formData.price) <= 0) errors.price = 'Valid price is required'
    if (!formData.duration) errors.duration = 'Duration is required'
    
    // Validate deliverables
    const validDeliverables = formData.deliverables.filter(d => d.trim())
    if (validDeliverables.length === 0) errors.deliverables = 'At least one deliverable is required'
    
    return errors
  }

  const validateStep2 = (): ValidationErrors => {
    const errors: ValidationErrors = {}
    
    // Requirements are optional, but if provided should not be empty
    const validRequirements = formData.requirements.filter(r => r.trim())
    if (formData.requirements.length > 0 && validRequirements.length === 0) {
      errors.requirements = 'Please remove empty requirements or add content'
    }
    
    return errors
  }

  const validateStep3 = (): ValidationErrors => {
    const errors: ValidationErrors = {}
    
    if (formData.milestones.length === 0) {
      errors.milestones = 'At least one milestone is required'
    } else {
      const validMilestones = formData.milestones.filter(m => m.milestone_title.trim())
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

  const handleArrayChange = (field: 'deliverables' | 'requirements', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }))
  }

  const addArrayItem = (field: 'deliverables' | 'requirements') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }))
  }

  const removeArrayItem = (field: 'deliverables' | 'requirements', index: number) => {
    if (formData[field].length > 1) {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index)
      }))
    }
  }

  const handleMilestoneChange = (index: number, field: keyof CreateServiceFormData['milestones'][0], value: string | number) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map((milestone, i) => 
        i === index ? { ...milestone, [field]: value } : milestone
      )
    }))
  }

  const addMilestone = () => {
    setFormData(prev => ({
      ...prev,
      milestones: [...prev.milestones, {
        milestone_title: '',
        description: '',
        estimated_duration: 7,
        order_index: prev.milestones.length + 1
      }]
    }))
  }

  const removeMilestone = (index: number) => {
    if (formData.milestones.length > 1) {
      setFormData(prev => ({
        ...prev,
        milestones: prev.milestones.filter((_, i) => i !== index)
          .map((milestone, i) => ({ ...milestone, order_index: i + 1 }))
      }))
    }
  }

  // Navigation functions
  const nextStep = () => {
    if (validateCurrentStep() && currentStep < 4) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
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

  const handleSubmit = async () => {
    setLoading(true)

    try {
      // Get and validate current user
      const user = await validateUser()
      if (!user) return
      
      // Final validation of all steps
      const step1Errors = validateStep1()
      const step2Errors = validateStep2()
      const step3Errors = validateStep3()
      
      const allErrors = { ...step1Errors, ...step2Errors, ...step3Errors }
      if (Object.keys(allErrors).length > 0) {
        setValidationErrors(allErrors)
        alert('Please fix all validation errors before submitting')
        return
      }

      const supabase = await getSupabaseClient()

      // Create service with new schema
      const serviceData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        base_price: parseFloat(formData.price),
        currency: 'OMR',
        status: formData.status === 'pending_approval' ? 'pending_approval' : 'draft',
        provider_id: user.id,
        duration: formData.duration,
        deliverables: formData.deliverables.filter(d => d.trim())
      }

      const { data: service, error: serviceError } = await supabase
        .from('services')
        .insert(serviceData)
        .select()
        .single()

      if (serviceError) {
        console.error('Error creating service:', serviceError)
        alert('Failed to create service: ' + serviceError.message)
        return
      }

      // Create service requirements
      if (formData.requirements.some(r => r.trim())) {
        const requirementsData = formData.requirements
          .filter(r => r.trim())
          .map((requirement, index) => ({
            service_id: service.id,
            requirement,
            is_required: true,
            order_index: index + 1
          }))

        const { error: requirementsError } = await supabase
          .from('service_requirements')
          .insert(requirementsData)

        if (requirementsError) {
          console.error('Error creating requirements:', requirementsError)
        }
      }

      // Create service milestones
      const milestonesData = formData.milestones
        .filter(m => m.milestone_title.trim())
        .map((milestone, index) => ({
          service_id: service.id,
          milestone_title: milestone.milestone_title,
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

      alert('Service created successfully!')
      router.push('/dashboard/provider/provider-services')
    } catch (error) {
      console.error('Error creating service:', error)
      alert('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Step components
  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Service Title */}
      <div>
        <Label htmlFor="title" className="text-sm font-medium text-slate-700 mb-2 block">
          Service Title *
          <TooltipProvider>
            <Tooltip content="Choose a clear, descriptive title that clients will easily understand">
              <HelpCircle className="inline h-4 w-4 ml-1 text-slate-400" />
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="e.g., Digital Marketing Campaign"
          className={`h-12 text-base border-2 transition-all duration-200 ${
            validationErrors.title ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
          }`}
        />
        {validationErrors.title && (
          <p className="text-red-500 text-sm mt-1">{validationErrors.title}</p>
        )}
      </div>

      {/* Category and Duration Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="category" className="text-sm font-medium text-slate-700 mb-2 block">
            Category *
          </Label>
          <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
            <SelectTrigger className={`h-12 border-2 transition-all duration-200 ${
              validationErrors.category ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}>
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
          {validationErrors.category && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.category}</p>
          )}
        </div>

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
                  {duration}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validationErrors.duration && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.duration}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description" className="text-sm font-medium text-slate-700 mb-2 block">
          Description *
          <TooltipProvider>
            <Tooltip content="Describe your service in detail, including what clients can expect">
              <HelpCircle className="inline h-4 w-4 ml-1 text-slate-400" />
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Describe your service in detail, including what clients can expect, deliverables, and unique value propositions..."
          rows={4}
          className={`border-2 transition-all duration-200 resize-none ${
            validationErrors.description ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
          }`}
        />
        {validationErrors.description && (
          <p className="text-red-500 text-sm mt-1">{validationErrors.description}</p>
        )}
      </div>

      {/* Price */}
      <div>
        <Label htmlFor="price" className="text-sm font-medium text-slate-700 mb-2 block">
          Price (OMR) *
        </Label>
        <div className="relative max-w-xs">
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
          <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
        </div>
        {validationErrors.price && (
          <p className="text-red-500 text-sm mt-1">{validationErrors.price}</p>
        )}
      </div>

      {/* Deliverables */}
      <div>
        <Label className="text-sm font-medium text-slate-700 mb-2 block">
          Deliverables *
          <TooltipProvider>
            <Tooltip content="List what clients will receive upon completion">
              <HelpCircle className="inline h-4 w-4 ml-1 text-slate-400" />
            </Tooltip>
          </TooltipProvider>
        </Label>
        <div className="space-y-3">
          {formData.deliverables.map((deliverable, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-1">
                <Input
                  value={deliverable}
                  onChange={(e) => handleArrayChange('deliverables', index, e.target.value)}
                  placeholder="e.g., Marketing strategy document"
                  className="h-11 border-2 border-slate-200 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              {formData.deliverables.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeArrayItem('deliverables', index)}
                  className="h-11 w-11 p-0 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addArrayItem('deliverables')}
            className="h-11 px-4 border-dashed border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Deliverable
          </Button>
        </div>
        {validationErrors.deliverables && (
          <p className="text-red-500 text-sm mt-1">{validationErrors.deliverables}</p>
        )}
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <ListChecks className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Client Requirements</h3>
        <p className="text-slate-600">
          What information or materials do clients need to provide for a successful project?
        </p>
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700 mb-2 block">
          Requirements (Optional)
          <TooltipProvider>
            <Tooltip content="Help clients understand what they need to prepare">
              <HelpCircle className="inline h-4 w-4 ml-1 text-slate-400" />
            </Tooltip>
          </TooltipProvider>
        </Label>
        <div className="space-y-2">
          {formData.requirements.map((requirement, index) => (
            <div key={index} className="flex items-center gap-2">
              <Textarea
                value={requirement}
                onChange={(e) => handleArrayChange('requirements', index, e.target.value)}
                placeholder="e.g., Brand guidelines, target audience information, project timeline..."
                rows={2}
                className="border-2 border-slate-200 focus:border-blue-500 transition-all duration-200 resize-none"
              />
              {formData.requirements.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeArrayItem('requirements', index)}
                  className="h-10 w-10 p-0 border-red-200 text-red-600 hover:bg-red-50 self-start mt-1"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addArrayItem('requirements')}
            className="h-10 px-3 border-dashed border-slate-300 text-slate-600 hover:border-slate-400"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Requirement
          </Button>
        </div>
        {validationErrors.requirements && (
          <p className="text-red-500 text-sm mt-1">{validationErrors.requirements}</p>
        )}
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Target className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Milestones Template</h3>
        <p className="text-slate-600">
          Define default milestones that will be automatically created for each booking
        </p>
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700 mb-4 block">
          Project Milestones *
        </Label>
        <div className="space-y-4">
          {formData.milestones.map((milestone, index) => (
            <Card key={index} className="border-2 border-slate-200 hover:border-slate-300 transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline">Milestone {index + 1}</Badge>
                  {formData.milestones.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeMilestone(index)}
                      className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2 block">
                      Milestone Title *
                    </Label>
                    <Input
                      value={milestone.milestone_title}
                      onChange={(e) => handleMilestoneChange(index, 'milestone_title', e.target.value)}
                      placeholder="e.g., Project Kickoff"
                      className="h-10 border-2 border-slate-200 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2 block">
                      Estimated Duration (days)
                      <TooltipProvider>
                        <Tooltip content="How many days this milestone typically takes">
                          <HelpCircle className="inline h-4 w-4 ml-1 text-slate-400" />
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={milestone.estimated_duration}
                      onChange={(e) => handleMilestoneChange(index, 'estimated_duration', parseInt(e.target.value) || 1)}
                      className="h-10 border-2 border-slate-200 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">
                    Description
                  </Label>
                  <Textarea
                    value={milestone.description}
                    onChange={(e) => handleMilestoneChange(index, 'description', e.target.value)}
                    placeholder="Describe what happens in this milestone..."
                    rows={2}
                    className="border-2 border-slate-200 focus:border-blue-500 transition-all duration-200 resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={addMilestone}
            className="w-full h-12 border-dashed border-slate-300 text-slate-600 hover:border-slate-400"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Milestone
          </Button>
        </div>
        {validationErrors.milestones && (
          <p className="text-red-500 text-sm mt-1">{validationErrors.milestones}</p>
        )}
      </div>
    </div>
  )

  const renderStep4 = () => (
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
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-slate-500">Title</Label>
              <p className="text-slate-900 font-medium">{formData.title || 'Not specified'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-500">Category</Label>
              <p className="text-slate-900">{formData.category}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-500">Duration</Label>
              <p className="text-slate-900">{formData.duration}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-500">Price</Label>
              <p className="text-slate-900 font-medium">OMR {formData.price || '0.00'}</p>
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-slate-500">Description</Label>
            <p className="text-slate-900">{formData.description || 'Not specified'}</p>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-slate-500">Deliverables ({formData.deliverables.filter(d => d.trim()).length})</Label>
            <ul className="list-disc list-inside text-slate-900 space-y-1">
              {formData.deliverables.filter(d => d.trim()).map((deliverable, index) => (
                <li key={index}>{deliverable}</li>
              ))}
            </ul>
          </div>
          
          {formData.requirements.some(r => r.trim()) && (
            <div>
              <Label className="text-sm font-medium text-slate-500">Requirements ({formData.requirements.filter(r => r.trim()).length})</Label>
              <ul className="list-disc list-inside text-slate-900 space-y-1">
                {formData.requirements.filter(r => r.trim()).map((requirement, index) => (
                  <li key={index}>{requirement}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div>
            <Label className="text-sm font-medium text-slate-500">Milestones ({formData.milestones.filter(m => m.milestone_title.trim()).length})</Label>
            <div className="space-y-2">
              {formData.milestones.filter(m => m.milestone_title.trim()).map((milestone, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span className="font-medium">{milestone.milestone_title}</span>
                  <span className="text-slate-500">({milestone.estimated_duration} days)</span>
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
        <Select value={formData.status} onValueChange={(value: 'draft' | 'pending_approval') => handleInputChange('status', value)}>
          <SelectTrigger className="h-12 border-2 border-slate-200 focus:border-blue-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Save as Draft</SelectItem>
            <SelectItem value="pending_approval">Submit for Approval</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500 mt-2">
          {formData.status === 'draft' 
            ? 'Save as draft to continue editing later' 
            : 'Submit for admin approval to make it available to clients'
          }
        </p>
      </div>
    </div>
  )

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/dashboard/provider/provider-services"
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
                Create New Service
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Build a comprehensive service offering with milestones and requirements
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
                
                {currentStep < 4 ? (
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

          {/* Service Approval Process Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Service Approval Process</h4>
                <p className="text-sm text-blue-700">
                  Your service will be reviewed by our admin team before being published. This usually takes 1-2 business days. 
                  You'll receive an email notification once your service is approved or if any changes are needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}