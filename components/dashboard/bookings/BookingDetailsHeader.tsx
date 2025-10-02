import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw, Download, Share2, Edit, MoreHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { BookingDetails } from '@/hooks/useBookingDetails'

interface BookingDetailsHeaderProps {
  booking: BookingDetails
  userRole: 'client' | 'provider' | 'admin'
  isUpdating: boolean
  onRefresh: () => void
  onEdit: () => void
  onExport: () => void
  onShare: () => void
}

export function BookingDetailsHeader({
  booking,
  userRole,
  isUpdating,
  onRefresh,
  onEdit,
  onExport,
  onShare
}: BookingDetailsHeaderProps) {
  const router = useRouter()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'approved': return 'bg-emerald-100 text-emerald-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'declined': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      case 'on_hold': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'normal': return 'bg-blue-100 text-blue-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{booking.title}</h1>
            <Badge className={getStatusColor(booking.status)}>
              {booking.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge variant="outline" className={getPriorityColor(booking.priority)}>
              {booking.priority.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">
            Booking ID: {booking.id} • Created {new Date(booking.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isUpdating}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        
        {(userRole === 'admin' || userRole === 'provider') && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onShare}
          className="flex items-center gap-2"
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>
    </div>
  )
}
