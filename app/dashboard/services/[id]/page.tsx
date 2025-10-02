'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  User,
  Package,
  Star,
  Eye
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'

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

export default function ServiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

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
      
      // Ensure requirements and deliverables are arrays
      const serviceData = {
        ...data,
        requirements: Array.isArray(data.requirements) ? data.requirements : [],
        deliverables: Array.isArray(data.deliverables) ? data.deliverables : []
      }
      
      setService(serviceData)
    } catch (error) {
      console.error('Error loading service:', error)
      toast.error('Failed to load service')
      router.push('/dashboard/services')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    router.push(`/dashboard/services/${params.id}/edit`)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return
    }

    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', params.id)

      if (error) throw error

      toast.success('Service deleted successfully')
      router.push('/dashboard/services')
    } catch (error) {
      console.error('Error deleting service:', error)
      toast.error('Failed to delete service')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )
      case 'inactive':
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            Inactive
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        )
    }
  }

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        )
    }
  }

  const formatCurrency = (amount: number, currency: string = 'OMR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
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
            onClick={() => router.push('/dashboard/services')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{service.title}</h1>
            <p className="text-gray-600">Service Details</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            className="text-red-600 hover:text-red-700"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Service Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600">{service.description}</p>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Category</h4>
                  <p className="text-gray-600">{service.category}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Price</h4>
                  <p className="text-gray-600 font-semibold">
                    {formatCurrency(service.base_price, service.currency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deliverables */}
          {service.deliverables && service.deliverables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Deliverables</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {service.deliverables.map((deliverable, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-gray-700">{deliverable}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Requirements */}
          {Array.isArray(service.requirements) && service.requirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {Array.isArray(service.requirements) && service.requirements.map((requirement, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-gray-700">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Service Status</h4>
                {getStatusBadge(service.status)}
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Approval Status</h4>
                {getApprovalBadge(service.approval_status)}
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-sm text-gray-600">{formatDate(service.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Updated</p>
                  <p className="text-sm text-gray-600">{formatDate(service.updated_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}