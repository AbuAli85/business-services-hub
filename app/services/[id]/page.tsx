'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Package, DollarSign, Building2, User as UserIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

interface ServiceRecord {
  id: string
  title: string
  description?: string
  category?: string
  base_price?: number
  currency?: string
  provider_id?: string
  status?: string
  service_packages?: { id: string; name: string; description?: string; price: number; features?: string[] }[]
  provider?: { id: string; full_name?: string; email?: string; phone?: string; company_name?: string; avatar_url?: string } | null
}

export default function ServiceDetail() {
  const router = useRouter()
  const params = useParams()
  const serviceId = params?.id as string

  const [service, setService] = useState<ServiceRecord | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [scheduledDate, setScheduledDate] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [selectedPackageId, setSelectedPackageId] = useState<string>('')
  const [isBooking, setIsBooking] = useState<boolean>(false)

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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="outline" onClick={() => router.back()} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="hidden sm:flex gap-2">
            <Button onClick={() => router.push('/services')}>Browse All Services</Button>
            <Button variant="secondary" onClick={() => service && router.push(`/dashboard/services/${service.id}`)}>View in Dashboard</Button>
          </div>
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
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      <span className="text-xl">{service.title}</span>
                    </CardTitle>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <Badge variant="secondary">{service.category || 'Uncategorized'}</Badge>
                      {service.currency && (
                        <Badge variant="outline">Base {service.base_price ?? 0} {service.currency}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {service.description ? (
                  <p className="text-gray-700 whitespace-pre-line leading-7">{service.description}</p>
                ) : (
                  <p className="text-gray-500">No description provided.</p>
                )}
              </CardContent>
            </Card>

            {service.provider && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserIcon className="h-5 w-5" />
                    <span>Provider</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-gray-800">
                    <div className="font-medium">{service.provider.full_name || 'Service Provider'}</div>
                    {service.provider.company_name && (
                      <div className="text-gray-600">{service.provider.company_name}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-0">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center rounded-md border bg-white p-3">
                    <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                    <div>
                      <div className="text-xs text-gray-500">Starting at</div>
                      <div className="text-gray-900 font-medium">{service.base_price != null ? service.base_price : 'N/A'} {service.currency || ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center rounded-md border bg-white p-3">
                    <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                    <div>
                      <div className="text-xs text-gray-500">Category</div>
                      <div className="text-gray-900 font-medium">{service.category || 'Uncategorized'}</div>
                    </div>
                  </div>
                  <div className="flex items-center rounded-md border bg-white p-3">
                    <UserIcon className="h-4 w-4 mr-2 text-gray-500" />
                    <div>
                      <div className="text-xs text-gray-500">Provider</div>
                      <div className="text-gray-900 font-medium">{service.provider?.full_name || 'Service Provider'}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {Array.isArray(service.service_packages) && service.service_packages.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Packages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {service.service_packages.map((pkg) => (
                      <button
                        type="button"
                        key={pkg.id}
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`text-left rounded-lg border p-4 transition ${selectedPackageId === pkg.id ? 'border-blue-600 ring-2 ring-blue-100' : 'hover:border-gray-400'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">{pkg.name}</div>
                          <div className="text-gray-900">{pkg.price} {service.currency || 'OMR'}</div>
                        </div>
                        {pkg.description && <div className="mt-2 text-sm text-gray-600">{pkg.description}</div>}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Simple booking form */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Book This Service</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.isArray(service.service_packages) && service.service_packages.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Package (optional)</label>
                      <select
                        className="w-full rounded-md border px-3 py-2"
                        value={selectedPackageId}
                        onChange={(e) => setSelectedPackageId(e.target.value)}
                      >
                        <option value="">No package</option>
                        {service.service_packages.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name} — {pkg.price} {service.currency || 'OMR'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date & Time</label>
                    <Input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the provider should know?" />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={() => router.push('/services')}>Browse All Services</Button>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      if (!service?.id) return
                      try {
                        setIsBooking(true)
                        // If user hasn't chosen a time, default to now + 1h
                        const iso = scheduledDate
                          ? new Date(scheduledDate).toISOString()
                          : new Date(Date.now() + 60 * 60 * 1000).toISOString()
                        const res = await fetch('/api/bookings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            service_id: service.id,
                            scheduled_date: iso,
                            notes: notes || undefined,
                            service_package_id: selectedPackageId || undefined
                          })
                        })
                        const body = await res.json().catch(() => ({}))
                        if (res.status === 401) {
                          alert('Please sign in to book a service.')
                          router.push('/auth/sign-in')
                          return
                        }
                        if (!res.ok) throw new Error(body?.error || 'Booking failed')
                        alert('Booking created successfully.')
                        router.push('/dashboard/bookings')
                      } catch (e: any) {
                        alert(e?.message || 'Failed to create booking')
                      } finally {
                        setIsBooking(false)
                      }
                    }}
                    disabled={isBooking}
                  >
                    {isBooking ? 'Booking…' : 'Book Now'}
                  </Button>
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
