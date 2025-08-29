'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  Trash2, 
  Upload, 
  Package,
  Save,
  Eye,
  ArrowLeft
} from 'lucide-react'
import { toast } from 'react-hot-toast'

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
  status: string
  approval_status: string
}

const CATEGORIES = [
  'web-development', 'mobile-development', 'design', 'marketing',
  'consulting', 'translation', 'legal-services', 'accounting'
]

const CURRENCIES = ['USD', 'EUR', 'GBP', 'OMR', 'AED', 'SAR', 'QAR', 'BHD', 'KWD']

export default function EditServicePage() {
  const params = useParams()
  const router = useRouter()
  const serviceId = params.id as string
  
  const [formData, setFormData] = useState<ServiceForm>({
    title: '', description: '', category: '', base_price: 0,
    currency: 'USD', cover_image_url: '', tags: [], packages: [],
    terms_conditions: '', cancellation_policy: '', status: 'draft',
    approval_status: 'pending'
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [newTag, setNewTag] = useState('')
  const [newPackage, setNewPackage] = useState<Partial<ServicePackage>>({
    name: '', description: '', price: 0, delivery_days: 1,
    revisions: 1, features: []
  })

  useEffect(() => {
    loadService()
  }, [serviceId])

  const loadService = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user || user.user_metadata?.role !== 'provider') {
        router.push('/dashboard')
        return
      }

      setUser(user)

      const { data: service, error } = await supabase
        .from('services')
        .select('*, service_packages (*)')
        .eq('id', serviceId)
        .eq('provider_id', user.id)
        .single()

      if (error) throw error

      setFormData({
        title: service.title || '',
        description: service.description || '',
        category: service.category || '',
        base_price: service.base_price || 0,
        currency: service.currency || 'USD',
        cover_image_url: service.cover_image_url || '',
        tags: service.tags || [],
        packages: service.service_packages || [],
        terms_conditions: service.terms_conditions || '',
        cancellation_policy: service.cancellation_policy || '',
        status: service.status || 'draft',
        approval_status: service.approval_status || 'pending'
      })

    } catch (error) {
      console.error('Error loading service:', error)
      toast.error('Failed to load service')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof ServiceForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }))
  }

  const addPackage = () => {
    if (newPackage.name && newPackage.description && newPackage.price !== undefined) {
      const packageToAdd: ServicePackage = {
        id: `temp-${Date.now()}`,
        name: newPackage.name,
        description: newPackage.description,
        price: newPackage.price,
        delivery_days: newPackage.delivery_days || 1,
        revisions: newPackage.revisions || 1,
        features: newPackage.features || []
      }
      
      setFormData(prev => ({ ...prev, packages: [...prev.packages, packageToAdd] }))
      setNewPackage({
        name: '', description: '', price: 0, delivery_days: 1,
        revisions: 1, features: []
      })
    }
  }

  const removePackage = (packageId: string) => {
    setFormData(prev => ({ ...prev, packages: prev.packages.filter(pkg => pkg.id !== packageId) }))
  }

  const saveService = async () => {
    if (!formData.title || !formData.description || formData.packages.length === 0) {
      toast.error('Please fill in all required fields and add at least one package')
      return
    }

    setSaving(true)
    try {
      const supabase = await getSupabaseClient()
      
      const { error: serviceError } = await supabase
        .from('services')
        .update({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          base_price: formData.base_price,
          currency: formData.currency,
          cover_image_url: formData.cover_image_url,
          tags: formData.tags,
          terms_conditions: formData.terms_conditions,
          cancellation_policy: formData.cancellation_policy,
          status: formData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)

      if (serviceError) throw serviceError

      if (formData.packages.length > 0) {
        await supabase
          .from('service_packages')
          .delete()
          .eq('service_id', serviceId)

        const packagesToInsert = formData.packages.map(pkg => ({
          service_id: serviceId,
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

      toast.success('Service updated successfully')
      router.push('/dashboard/services')
    } catch (error) {
      console.error('Error updating service:', error)
      toast.error('Failed to update service')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading service...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Service</h1>
            <p className="text-gray-600 mt-2">Update your service information and packages</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push(`/services/${serviceId}`)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={saveService} disabled={saving}>
            {saving ? 'Saving...' : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Service Form */}
      <Card>
        <CardHeader>
          <CardTitle>Service Information</CardTitle>
          <CardDescription>Update your service details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Service Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter service title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your service in detail"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="base_price">Base Price *</Label>
              <Input
                id="base_price"
                type="number"
                value={formData.base_price}
                onChange={(e) => handleInputChange('base_price', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
              />
              <Button type="button" onClick={addTag} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                  {tag} ×
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="approval_status">Approval Status</Label>
              <Select value={formData.approval_status} onValueChange={(value) => handleInputChange('approval_status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Packages */}
      <Card>
        <CardHeader>
          <CardTitle>Service Packages</CardTitle>
          <CardDescription>Manage your service packages and pricing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Package */}
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Add New Package</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Package Name *</Label>
                <Input
                  value={newPackage.name}
                  onChange={(e) => setNewPackage(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Basic, Professional, Enterprise"
                />
              </div>
              <div className="space-y-2">
                <Label>Price *</Label>
                <Input
                  type="number"
                  value={newPackage.price}
                  onChange={(e) => setNewPackage(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={newPackage.description}
                onChange={(e) => setNewPackage(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what's included in this package"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Delivery Days</Label>
                <Input
                  type="number"
                  value={newPackage.delivery_days}
                  onChange={(e) => setNewPackage(prev => ({ ...prev, delivery_days: parseInt(e.target.value) || 1 }))}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Revisions</Label>
                <Input
                  type="number"
                  value={newPackage.revisions}
                  onChange={(e) => setNewPackage(prev => ({ ...prev, revisions: parseInt(e.target.value) || 1 }))}
                  min="0"
                />
              </div>
            </div>

            <Button onClick={addPackage} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Package
            </Button>
          </div>

          {/* Existing Packages */}
          <div className="space-y-4">
            <h4 className="font-medium">Current Packages</h4>
            {formData.packages.map((pkg) => (
              <Card key={pkg.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h5 className="font-medium">{pkg.name}</h5>
                    <p className="text-sm text-gray-600">{pkg.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>${pkg.price}</span>
                      <span>{pkg.delivery_days} days</span>
                      <span>{pkg.revisions} revisions</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removePackage(pkg.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
            
            {formData.packages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No packages added yet. Add your first package above.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Terms & Conditions */}
      <Card>
        <CardHeader>
          <CardTitle>Terms & Conditions</CardTitle>
          <CardDescription>Set clear expectations for your clients</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Textarea
              id="terms"
              value={formData.terms_conditions}
              onChange={(e) => handleInputChange('terms_conditions', e.target.value)}
              placeholder="Define your service terms, what's included, and what's not..."
              rows={6}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cancellation">Cancellation Policy</Label>
            <Textarea
              id="cancellation"
              value={formData.cancellation_policy}
              onChange={(e) => handleInputChange('cancellation_policy', e.target.value)}
              placeholder="Explain your cancellation and refund policies..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
