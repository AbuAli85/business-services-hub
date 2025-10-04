'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { CheckCircle, X, Clock, MessageSquare, FileText, BarChart3, Download, Share2, Mail } from 'lucide-react'
import { useBookingDetails } from '@/hooks/useBookingDetails'
import { BookingDetailsHeader } from './BookingDetailsHeader'
import { BookingDetailsOverview } from './BookingDetailsOverview'
import { BookingDetailsParticipants } from './BookingDetailsParticipants'
import { ProgressTabs } from '../progress-tabs'
import { ProfessionalBookingDetails } from './ProfessionalBookingDetails'
import { toast } from 'sonner'
import { exportToCSV, exportToPDF, exportSingleBookingPDF } from '@/lib/export-utils'
import { shareBookingViaEmail } from '@/lib/email-utils'

interface BookingDetailsMainProps {
  userRole: 'client' | 'provider' | 'admin'
}

export function BookingDetailsMain({ userRole }: BookingDetailsMainProps) {
  const router = useRouter()
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

  const handleBack = useCallback(() => {
    router.push('/dashboard/bookings')
  }, [router])

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

  const handleExport = useCallback((format: 'json' | 'csv' | 'pdf' = 'pdf') => {
    if (!booking) return
    
    try {
      if (format === 'pdf') {
        exportSingleBookingPDF(booking)
        toast.success('PDF export opened in print dialog')
      } else if (format === 'json') {
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
        
        toast.success('JSON export downloaded')
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export booking')
    }
  }, [booking])

  const handleShare = useCallback(async (method: 'native' | 'email' | 'clipboard' = 'native') => {
    if (!booking) return
    
    try {
      const shareUrl = `${window.location.origin}/dashboard/bookings/${booking.id}`
      const shareText = `Booking: ${booking.service?.title || booking.title || 'Service'} - Status: ${booking.status}`
      
      if (method === 'email') {
        // Share via email
        shareBookingViaEmail(booking, {
          subject: `Booking Details: ${booking.service?.title || booking.title}`,
          includeLink: true
        })
        toast.success('Email client opened')
      } else if (method === 'clipboard') {
        // Copy to clipboard
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Booking link copied to clipboard')
      } else {
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
      {/* Professional Booking Details */}
      <ProfessionalBookingDetails
        booking={booking}
        userRole={userRole}
        onEdit={() => setShowEditModal(true)}
        onApprove={handleApprove}
        onDecline={handleDecline}
        onExport={handleExport}
        onShare={handleShare}
        onBack={handleBack}
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
    </div>
  )
}
