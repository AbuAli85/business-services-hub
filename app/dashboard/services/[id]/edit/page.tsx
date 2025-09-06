'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ArrowLeft,
  Save,
  X
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

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
}

export default function EditServicePage() {
  const params = useParams()
  const router = useRouter()
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    base_price: 0,
    currency: 'OMR',
    category: '',
    status: 'active',
    deliverables: [] as string[],
    requirements: [] as string[]
  })

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
        deliverables: data.deliverables || [],
        requirements: data.requirements || []
      })
    } catch (error) {
      console.error('Error loading service:', error)
      toast.error('Failed to load service')
      router.push('/dashboard/services')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleDeliverableAdd = () => {
    const input = document.getElementById('deliverable-input') as HTMLInputElement
    if (input.value.trim()) {
      setFormData(prev => ({
        ...prev,
        deliverables: [...prev.deliverables, input.value.trim()]
      }))
      input.value = ''
    }
  }

  const handleDeliverableRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index)
    }))
  }

  const handleRequirementAdd = () => {
    const input = document.getElementById('requirement-input') as HTMLInputElement
    if (input.value.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, input.value.trim()]
      }))
      input.value = ''
    }
  }

  const handleRequirementRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }))
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a service title')
      return
    }

    if (!formData.description.trim()) {
      toast.error('Please enter a service description')
      return
    }

    if (formData.base_price <= 0) {
      toast.error('Please enter a valid price')
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
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)

      if (error) throw error

      toast.success('Service updated successfully')
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/services/${params.id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Service</h1>
            <p className="text-gray-600">Update your service information</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/services/${params.id}`)}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Update the basic details of your service</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Service Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter service title"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your service"
                className="mt-1"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.base_price}
                  onChange={(e) => handleInputChange('base_price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                  <SelectTrigger className="mt-1">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  placeholder="Enter category"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deliverables and Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Deliverables & Requirements</CardTitle>
            <CardDescription>What you'll deliver and what you need from clients</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Deliverables */}
            <div>
              <Label>Deliverables</Label>
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="deliverable-input"
                    placeholder="Add deliverable"
                    onKeyPress={(e) => e.key === 'Enter' && handleDeliverableAdd()}
                  />
                  <Button type="button" onClick={handleDeliverableAdd} size="sm">
                    Add
                  </Button>
                </div>
                <div className="space-y-1">
                  {formData.deliverables.map((deliverable, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm">{deliverable}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeliverableRemove(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div>
              <Label>Requirements</Label>
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="requirement-input"
                    placeholder="Add requirement"
                    onKeyPress={(e) => e.key === 'Enter' && handleRequirementAdd()}
                  />
                  <Button type="button" onClick={handleRequirementAdd} size="sm">
                    Add
                  </Button>
                </div>
                <div className="space-y-1">
                  {formData.requirements.map((requirement, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm">{requirement}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRequirementRemove(index)}
                        className="text-red-600 hover:text-red-700"
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
      </div>
    </div>
  )
}