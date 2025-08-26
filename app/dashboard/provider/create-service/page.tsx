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
import { ArrowLeft, Save, Plus } from 'lucide-react'

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
    status: 'draft'
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
    'Content Creation'
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
        provider_id: user.id, // Now guaranteed to be a valid UUID
        approval_status: 'pending' // Now safe to include with the migration
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
                     <Link 
             href="/dashboard/provider/my-services"
             className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
           >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Services
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Service</h1>
          <p className="text-gray-600">Add a new service to your portfolio</p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
            <CardDescription>
              Fill in the details below to create your new service
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label htmlFor="title">Service Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g., Digital Marketing Campaign"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your service in detail..."
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
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
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(status => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="base_price">Base Price *</Label>
                  <Input
                    id="base_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.base_price}
                    onChange={(e) => handleInputChange('base_price', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                    <SelectTrigger>
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

              {/* Actions */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Link href="/dashboard/provider/provider-services">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Service
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
