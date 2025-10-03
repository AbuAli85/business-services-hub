'use client'

import { useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { CheckCircle, X, Clock, MessageSquare, FileText, BarChart3 } from 'lucide-react'
import { useBookingDetails } from '@/hooks/useBookingDetails'
import { BookingDetailsHeader } from './BookingDetailsHeader'
import { BookingDetailsOverview } from './BookingDetailsOverview'
import { BookingDetailsParticipants } from './BookingDetailsParticipants'
import { ProgressTabs } from '../progress-tabs'
import { toast } from 'sonner'

interface BookingDetailsMainProps {
  userRole: 'client' | 'provider' | 'admin'
}

export function BookingDetailsMain({ userRole }: BookingDetailsMainProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  const {
    booking,
    loading,
    error,
    isUpdating,
    approveBooking,
    declineBooking,
    refresh
  } = useBookingDetails({ userRole })

  const handleApprove = useCallback(async () => {
    const success = await approveBooking()
    if (success) {
      toast.success('Booking approved successfully')
    }
  }, [approveBooking])

  const handleDecline = useCallback(async () => {
    const success = await declineBooking()
    if (success) {
      toast.success('Booking declined')
    }
  }, [declineBooking])

  const handleExport = useCallback(() => {
    if (!booking) return
    
    try {
      // Create a downloadable JSON export of the booking
      const exportData = {
        bookingId: booking.id,
        status: booking.status,
        serviceTitle: booking.service?.title || booking.title || 'N/A',
        clientName: booking.client?.full_name || 'N/A',
        providerName: booking.provider?.full_name || 'N/A',
        amount: booking.amount || 0,
        currency: booking.currency || 'OMR',
        createdAt: booking.created_at,
        scheduledDate: booking.scheduled_date,
        notes: booking.notes,
        exportedAt: new Date().toISOString()
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `booking-${booking.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('Booking exported successfully')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export booking')
    }
  }, [booking])

  const handleShare = useCallback(async () => {
    if (!booking) return
    
    try {
      const shareUrl = `${window.location.origin}/dashboard/bookings/${booking.id}`
      const shareText = `Booking: ${booking.service?.title || booking.title || 'Service'} - Status: ${booking.status}`
      
      // Use Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: shareText,
          text: `Check out this booking details`,
          url: shareUrl
        })
        toast.success('Booking shared successfully')
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Booking link copied to clipboard')
      }
    } catch (error) {
      // User cancelled or error occurred
      if ((error as Error).name !== 'AbortError') {
        console.error('Share error:', error)
        toast.error('Failed to share booking')
      }
    }
  }, [booking])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <X className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Error Loading Booking</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={refresh}>Try Again</Button>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <FileText className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Booking Not Found</h3>
        <p className="text-gray-600">The booking you're looking for doesn't exist.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <BookingDetailsHeader
        booking={booking}
        userRole={userRole}
        isUpdating={isUpdating}
        onRefresh={refresh}
        onEdit={() => setShowEditModal(true)}
        onExport={handleExport}
        onShare={handleShare}
      />

      {/* Quick Actions */}
      {(userRole === 'admin' || userRole === 'provider') && (
        <div className="flex gap-2">
          {booking.status === 'pending' && (
            <>
              <Button
                onClick={handleApprove}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={handleDecline}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Decline
              </Button>
            </>
          )}
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="participants" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Participants
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <BookingDetailsOverview booking={booking} />
        </TabsContent>

        <TabsContent value="participants" className="space-y-6">
          <BookingDetailsParticipants booking={booking} userRole={userRole} />
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <ProgressTabs 
            bookingId={booking.id} 
            userRole={userRole === 'admin' ? 'provider' : userRole} 
          />
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Messages</h3>
            <p className="text-gray-600">
              Messages and communication history will be displayed here.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Files & Attachments</h3>
            <p className="text-gray-600">
              {booking.attachments.length > 0 
                ? `${booking.attachments.length} files attached`
                : 'No files attached to this booking'
              }
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
