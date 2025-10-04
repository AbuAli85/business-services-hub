'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw, Calendar, User, Settings, MessageSquare, Package, Clock, DollarSign, MapPin } from 'lucide-react'
import { StatusPill } from '@/components/ui/StatusPill'
import { formatMuscat } from '@/lib/dates'
import { useBookingDetails } from '@/hooks/useBookingDetails'
import { Breadcrumb } from '@/components/ui/Breadcrumb'

interface BookingDetailsMainProps {
  userRole: string
}

export function BookingDetailsMain({ userRole }: BookingDetailsMainProps) {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string

  const {
    booking,
    userRole: bookingUserRole,
    currentUserId,
    loading,
    error,
    actionBusy,
    loadBookingData,
    handleAction,
    normalizeStatus
  } = useBookingDetails(bookingId)

  const handleBack = () => {
    router.push('/dashboard/bookings')
  }

  const handleViewMilestones = () => {
    router.push(`/dashboard/bookings/${bookingId}/milestones`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Error Loading Booking</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Button onClick={handleBack} className="w-full bg-blue-600 hover:bg-blue-700">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Bookings
              </Button>
              <Button variant="outline" onClick={loadBookingData} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Booking Not Found</h3>
            <p className="text-gray-600 mb-6">The requested booking could not be found.</p>
            <Button onClick={handleBack} className="w-full bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bookings
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusNorm = normalizeStatus(booking)
  const canApprove = (bookingUserRole === 'admin' || bookingUserRole === 'provider') && statusNorm === 'pending'
  const canStart = (bookingUserRole === 'provider' || bookingUserRole === 'admin') && ['approved', 'confirmed'].includes(String(booking.status))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleBack} className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Bookings
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              {canApprove && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                  disabled={actionBusy !== null}
                  onClick={() => handleAction('approve')}
                >
                  {actionBusy === 'approve' ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Approve'}
                </Button>
              )}
              {canApprove && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={actionBusy !== null}
                  onClick={() => handleAction('decline')}
                >
                  {actionBusy === 'decline' ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Decline'}
                </Button>
              )}
              {canStart && (
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  disabled={actionBusy !== null}
                  onClick={() => handleAction('start_project')}
                >
                  {actionBusy === 'start_project' ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Start Project'}
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={loadBookingData}
                disabled={actionBusy !== null}
                className="border-gray-300 hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Title and Breadcrumb */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{booking.title || 'Service Booking'}</h1>
            <p className="text-lg text-gray-600 mb-4">Booking #{booking.id.slice(0, 8)}</p>
            <Breadcrumb 
              items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Bookings', href: '/dashboard/bookings' },
                { 
                  label: `Booking #${booking.id.slice(0, 8)}`, 
                  icon: <Package className="h-4 w-4" />
                }
              ]} 
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Status and Value Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="flex items-center space-x-2 text-xl">
                  <Settings className="h-6 w-6 text-blue-600" />
                  <span>Booking Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center md:text-left">
                    <div className="mb-2">
                      <StatusPill status={booking.status} />
                    </div>
                    <p className="text-sm text-gray-600">
                      Created {formatMuscat(booking.created_at)}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {booking.total_price} {booking.currency}
                    </div>
                    <p className="text-sm text-gray-600">Total Value</p>
                  </div>
                  <div className="text-center md:text-right">
                    <div className="text-lg font-semibold text-gray-900 mb-1">
                      {formatMuscat(booking.scheduled_date)}
                    </div>
                    <p className="text-sm text-gray-600">Scheduled Date</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <CardTitle className="flex items-center space-x-2 text-xl">
                  <Package className="h-6 w-6 text-green-600" />
                  <span>Service Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{booking.service.name}</h4>
                    {booking.service.description && (
                      <p className="text-gray-600 leading-relaxed">{booking.service.description}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Service Category</p>
                      <p className="text-gray-900 font-medium">{booking.service.category || 'General'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Duration</p>
                      <p className="text-gray-900 font-medium">{booking.service.duration || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                <CardTitle className="flex items-center space-x-2 text-xl">
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={handleViewMilestones}
                    className="flex items-center justify-center space-x-2 h-12 border-2 hover:bg-blue-50 hover:border-blue-300"
                  >
                    <Calendar className="h-5 w-5" />
                    <span className="font-medium">View Milestones</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard/messages')}
                    className="flex items-center justify-center space-x-2 h-12 border-2 hover:bg-green-50 hover:border-green-300"
                  >
                    <MessageSquare className="h-5 w-5" />
                    <span className="font-medium">Send Message</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Client Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <User className="h-5 w-5 text-orange-600" />
                  <span>Client Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-white font-bold text-xl">
                        {booking.client.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg">{booking.client.full_name}</h3>
                    {booking.client.company_name && (
                      <p className="text-gray-600 text-sm">{booking.client.company_name}</p>
                    )}
                  </div>
                  <div className="space-y-3 pt-4 border-t">
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Email</p>
                      <p className="text-gray-900 text-sm break-all">{booking.client.email}</p>
                    </div>
                    {booking.client.phone && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Phone</p>
                        <p className="text-gray-900 text-sm">{booking.client.phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Provider Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Settings className="h-5 w-5 text-blue-600" />
                  <span>Provider Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-white font-bold text-xl">
                        {booking.provider.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg">{booking.provider.full_name}</h3>
                    {booking.provider.company_name && (
                      <p className="text-gray-600 text-sm">{booking.provider.company_name}</p>
                    )}
                  </div>
                  <div className="space-y-3 pt-4 border-t">
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Email</p>
                      <p className="text-gray-900 text-sm break-all">{booking.provider.email}</p>
                    </div>
                    {booking.provider.phone && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Phone</p>
                        <p className="text-gray-900 text-sm">{booking.provider.phone}</p>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      Provider View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Role Badge */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="text-center">
                  <Badge 
                    className={`px-4 py-2 text-sm font-medium ${
                      bookingUserRole === 'provider' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                      bookingUserRole === 'client' ? 'bg-green-100 text-green-800 border-green-200' :
                      'bg-purple-100 text-purple-800 border-purple-200'
                    }`}
                  >
                    {bookingUserRole === 'provider' ? 'Provider View' :
                     bookingUserRole === 'client' ? 'Client View' :
                     'Admin View'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}