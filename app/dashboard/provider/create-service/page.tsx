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
  AlertCircle
} from 'lucide-react'

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
}

export default function CreateServicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ServiceFormData>({
    title: '',
    description: '',
    category: '',
    base_price: '',
    currency: 'OMR',
    status: 'draft',
    tags: ''
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

  const handleInputChange = (field: keyof ServiceFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
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
      
      // Validate required fields
      if (!formData.title || !formData.description || !formData.category || !formData.base_price) {
        alert('Please fill in all required fields')
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
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : []
      }

      console.log('Attempting to create service with data:', serviceData)

      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from('services')
        .insert(serviceData)
        .select()

      if (error) {
        console.error('Error creating service:', error)
        console.error('Error details:', error.details)
        console.error('Error hint:', error.hint)
        console.error('Error code:', error.code)
        
        let errorMessage = `Failed to create service: ${error.message}`
        
        if (error.message.includes('row-level security policy')) {
          errorMessage = 'Access denied: Row Level Security policy violation. This usually means the database security policies need to be updated.'
        } else if (error.message.includes('permission denied')) {
          errorMessage = 'Permission denied: You may not have the right permissions to create services.'
        } else if (error.message.includes('column') && error.message.includes('does not exist')) {
          errorMessage = 'Database schema error: Some required columns are missing. Please contact support.'
        } else if (error.message.includes('foreign key constraint')) {
          errorMessage = 'Database constraint error: The user account may not be properly set up.'
        }
        
        alert(errorMessage)
        return
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

                  {/* Enhanced Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-200">
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
