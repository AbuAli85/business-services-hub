'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  DollarSign, 
  Star, 
  CheckCircle, 
  ArrowLeft,
  Package,
  Calendar,
  Users,
  Zap,
  Crown,
  Award
} from 'lucide-react'

interface ServicePackage {
  id: string
  name: string
  description: string
  price: number
  delivery_days: number
  features: string[]
  is_popular?: boolean
  is_premium?: boolean
  service_id: string
  created_at: string
  updated_at: string
}

interface Service {
  id: string
  title: string
  description: string
  base_price: number
  currency: string
  provider_id: string
}

const PACKAGE_TYPES = [
  { id: 'basic', name: 'Basic', icon: Package, color: 'bg-gray-100 text-gray-700' },
  { id: 'standard', name: 'Standard', icon: Star, color: 'bg-blue-100 text-blue-700' },
  { id: 'premium', name: 'Premium', icon: Crown, color: 'bg-purple-100 text-purple-700' },
  { id: 'enterprise', name: 'Enterprise', icon: Award, color: 'bg-gold-100 text-gold-700' }
]

const DELIVERY_OPTIONS = [
  { value: 1, label: '1 day', icon: Zap },
  { value: 3, label: '3 days', icon: Clock },
  { value: 7, label: '1 week', icon: Calendar },
  { value: 14, label: '2 weeks', icon: Calendar },
  { value: 30, label: '1 month', icon: Calendar },
  { value: 60, label: '2 months', icon: Calendar },
  { value: 90, label: '3 months', icon: Calendar }
]

export default function ServicePackagesPage() {
  const params = useParams()
  const router = useRouter()
  const serviceId = params.id as string
  
  const [service, setService] = useState<Service | null>(null)
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null)
  const [newFeature, setNewFeature] = useState('')
  
  const [formData, setFormData] = useState<Partial<ServicePackage>>({
    name: '',
    description: '',
    price: 0,
    delivery_days: 7,
    features: [],
    is_popular: false,
    is_premium: false
  })

  useEffect(() => {
    loadServiceAndPackages()
  }, [serviceId])

  const loadServiceAndPackages = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // Load service details
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single()

      if (serviceError) {
        toast.error('Failed to load service details')
        return
      }

      setService(serviceData)

      // Load service packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('service_packages')
        .select('*')
        .eq('service_id', serviceId)
        .order('price', { ascending: true })

      if (packagesError) {
        toast.error('Failed to load service packages')
        return
      }

      setPackages(packagesData || [])
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.description || formData.price === 0) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const supabase = await getSupabaseClient()
      
      const packageData = {
        ...formData,
        service_id: serviceId,
        features: formData.features || []
      }

      if (editingPackage) {
        // Update existing package
        const { error } = await supabase
          .from('service_packages')
          .update(packageData)
          .eq('id', editingPackage.id)

        if (error) throw error
        
        toast.success('Package updated successfully!')
      } else {
        // Create new package
        const { error } = await supabase
          .from('service_packages')
          .insert([packageData])

        if (error) throw error
        
        toast.success('Package created successfully!')
      }

      // Reset form and reload data
      setFormData({
        name: '',
        description: '',
        price: 0,
        delivery_days: 7,
        features: [],
        is_popular: false,
        is_premium: false
      })
      setShowAddForm(false)
      setEditingPackage(null)
      loadServiceAndPackages()
    } catch (error) {
      toast.error('Failed to save package')
    }
  }

  const handleEdit = (pkg: ServicePackage) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      delivery_days: pkg.delivery_days,
      features: pkg.features,
      is_popular: pkg.is_popular,
      is_premium: pkg.is_premium
    })
    setShowAddForm(true)
  }

  const handleDelete = async (packageId: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('service_packages')
        .delete()
        .eq('id', packageId)

      if (error) throw error
      
      toast.success('Package deleted successfully!')
      loadServiceAndPackages()
    } catch (error) {
      toast.error('Failed to delete package')
    }
  }

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...(prev.features || []), newFeature.trim()]
      }))
      setNewFeature('')
    }
  }

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features?.filter((_, i) => i !== index) || []
    }))
  }

  const formatCurrency = (amount: number, currency: string = 'OMR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const getDeliveryLabel = (days: number) => {
    const option = DELIVERY_OPTIONS.find(opt => opt.value === days)
    return option ? option.label : `${days} days`
  }

  const getPackageType = (pkg: ServicePackage) => {
    if (pkg.is_premium) return PACKAGE_TYPES[3] // Enterprise
    if (pkg.is_popular) return PACKAGE_TYPES[2] // Premium
    if (pkg.price > (service?.base_price || 0) * 1.5) return PACKAGE_TYPES[1] // Standard
    return PACKAGE_TYPES[0] // Basic
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading packages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Service
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Service Packages</h1>
              <p className="text-gray-600 mt-2">
                Manage packages for "{service?.title}" - Create different pricing tiers for your clients
              </p>
            </div>
            
            <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Package
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPackage ? 'Edit Package' : 'Create New Package'}
                  </DialogTitle>
                  <DialogDescription>
                    Create professional service packages with different pricing and delivery options
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Package Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Basic Plan, Premium Package"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="price">Price *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="price"
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                          placeholder="0"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what's included in this package..."
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="delivery_days">Delivery Time</Label>
                    <Select 
                      value={formData.delivery_days?.toString()} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, delivery_days: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select delivery time" />
                      </SelectTrigger>
                      <SelectContent>
                        {DELIVERY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            <div className="flex items-center gap-2">
                              <option.icon className="h-4 w-4" />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Package Features</Label>
                    <div className="space-y-2">
                      {formData.features?.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="flex-1">{feature}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFeature(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <div className="flex gap-2">
                        <Input
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          placeholder="Add a feature..."
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                        />
                        <Button type="button" onClick={addFeature} variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_popular"
                        checked={formData.is_popular}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_popular: e.target.checked }))}
                        className="rounded"
                      />
                      <Label htmlFor="is_popular">Mark as Popular</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_premium"
                        checked={formData.is_premium}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_premium: e.target.checked }))}
                        className="rounded"
                      />
                      <Label htmlFor="is_premium">Mark as Premium</Label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false)
                        setEditingPackage(null)
                        setFormData({
                          name: '',
                          description: '',
                          price: 0,
                          delivery_days: 7,
                          features: [],
                          is_popular: false,
                          is_premium: false
                        })
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      {editingPackage ? 'Update Package' : 'Create Package'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Packages Grid */}
        {packages.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Packages Yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first service package to offer different pricing options to your clients
              </p>
              <Button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Package
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => {
              const packageType = getPackageType(pkg)
              const IconComponent = packageType.icon
              
              return (
                <Card key={pkg.id} className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg ${pkg.is_popular ? 'ring-2 ring-blue-500' : ''}`}>
                  {pkg.is_popular && (
                    <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
                      Most Popular
                    </div>
                  )}
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${packageType.color}`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(pkg)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(pkg.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <CardTitle className="text-xl">{pkg.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {pkg.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">
                        {formatCurrency(pkg.price, service?.currency)}
                      </div>
                      <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mt-1">
                        <Clock className="h-4 w-4" />
                        {getDeliveryLabel(pkg.delivery_days)}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-gray-900">What's Included:</h4>
                      {pkg.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-gray-600">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      {pkg.is_popular && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          <Star className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                      {pkg.is_premium && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                          <Crown className="h-3 w-3 mr-1" />
                          Premium
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}