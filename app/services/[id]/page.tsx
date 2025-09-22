'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Head from 'next/head'
import { ArrowLeft, Package, Wallet, Building2, User as UserIcon, Share2, Heart, Clock, MessageCircle, Upload, FileText, BarChart3, TrendingUp, Star, Calendar, Phone, Mail, Eye, Download, ThumbsUp, MessageSquare, Target, Award, Zap, Users, CheckCircle, AlertCircle, Info } from 'lucide-react'
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
        const serviceData = data?.service ?? null
        
        // Ensure service_packages have proper structure
        if (serviceData?.service_packages) {
          serviceData.service_packages = serviceData.service_packages.map((pkg: any) => ({
            ...pkg,
            features: Array.isArray(pkg.features) ? pkg.features : []
          }))
        }
        
        setService(serviceData)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Enhanced Header */}
        <div className="mb-8">
          <nav aria-label="Breadcrumb" className="mb-3">
            <ol className="flex items-center space-x-1 text-sm text-gray-600">
              <li>
                <Link href="/" className="hover:underline">Home</Link>
              </li>
              <li>
                <span className="px-1">/</span>
              </li>
              <li>
                <Link href="/services" className="hover:underline">Services</Link>
              </li>
              {service?.category && (
                <>
                  <li>
                    <span className="px-1">/</span>
                  </li>
                  <li className="text-gray-700">{service.category}</li>
                </>
              )}
            </ol>
          </nav>
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => router.back()} 
              className="bg-white/80 backdrop-blur-md border-white/30 shadow-lg hover:bg-white/90 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="hidden sm:flex gap-3">
              <Button 
                onClick={() => router.push('/dashboard/services')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
              >
                Browse All Services
              </Button>
            </div>
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
          <>
            <Head>
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'Service',
                    name: service.title,
                    description: service.description || undefined,
                    category: service.category || undefined,
                    provider: service.provider?.company_name || service.provider?.full_name
                      ? { '@type': 'Organization', name: service.provider?.company_name || service.provider?.full_name }
                      : undefined,
                    aggregateRating:
                      typeof service.rating === 'number' && (service.bookings_count || 0) > 0
                        ? { '@type': 'AggregateRating', ratingValue: service.rating, reviewCount: service.bookings_count || 0 }
                        : undefined
                  })
                }}
              />
            </Head>
            <div className="space-y-8">
          <div className="space-y-8">
            {/* Enhanced Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-white shadow-2xl">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              
              {service.cover_image_url && (
                <div className="relative h-64 w-full">
                  <Image src={service.cover_image_url} alt={service.title} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              )}
              
              <div className="relative p-8">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Package className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900">{service.title}</h1>
                        <div className="flex items-center gap-2 mt-2">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm text-gray-600">
                            {typeof service.rating === 'number' && (service.bookings_count || 0) > 0
                              ? `${service.rating.toFixed(1)} (${service.bookings_count} bookings)`
                              : 'No reviews yet'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                      <Badge className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200 px-3 py-1">
                        {service.category || 'Uncategorized'}
                      </Badge>
                      {service.currency && (
                        <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200 px-3 py-1">
                          <Wallet className="h-3 w-3 mr-1" />
                          Starting at {service.base_price ?? 0} {service.currency}
                        </Badge>
                      )}
                      <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-200 px-3 py-1">
                        <Users className="h-3 w-3 mr-1" />
                        {service.bookings_count || 0} bookings
                      </Badge>
                    </div>
                    
                    {service.description && (
                      <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line">{service.description}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
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
                      className="bg-white/80 backdrop-blur-md border-white/30 shadow-lg hover:bg-white/90 transition-all duration-200"
                    >
                      <Share2 className="h-4 w-4 mr-2" /> Share
                    </Button>
                    <Button
                      variant={isSaved ? 'secondary' : 'outline'}
                      onClick={() => setIsSaved((v) => !v)}
                      className={`transition-all duration-200 ${
                        isSaved 
                          ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg' 
                          : 'bg-white/80 backdrop-blur-md border-white/30 shadow-lg hover:bg-white/90'
                      }`}
                    >
                      <Heart className={`h-4 w-4 mr-2 ${isSaved ? 'fill-current' : ''}`} /> 
                      {isSaved ? 'Saved' : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Duplicate simple Provider card removed to avoid showing twice */}

            {/* Main + sticky sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-8 lg:col-span-2">
                {/* Enhanced Provider Card */}
                {service.provider && (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-50/40 via-emerald-50/30 to-green-100/40 rounded-3xl -m-4"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
                    <Card className="relative border-0 shadow-xl bg-white/80 backdrop-blur-md">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-white" />
                          </div>
                          Provider
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                              <AvatarImage src={service.provider.avatar_url || ''} />
                              <AvatarFallback className="text-lg font-semibold">
                                {(service.provider.full_name || 'SP').slice(0,2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-xl font-semibold text-gray-900">{service.provider.full_name || 'Service Provider'}</div>
                              {service.provider.company_name && (
                                <div className="text-sm text-gray-600 flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {service.provider.company_name}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                <span className="text-sm text-gray-600">4.8 rating</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-sm text-gray-600">50+ projects</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3">
                            {service.provider.email && (
                              <Button asChild variant="outline" className="bg-white/80 backdrop-blur-md border-white/30 shadow-lg hover:bg-white/90">
                                <a href={`mailto:${service.provider.email}?subject=Inquiry about ${encodeURIComponent(service.title)}`} className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  Email
                                </a>
                              </Button>
                            )}
                            {service.provider.phone && (
                              <Button asChild variant="outline" className="bg-white/80 backdrop-blur-md border-white/30 shadow-lg hover:bg-white/90">
                                <a href={`tel:${service.provider.phone}`} className="flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  Call
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Enhanced Overview Section */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-indigo-50/30 to-blue-100/40 rounded-3xl -m-4"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
                  <Card className="relative border-0 shadow-xl bg-white/80 backdrop-blur-md">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <BarChart3 className="h-4 w-4 text-white" />
                        </div>
                        Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl -m-2 group-hover:scale-105 transition-transform duration-200"></div>
                          <div className="relative flex items-center p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-green-200/50 shadow-lg">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg mr-4">
                              <Wallet className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Starting at</div>
                              <div className="text-xl font-bold text-gray-900">
                                {service.base_price != null ? service.base_price : 'N/A'} {service.currency || 'OMR'}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl -m-2 group-hover:scale-105 transition-transform duration-200"></div>
                          <div className="relative flex items-center p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-200/50 shadow-lg">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg mr-4">
                              <Building2 className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Category</div>
                              <div className="text-xl font-bold text-gray-900">{service.category || 'Uncategorized'}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl -m-2 group-hover:scale-105 transition-transform duration-200"></div>
                          <div className="relative flex items-center p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-orange-200/50 shadow-lg">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg mr-4">
                              <UserIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Provider</div>
                              <div className="text-xl font-bold text-gray-900">{service.provider?.full_name || 'Service Provider'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {Array.isArray(service.service_packages) && service.service_packages.length > 0 && (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50/40 via-amber-50/30 to-orange-100/40 rounded-3xl -m-4"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
                    <Card className="relative border-0 shadow-xl bg-white/80 backdrop-blur-md">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                            <Package className="h-4 w-4 text-white" />
                          </div>
                          Service Packages
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {service.service_packages.map((pkg) => (
                            <div
                              key={pkg.id}
                              onClick={() => setSelectedPackageId(pkg.id)}
                              className={`relative group cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 ${
                                selectedPackageId === pkg.id 
                                  ? 'border-blue-500 ring-4 ring-blue-100 bg-blue-50/50' 
                                  : 'border-gray-200 hover:border-orange-300 hover:shadow-lg bg-white/80 backdrop-blur-sm'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className="font-semibold text-lg text-gray-900">{pkg.name}</div>
                                <div className="text-xl font-bold text-gray-900 bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">
                                  {pkg.price} {service.currency || 'OMR'}
                                </div>
                              </div>
                              {pkg.description && (
                                <div className="text-sm text-gray-600 mb-4">{pkg.description}</div>
                              )}
                              {Array.isArray(pkg.features) && pkg.features.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Features</div>
                                  <ul className="space-y-1">
                                    {pkg.features.map((feature, index) => (
                                      <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                        {feature}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {selectedPackageId === pkg.id && (
                                <div className="absolute top-4 right-4">
                                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                    <CheckCircle className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Enhanced Booking-only widgets */}
                {hasBooking && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Timeline Updates */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-50/40 via-pink-50/30 to-purple-100/40 rounded-3xl -m-4"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
                    <Card className="relative border-0 shadow-xl bg-white/80 backdrop-blur-md">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                            <Clock className="h-4 w-4 text-white" />
                          </div>
                          Timeline Updates
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="relative">
                            <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gradient-to-b from-purple-200 to-transparent"></div>
                            <div className="flex items-start gap-4">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                                <CheckCircle className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-semibold text-gray-900">Initial briefing</div>
                                  <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Today</div>
                                </div>
                                <p className="text-gray-600 text-sm">Provider will post progress here with files and screenshots.</p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200/50">
                            <div className="flex items-start gap-3">
                              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                              <div>
                                <div className="text-sm font-medium text-blue-900 mb-1">Tip</div>
                                <p className="text-sm text-blue-700">Sign in to react 👍 and comment on updates.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Files Section */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-50/40 via-emerald-50/30 to-green-100/40 rounded-3xl -m-4"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
                    <Card className="relative border-0 shadow-xl bg-white/80 backdrop-blur-md">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                            <FileText className="h-4 w-4 text-white" />
                          </div>
                          Files
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Upload className="h-8 w-8 text-green-600" />
                          </div>
                          <p className="text-gray-600 mb-4">Secure uploads and downloads will appear here.</p>
                          <Button 
                            variant="outline" 
                            disabled
                            className="bg-white/80 backdrop-blur-md border-white/30 shadow-lg"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload File (login required)
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Messaging Section */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-indigo-50/30 to-blue-100/40 rounded-3xl -m-4"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
                    <Card className="relative border-0 shadow-xl bg-white/80 backdrop-blur-md">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <MessageCircle className="h-4 w-4 text-white" />
                          </div>
                          Messaging
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <MessageSquare className="h-8 w-8 text-blue-600" />
                          </div>
                          <p className="text-gray-600 mb-4">Direct chat between client and provider.</p>
                          <Button 
                            variant="outline" 
                            onClick={() => router.push('/auth/sign-in')}
                            className="bg-white/80 backdrop-blur-md border-white/30 shadow-lg hover:bg-white/90"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Sign in to Message
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Suggested Services */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50/40 via-amber-50/30 to-orange-100/40 rounded-3xl -m-4"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
                    <Card className="relative border-0 shadow-xl bg-white/80 backdrop-blur-md">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                            <Target className="h-4 w-4 text-white" />
                          </div>
                          Suggested Services
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="group p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200/50 hover:shadow-lg transition-all duration-200 cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                                <Zap className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">Advanced package with monthly optimization</div>
                                <div className="text-sm text-gray-600">Enhanced features and ongoing support</div>
                              </div>
                            </div>
                          </div>
                          <div className="group p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200/50 hover:shadow-lg transition-all duration-200 cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                                <Award className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">Complementary audit and strategy session</div>
                                <div className="text-sm text-gray-600">Free consultation and analysis</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Analytics Snapshot */}
                  <div className="relative lg:col-span-2">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-purple-50/30 to-indigo-100/40 rounded-3xl -m-4"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
                    <Card className="relative border-0 shadow-xl bg-white/80 backdrop-blur-md">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <BarChart3 className="h-4 w-4 text-white" />
                          </div>
                          Analytics Snapshot
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="text-center group">
                            <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200">
                              <TrendingUp className="h-8 w-8 text-green-600" />
                            </div>
                            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Est. Value</div>
                            <div className="text-2xl font-bold text-gray-900">—</div>
                          </div>
                          <div className="text-center group">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200">
                              <Target className="h-8 w-8 text-blue-600" />
                            </div>
                            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Progress</div>
                            <div className="text-2xl font-bold text-gray-900">0%</div>
                          </div>
                          <div className="text-center group">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200">
                              <FileText className="h-8 w-8 text-purple-600" />
                            </div>
                            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Files</div>
                            <div className="text-2xl font-bold text-gray-900">0</div>
                          </div>
                          <div className="text-center group">
                            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200">
                              <MessageCircle className="h-8 w-8 text-orange-600" />
                            </div>
                            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Messages</div>
                            <div className="text-2xl font-bold text-gray-900">0</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
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

              {/* Enhanced Sticky booking sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-20 space-y-6">
                  {!isServiceOwner && (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-3xl -m-4"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
                    <Card className="relative border-0 shadow-2xl bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-md text-white">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-3 text-2xl">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Calendar className="h-5 w-5 text-white" />
                          </div>
                          Book This Service
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {Array.isArray(service.service_packages) && service.service_packages.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-white/90 mb-3">Select Package (optional)</label>
                            <select
                              className="w-full rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-3 text-white placeholder-white/70 focus:bg-white/20 focus:border-white/40 transition-all duration-200"
                              value={selectedPackageId}
                              onChange={(e) => setSelectedPackageId(e.target.value)}
                              aria-label="Select package"
                            >
                              <option value="" className="bg-gray-800 text-white">No package</option>
                              {service.service_packages.map((pkg) => (
                                <option key={pkg.id} value={pkg.id} className="bg-gray-800 text-white">
                                  {pkg.name} — {pkg.price} {service.currency || 'OMR'}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        
                        <div>
                          <label className="block text-sm font-medium text-white/90 mb-3">Scheduled Date & Time</label>
                          <Input
                            type="datetime-local"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-white/70 focus:bg-white/20 focus:border-white/40"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-white/90 mb-3">Notes (optional)</label>
                          <Textarea 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)} 
                            placeholder="Anything the provider should know?" 
                            className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-white/70 focus:bg-white/20 focus:border-white/40 min-h-[100px]"
                          />
                        </div>
                        
                        <div className="space-y-3">
                          <Button 
                            variant="outline" 
                            onClick={() => router.push('/dashboard/services')} 
                            className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-200 h-12"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Browse All Services
                          </Button>
                          <Button
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg h-12 text-lg font-semibold"
                            onClick={async () => {
                              if (!service?.id) return
                              const redirectTarget = `/dashboard/bookings/create?service=${service.id}`
                              try {
                                const supabase = await getSupabaseClient()
                                const { data: { user } } = await supabase.auth.getUser()
                                if (user) {
                                  router.push(redirectTarget)
                                  return
                                }
                                router.push(`/auth/sign-in?redirect=${encodeURIComponent(redirectTarget)}`)
                                return
                              } catch {
                                router.push(`/auth/sign-in?redirect=${encodeURIComponent(redirectTarget)}`)
                                return
                              }
                            }}
                          >
                            {isAuthenticated ? (
                              <>
                                <Calendar className="h-5 w-5 mr-2" />
                                Book Now
                              </>
                            ) : (
                              <>
                                <UserIcon className="h-5 w-5 mr-2" />
                                Sign in to Book
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  )}
                </div>
              </div>
            </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
