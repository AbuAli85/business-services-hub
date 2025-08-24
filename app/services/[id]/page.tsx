'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Service {
  id: string
  title: string
  description: string
  category: string
  status: string
  base_price: number
  currency: string
  cover_image_url: string
  created_at: string
  provider_id: string
}

export default function ServiceDetailPage() {
  const params = useParams()
  const serviceId = params.id as string
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchService() {
      try {
        const supabase = await getSupabaseClient()
        
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .single()

        if (error) {
          throw error
        }

        setService(data)
      } catch (err) {
        console.error('Error fetching service:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch service')
      } finally {
        setLoading(false)
      }
    }

    if (serviceId) {
      fetchService()
    }
  }, [serviceId])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (error || !service) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Service Not Found</CardTitle>
            <CardDescription>
              {error || 'The service you are looking for could not be found.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Service Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {service.provider_id && (
              <img 
                src={`/api/providers/${service.provider_id}/logo`} 
                alt={`Provider Logo`}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{service.title}</h1>
              <p className="text-gray-600">
                by {service.provider_id ? 'Provider' : 'Unknown Provider'}
                {service.provider_id && ` • ${service.provider_id}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
              {service.status}
            </Badge>
            <Badge variant="outline">{service.category}</Badge>
            <div className="text-2xl font-bold text-green-600">
              {service.base_price} {service.currency}
            </div>
          </div>
        </div>

        {/* Service Image */}
        {service.cover_image_url && (
          <div className="mb-8">
            <img 
              src={service.cover_image_url} 
              alt={service.title}
              className="w-full h-64 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Service Description */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">
              {service.description || 'No description available for this service.'}
            </p>
          </CardContent>
        </Card>

        {/* Service Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold text-gray-600">Category:</span>
                <p className="text-gray-900">{service.category}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Status:</span>
                <p className="text-gray-900">{service.status}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Base Price:</span>
                <p className="text-gray-900">{service.base_price} {service.currency}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Created:</span>
                <p className="text-gray-900">
                  {new Date(service.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button size="lg" className="flex-1">
            Book This Service
          </Button>
          <Button size="lg" variant="outline">
            Contact Provider
          </Button>
        </div>
      </div>
    </div>
  )
}
