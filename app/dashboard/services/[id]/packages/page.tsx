'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  DollarSign, 
  Calendar, 
  CheckCircle,
  XCircle,
  Save,
  Eye,
  Copy,
  Star,
  Zap,
  Clock,
  Users
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

interface ServicePackage {
  id: string
  name: string
  description: string
  price: number
  delivery_days: number
  revisions: number
  features: string[]
  is_popular?: boolean
  is_featured?: boolean
}

interface Service {
  id: string
  title: string
  currency: string
}

export default function ServicePackagesPage() {
  const params = useParams()
  const router = useRouter()
  const serviceId = params.id as string
  
  const [service, setService] = useState<Service | null>(null)
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newFeature, setNewFeature] = useState('')
  
  const [formData, setFormData] = useState<Partial<ServicePackage>>({
    name: '',
    description: '',
    price: 0,
    delivery_days: 1,
    revisions: 1,
    features: [],
    is_popular: false,
    is_featured: false
  })

  useEffect(() => {
    loadServiceAndPackages()
  }, [serviceId])

  const loadServiceAndPackages = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // Check user authentication
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      // Check if user is a provider
      if (user.user_metadata?.role !== 'provider') {
        router.push('/dashboard')
        return
      }

      // Fetch service details
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('id, title, currency')
        .eq('id', serviceId)
        .eq('provider_id', user.id)
        .single()

      if (serviceError) throw serviceError
      setService(serviceData)

      // Fetch service packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('service_packages')
        .select('*')
        .eq('service_id', serviceId)
        .order('price', { ascending: true })

      if (packagesError) throw packagesError
      setPackages(packagesData || [])

    } catch (error) {
      console.error('Error loading service and packages:', error)
      toast.error('Failed to load service packages')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof ServicePackage, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addFeature = () => {
    if (newFeature.trim() && !formData.features?.includes(newFeature.trim())) {
      setFormData(prev => ({ 
        ...prev, 
        features: [...(prev.features || []), newFeature.trim()] 
      }))
      setNewFeature('')
    }
  }

  const removeFeature = (featureToRemove: string) => {
    setFormData(prev => ({ 
      ...prev, 
      features: prev.features?.filter(f => f !== featureToRemove) || [] 
    }))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      delivery_days: 1,
      revisions: 1,
      features: [],
      is_popular: false,
      is_featured: false
    })
    setEditingPackage(null)
    setShowAddForm(false)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.description || formData.price === undefined) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const supabase = await getSupabaseClient()
      
      if (editingPackage) {
        // Update existing package
        const { error } = await supabase
          .from('service_packages')
          .update({
            name: formData.name,
            description: formData.description,
            price: formData.price,
            delivery_days: formData.delivery_days,
            revisions: formData.revisions,
            features: formData.features,
            is_popular: formData.is_popular,
            is_featured: formData.is_featured,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPackage.id)

        if (error) throw error
        toast.success('Package updated successfully')
      } else {
        // Create new package
        const { error } = await supabase
          .from('service_packages')
          .insert({
            service_id: serviceId,
            name: formData.name,
            description: formData.description,
            price: formData.price,
            delivery_days: formData.delivery_days,
            revisions: formData.revisions,
            features: formData.features,
            is_popular: formData.is_popular,
            is_featured: formData.is_featured
          })

        if (error) throw error
        toast.success('Package created successfully')
      }

      resetForm()
      loadServiceAndPackages()
    } catch (error) {
      console.error('Error saving package:', error)
      toast.error('Failed to save package')
    }
  }

  const editPackage = (pkg: ServicePackage) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      delivery_days: pkg.delivery_days,
      revisions: pkg.revisions,
      features: pkg.features,
      is_popular: pkg.is_popular,
      is_featured: pkg.is_featured
    })
    setShowAddForm(true)
  }

  const duplicatePackage = async (pkg: ServicePackage) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('service_packages')
        .insert({
          service_id: serviceId,
          name: `${pkg.name} (Copy)`,
          description: pkg.description,
          price: pkg.price,
          delivery_days: pkg.delivery_days,
          revisions: pkg.revisions,
          features: pkg.features,
          is_popular: false,
          is_featured: false
        })

      if (error) throw error
      toast.success('Package duplicated successfully')
      loadServiceAndPackages()
    } catch (error) {
      console.error('Error duplicating package:', error)
      toast.error('Failed to duplicate package')
    }
  }

  const deletePackage = async (packageId: string) => {
    if (!confirm('Are you sure you want to delete this package? This action cannot be undone.')) {
      return
    }

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('service_packages')
        .delete()
        .eq('id', packageId)

      if (error) throw error
      toast.success('Package deleted successfully')
      loadServiceAndPackages()
    } catch (error) {
      console.error('Error deleting package:', error)
      toast.error('Failed to delete package')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading packages...</p>
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-gray-600">Service not found</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Service Packages</h1>
            <p className="text-gray-600 mt-2">{service.title}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push(`/services/${serviceId}`)}>
            <Eye className="h-4 w-4 mr-2" />
            View Service
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Package
          </Button>
        </div>
      </div>

      {/* Add/Edit Package Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingPackage ? 'Edit Package' : 'Add New Package'}
            </CardTitle>
            <CardDescription>
              {editingPackage ? 'Update package details' : 'Create a new service package'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Package Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Basic, Professional, Enterprise"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what's included in this package"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="delivery_days">Delivery Days</Label>
                <Input
                  id="delivery_days"
                  type="number"
                  value={formData.delivery_days}
                  onChange={(e) => handleInputChange('delivery_days', parseInt(e.target.value) || 1)}
                  min="1"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="revisions">Revisions</Label>
                <Input
                  id="revisions"
                  type="number"
                  value={formData.revisions}
                  onChange={(e) => handleInputChange('revisions', parseInt(e.target.value) || 1)}
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Features</Label>
              <div className="flex gap-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="Add a feature"
                  onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                />
                <Button type="button" onClick={addFeature} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.features?.map((feature, index) => (
                  <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeFeature(feature)}>
                    {feature} ×
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_popular"
                  checked={formData.is_popular}
                  onChange={(e) => handleInputChange('is_popular', e.target.checked)}
                  className="rounded"
                  title="Mark this package as popular"
                  aria-label="Mark this package as popular"
                />
                <Label htmlFor="is_popular">Mark as Popular</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={formData.is_featured}
                  onChange={(e) => handleInputChange('is_featured', e.target.checked)}
                  className="rounded"
                  title="Mark this package as featured"
                  aria-label="Mark this package as featured"
                />
                <Label htmlFor="is_featured">Mark as Featured</Label>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSubmit}>
                <Save className="h-4 w-4 mr-2" />
                {editingPackage ? 'Update Package' : 'Create Package'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Packages List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Current Packages ({packages.length})</h2>
          {packages.length > 0 && (
            <Button variant="outline" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Another Package
            </Button>
          )}
        </div>

        {packages.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No packages yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first service package to start offering different pricing tiers to clients.
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Package
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <Card key={pkg.id} className={`relative ${pkg.is_popular ? 'ring-2 ring-blue-500' : ''}`}>
                {pkg.is_popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  </div>
                )}
                
                {pkg.is_featured && (
                  <div className="absolute -top-3 right-3">
                    <Badge variant="secondary">
                      <Zap className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      <div className="text-2xl font-bold text-blue-600 mt-2">
                        {formatCurrency(pkg.price, service.currency)}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-gray-600 text-sm">{pkg.description}</p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{pkg.delivery_days} days</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4" />
                      <span>{pkg.revisions} revisions</span>
                    </div>
                  </div>

                  {pkg.features.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Features:</Label>
                      <div className="space-y-1">
                        {pkg.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editPackage(pkg)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicatePackage(pkg)}
                      className="flex-1"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Duplicate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deletePackage(pkg.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Package Tips */}
      {packages.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-blue-900 mb-2">Package Management Tips</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Create 3-4 packages with clear value progression</li>
                  <li>• Use the "Popular" badge for your best-selling package</li>
                  <li>• Feature packages with the highest profit margins</li>
                  <li>• Keep feature lists concise and benefit-focused</li>
                  <li>• Price packages to encourage upgrades</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
