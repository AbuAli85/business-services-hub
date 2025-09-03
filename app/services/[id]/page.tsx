'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Package, DollarSign, Building2, User as UserIcon, Share2, Heart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getSupabaseClient } from '@/lib/supabase'

interface ServiceRecord {
  id: string
  title: string
  description?: string
  category?: string
  base_price?: number
  currency?: string
  provider_id?: string
  status?: string
  cover_image_url?: string
  bookings_count?: number
  rating?: number
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
  const [isSaved, setIsSaved] = useState<boolean>(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [hasBooking, setHasBooking] = useState<boolean>(false)
  const [isServiceOwner, setIsServiceOwner] = useState<boolean>(false)

  useEffect(() => {
    const load = async () => {
      if (!serviceId) return
      try {
        setLoading(true)
        setError(null)
        // check auth status to drive booking UX
        try {
          const supabase = await getSupabaseClient()
          const { data: { user } } = await supabase.auth.getUser()
          setIsAuthenticated(!!user)
          // If logged in, check if user already has a booking for this service (as client or provider)
          if (user) {
            try {
              const { data: existingBooking, error: bookingErr } = await supabase
                .from('bookings')
                .select('id')
                .eq('service_id', serviceId)
                .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
                .limit(1)
                .maybeSingle()
              if (!bookingErr && existingBooking) {
                setHasBooking(true)
              } else {
                setHasBooking(false)
              }
            } catch {
              setHasBooking(false)
            }
          } else {
            setHasBooking(false)
          }
        } catch {}
        const res = await fetch(`/api/services/${serviceId}`, { cache: 'no-store' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || `Failed to load service (${res.status})`)
        }
        const data = await res.json()
        setService(data?.service ?? null)
        // determine ownership if possible
        try {
          const supabase2 = await getSupabaseClient()
          const { data: { user: u2 } } = await supabase2.auth.getUser()
          if (u2 && data?.service?.provider_id) setIsServiceOwner(data.service.provider_id === u2.id)
          else setIsServiceOwner(false)
        } catch { setIsServiceOwner(false) }
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="outline" onClick={() => router.back()} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="hidden sm:flex gap-2">
            <Button onClick={() => router.push('/dashboard/services')}>Browse All Services</Button>
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
            {/* Hero header */}
            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
              {service.cover_image_url && (
                <div className="relative h-48 w-full">
                  <Image src={service.cover_image_url} alt={service.title} fill className="object-cover" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                      <Package className="h-5 w-5" />
                      <span>{service.title}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <Badge variant="secondary">{service.category || 'Uncategorized'}</Badge>
                      {service.currency && (
                        <Badge variant="outline">Base {service.base_price ?? 0} {service.currency}</Badge>
                      )}
                      {typeof service.rating === 'number' && (
                        <Badge variant="outline">Rating {service.rating.toFixed(1)}</Badge>
                      )}
                      {typeof service.bookings_count === 'number' && (
                        <Badge variant="outline">{service.bookings_count} bookings</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          if (navigator.share) {
                            await navigator.share({ title: service.title, url: window.location.href })
                          } else {
                            await navigator.clipboard.writeText(window.location.href)
                            alert('Link copied to clipboard')
                          }
                        } catch {}
                      }}
                    >
                      <Share2 className="h-4 w-4 mr-2" /> Share
                    </Button>
                    <Button
                      variant={isSaved ? 'secondary' : 'outline'}
                      onClick={() => setIsSaved((v) => !v)}
                    >
                      <Heart className={`h-4 w-4 mr-2 ${isSaved ? 'fill-current' : ''}`} /> {isSaved ? 'Saved' : 'Save'}
                    </Button>
                  </div>
                </div>
                {service.description && (
                  <p className="mt-3 text-gray-700 whitespace-pre-line leading-7">{service.description}</p>
                )}
              </div>
        </div>

            {/* Duplicate simple Provider card removed to avoid showing twice */}

            {/* Main + sticky sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-6 lg:col-span-2">
                {/* Provider card */}
                {service.provider && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><UserIcon className="h-5 w-5" /> Provider</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={service.provider.avatar_url || ''} />
                            <AvatarFallback>{(service.provider.full_name || 'SP').slice(0,2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{service.provider.full_name || 'Service Provider'}</div>
                            {service.provider.company_name && (
                              <div className="text-sm text-gray-600">{service.provider.company_name}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {service.provider.email && (
                            <Button asChild variant="outline">
                              <a href={`mailto:${service.provider.email}?subject=Inquiry about ${encodeURIComponent(service.title)}`}>Email</a>
                            </Button>
                          )}
                          {service.provider.phone && (
                            <Button asChild variant="outline">
                              <a href={`tel:${service.provider.phone}`}>Call</a>
                            </Button>
                          )}
                        </div>
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

                {/* Booking-only widgets */}
                {hasBooking && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle>Timeline Updates</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm text-gray-700">
                        <div className="rounded-md border p-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">Initial briefing</div>
                            <div className="text-xs text-gray-500">Today</div>
                          </div>
                          <p className="mt-1 text-gray-600">Provider will post progress here with files and screenshots.</p>
                        </div>
                        <div className="rounded-md border p-3 bg-gray-50">
                          <div className="text-xs text-gray-500">Tip</div>
                          <p>Sign in to react 👍👎 and comment on updates.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle>Files</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-700">
                        <p className="mb-3">Secure uploads and downloads will appear here.</p>
                        <Button variant="outline" disabled>Upload File (login required)</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle>Messaging</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-700">
                        <p className="mb-3">Direct chat between client and provider.</p>
                        <Button variant="outline" onClick={() => router.push('/auth/sign-in')}>Sign in to Message</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle>Suggested Services</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-gray-700">
                        <div className="rounded-md border p-3">Advanced package with monthly optimization</div>
                        <div className="rounded-md border p-3">Complementary audit and strategy session</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Analytics Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="rounded-md border p-3 text-center">
                          <div className="text-xs text-gray-500">Est. Value</div>
                          <div className="text-lg font-semibold">—</div>
                        </div>
                        <div className="rounded-md border p-3 text-center">
                          <div className="text-xs text-gray-500">Progress</div>
                          <div className="text-lg font-semibold">0%</div>
                        </div>
                        <div className="rounded-md border p-3 text-center">
                          <div className="text-xs text-gray-500">Files</div>
                          <div className="text-lg font-semibold">0</div>
                        </div>
                        <div className="rounded-md border p-3 text-center">
                          <div className="text-xs text-gray-500">Messages</div>
                          <div className="text-lg font-semibold">0</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                )}

                {/* Category-Specific Widgets */}
                {hasBooking && service.category?.toLowerCase().includes('seo') && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle>SEO Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-gray-500">Keywords Improved</div>
                          <div className="text-lg font-semibold">—</div>
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-gray-500">Backlinks</div>
                          <div className="text-lg font-semibold">—</div>
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-gray-500">Content Published</div>
                          <div className="text-lg font-semibold">—</div>
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs text-gray-500">Tech Fixes</div>
                          <div className="text-lg font-semibold">—</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {hasBooking && service.category?.toLowerCase().includes('social') && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle>Social Media Calendar</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-700">Planned posts and previews will appear here.</div>
                    </CardContent>
                  </Card>
                )}

                {hasBooking && service.category?.toLowerCase().includes('web') && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle>Development Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-700">Feature updates, preview links, and change requests will appear here.</div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sticky booking sidebar (hidden for provider/owner) */}
              <div className="lg:col-span-1">
                <div className="sticky top-20 space-y-4">
                  {!isServiceOwner && (
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-700 to-gray-900 text-white">
                    <CardHeader>
                      <CardTitle>Book This Service</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(service.service_packages) && service.service_packages.length > 0 && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-white/90 mb-1">Select Package (optional)</label>
                          <select
                            className="w-full rounded-md border border-white/20 bg-white/90 px-3 py-2 text-gray-900"
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
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-white/90 mb-1">Scheduled Date & Time</label>
                        <Input
                          type="datetime-local"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-white/90 mb-1">Notes (optional)</label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the provider should know?" className="bg-white/90 text-gray-900" />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button variant="secondary" onClick={() => router.push('/dashboard/services')} className="bg-white/10 border-white/30 text-white hover:bg-white/20">Browse All Services</Button>
                        <Button
                          className="bg-gray-100 text-gray-900 hover:bg-gray-200"
                          onClick={async () => {
                            if (!service?.id) return
                            // If not signed in, route to sign-in first
                            try {
                              const supabase = await getSupabaseClient()
                              const { data: { user } } = await supabase.auth.getUser()
                              if (!user) {
                                router.push('/auth/sign-in')
                                return
                              }
                            } catch {}
                            // Go to booking confirmation/create flow with the service preselected
                            router.push(`/dashboard/bookings/create?service=${service.id}`)
                          }}
                        >
                          {isAuthenticated ? 'Book Now' : 'Sign in to Book'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
