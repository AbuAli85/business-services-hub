import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw, Calendar, MessageSquare, Download, Share2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BookingActionsProps {
  bookingId: string
  userRole?: string
  canApprove?: boolean
  canStart?: boolean
  actionBusy?: 'approve' | 'decline' | 'start_project' | null
  onApprove?: () => void
  onDecline?: () => void
  onStartProject?: () => void
  onRefresh?: () => void
  showBackButton?: boolean
  backTo?: string
  className?: string
}

export function BookingActions({
  bookingId,
  userRole,
  canApprove = false,
  canStart = false,
  actionBusy = null,
  onApprove,
  onDecline,
  onStartProject,
  onRefresh,
  showBackButton = true,
  backTo,
  className = ''
}: BookingActionsProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backTo) {
      router.push(backTo)
    } else {
      router.push('/dashboard/bookings')
    }
  }

  const handleViewMilestones = () => {
    router.push(`/dashboard/bookings/${bookingId}/milestones`)
  }

  const handleViewDetails = () => {
    router.push(`/dashboard/bookings/${bookingId}`)
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Back Button */}
      {showBackButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {backTo?.includes('bookings') ? 'Bookings' : 'Details'}
        </Button>
      )}

      {/* Role Badge */}
      <Badge 
        className={
          userRole === 'provider' ? 'bg-blue-500/20 text-blue-100 border-blue-300/30' :
          userRole === 'client' ? 'bg-green-500/20 text-green-100 border-green-300/30' :
          'bg-purple-500/20 text-purple-100 border-purple-300/30'
        }
      >
        {userRole === 'provider' ? 'Provider' :
         userRole === 'client' ? 'Client' :
         'Admin'}
      </Badge>
      
      {/* Quick Actions */}
      {canApprove && onApprove && (
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700"
          disabled={actionBusy !== null}
          onClick={onApprove}
        >
          {actionBusy === 'approve' ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Approve'}
        </Button>
      )}
      
      {canApprove && onDecline && (
        <Button
          size="sm"
          variant="destructive"
          disabled={actionBusy !== null}
          onClick={onDecline}
        >
          {actionBusy === 'decline' ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Decline'}
        </Button>
      )}
      
      {canStart && onStartProject && (
        <Button
          size="sm"
          variant="outline"
          disabled={actionBusy !== null}
          onClick={onStartProject}
        >
          {actionBusy === 'start_project' ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Start Project'}
        </Button>
      )}

      {/* Navigation Actions */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleViewMilestones}
        className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
      >
        <Calendar className="h-4 w-4" />
        Milestones
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleViewDetails}
        className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
      >
        <MessageSquare className="h-4 w-4" />
        Details
      </Button>
      
      {/* Utility Actions */}
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      )}
      
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
      >
        <Download className="h-4 w-4" />
        Export
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>
    </div>
  )
}
