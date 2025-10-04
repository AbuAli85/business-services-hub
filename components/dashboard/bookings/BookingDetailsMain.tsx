'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw, Calendar, User, Settings, MessageSquare, Package } from 'lucide-react'
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
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Error Loading Booking</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={handleBack} className="w-full">
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
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Booking Not Found</h3>
            <p className="text-gray-600 mb-4">The requested booking could not be found.</p>
            <Button onClick={handleBack} className="w-full">
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{booking.title}</h1>
            <p className="text-gray-600 mt-1">Booking #{booking.id.slice(0, 8)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Quick Actions */}
          {canApprove && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
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
              variant="outline"
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
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: 'Bookings', href: '/dashboard/bookings' },
          { 
            label: `Booking #${booking.id.slice(0, 8)}`, 
            icon: <Package className="h-4 w-4" />
          }
        ]} 
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Booking Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <StatusPill status={booking.status} />
                  <p className="text-sm text-gray-600 mt-1">
                    Created {formatMuscat(booking.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {booking.total_price} {booking.currency}
                  </p>
                  <p className="text-sm text-gray-600">Total Value</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Information */}
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">{booking.service.name}</h4>
                {booking.service.description && (
                  <p className="text-sm text-gray-600 mt-1">{booking.service.description}</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled Date</p>
                <p className="text-gray-900">{formatMuscat(booking.scheduled_date)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={handleViewMilestones}
                  className="flex items-center justify-center space-x-2"
                >
                  <Calendar className="h-4 w-4" />
                  <span>View Milestones</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/messages')}
                  className="flex items-center justify-center space-x-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Send Message</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Client</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium text-gray-900">{booking.client.full_name}</p>
                {booking.client.company_name && (
                  <p className="text-sm text-gray-600">{booking.client.company_name}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-sm">{booking.client.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Provider Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Provider</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium text-gray-900">{booking.provider.full_name}</p>
                {booking.provider.company_name && (
                  <p className="text-sm text-gray-600">{booking.provider.company_name}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-sm">{booking.provider.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Role Badge */}
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <Badge 
                  className={
                    bookingUserRole === 'provider' ? 'bg-blue-100 text-blue-800' :
                    bookingUserRole === 'client' ? 'bg-green-100 text-green-800' :
                    'bg-purple-100 text-purple-800'
                  }
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
  )
}