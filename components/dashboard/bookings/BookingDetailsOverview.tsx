import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Calendar, Clock, MapPin, DollarSign, CreditCard, Star, MessageSquare, FileText } from 'lucide-react'
import { BookingDetails } from '@/hooks/useBookingDetails'

interface BookingDetailsOverviewProps {
  booking: BookingDetails
}

export function BookingDetailsOverview({ booking }: BookingDetailsOverviewProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'OMR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <FileText className="h-4 w-4 text-gray-500" />
            </div>
          </CardHeader>
          <CardContent>
            <Badge className="text-xs">
              {booking.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <p className="text-xs text-gray-500 mt-1">
              {booking.approval_status || 'No approval status'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <Clock className="h-4 w-4 text-gray-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{booking.progress_percentage}%</div>
            <Progress value={booking.progress_percentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(booking.amount, booking.currency)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {booking.payment_status.replace('_', ' ').toUpperCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Rating</CardTitle>
              <Star className="h-4 w-4 text-gray-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{booking.rating || 'N/A'}</div>
            <p className="text-xs text-gray-500 mt-1">
              {booking.client_satisfaction ? `${booking.client_satisfaction}% satisfied` : 'No rating yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Service Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">{booking.service.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{booking.service.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Category</p>
                <p className="text-sm">{booking.service.category}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Duration</p>
                <p className="text-sm">{booking.service.duration}</p>
              </div>
            </div>

            {booking.service.requirements && booking.service.requirements.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Requirements</p>
                <ul className="text-sm space-y-1">
                  {booking.service.requirements.map((req, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {booking.service.deliverables && booking.service.deliverables.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Deliverables</p>
                <ul className="text-sm space-y-1">
                  {booking.service.deliverables.map((deliverable, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      {deliverable}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule & Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule & Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {booking.scheduled_date && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Scheduled Date</p>
                  <p className="text-sm text-gray-600">{formatDate(booking.scheduled_date)}</p>
                </div>
              </div>
            )}

            {booking.scheduled_time && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Scheduled Time</p>
                  <p className="text-sm text-gray-600">{formatTime(booking.scheduled_time)}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm text-gray-600">
                  {booking.location || 'Not specified'} 
                  <span className="ml-2 text-xs text-gray-500">
                    ({booking.location_type.replace('_', ' ')})
                  </span>
                </p>
              </div>
            </div>

            {booking.estimated_completion && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Estimated Completion</p>
                  <p className="text-sm text-gray-600">{formatDate(booking.estimated_completion)}</p>
                </div>
              </div>
            )}

            {booking.actual_completion && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Actual Completion</p>
                  <p className="text-sm text-gray-600">{formatDate(booking.actual_completion)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {booking.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{booking.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {booking.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{booking.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
