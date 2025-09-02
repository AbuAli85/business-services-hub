'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Package, DollarSign, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ServiceRecord {
  id: string
  title: string
  description?: string
  category?: string
  base_price?: number
  currency?: string
  provider_id?: string
  status?: string
}

export default function ServiceDetail() {
  const router = useRouter()
  const params = useParams()
  const serviceId = params?.id as string

  const [service, setService] = useState<ServiceRecord | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!serviceId) return
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/services/${serviceId}`, { cache: 'no-store' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || `Failed to load service (${res.status})`)
        }
        const data = await res.json()
        setService(data?.service ?? null)
      } catch (e: any) {
        setError(e?.message || 'Failed to load service')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [serviceId])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Service Details</h1>
        </div>

        {loading && (
          <Card>
            <CardContent>
              <div className="py-10 text-center text-gray-600">Loading service...</div>
            </CardContent>
          </Card>
        )}

        {!loading && error && (
          <Card>
            <CardContent>
              <div className="py-10 text-center">
                <div className="text-red-600 font-medium mb-2">{error}</div>
                <Button onClick={() => router.push('/services')}>Browse All Services</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && service && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>{service.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {service.description ? (
                  <p className="text-gray-700 whitespace-pre-line">{service.description}</p>
                ) : (
                  <p className="text-gray-500">No description provided.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center text-gray-800">
                    <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                    <span>
                      {service.base_price != null ? service.base_price : 'N/A'} {service.currency || ''}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-800">
                    <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                    <span>Category: {service.category || 'Uncategorized'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={() => router.push('/services')}>Browse All Services</Button>
              <Button variant="secondary" onClick={() => router.push(`/dashboard/services/${service.id}`)}>
                View in Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
