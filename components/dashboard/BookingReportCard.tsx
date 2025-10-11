import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  FileText, 
  Eye, 
  Download, 
  Calendar, 
  DollarSign, 
  Clock,
  TrendingUp,
  Target,
  MessageSquare,
  CheckCircle
} from 'lucide-react'
import { formatMuscat } from '@/lib/dates'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface BookingReportCardProps {
  booking: {
    id: string
    title: string
    status: string
    client_name: string
    provider_name: string
    service_title: string
    progress: number
    amount: number
    currency: string
    created_at: string
    due_at?: string
  }
  onViewReport: (bookingId: string) => void
  onExportReport: (bookingId: string, format: 'pdf' | 'excel') => void
  userRole?: string
}

export function BookingReportCard({ 
  booking, 
  onViewReport, 
  onExportReport,
  userRole 
}: BookingReportCardProps) {
  
  const getStatusColor = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-green-500'
    if (progress >= 70) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const isOverdue = booking.due_at && new Date(booking.due_at) < new Date()

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
              {booking.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getStatusColor(booking.status)}>
                {booking.status.replace('_', ' ')}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive">
                  Overdue
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewReport(booking.id)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExportReport(booking.id, 'pdf')}
              className="h-8 w-8 p-0"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Service and Participants */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="h-4 w-4" />
            <span className="font-medium">Service:</span>
            <span>{booking.service_title}</span>
          </div>
          
          {userRole !== 'client' && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Client:</span>
              <span>{booking.client_name}</span>
            </div>
          )}
          
          {userRole !== 'provider' && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Provider:</span>
              <span>{booking.provider_name}</span>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Progress</span>
            <span className="text-gray-600">{booking.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={cn("h-2 rounded-full transition-all duration-300", getProgressColor(booking.progress))}
              style={{ width: `${booking.progress}%` }}
            />
          </div>
        </div>

        {/* Financial Info */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="font-medium text-gray-900">
              {formatCurrency(booking.amount, booking.currency)}
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <div>
              <div className="font-medium">Created</div>
              <div>{formatMuscat(booking.created_at)}</div>
            </div>
          </div>
          
          {booking.due_at && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <div>
                <div className="font-medium">Due Date</div>
                <div className={cn(
                  "text-sm",
                  isOverdue ? "text-red-600 font-medium" : ""
                )}>
                  {formatMuscat(booking.due_at)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewReport(booking.id)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExportReport(booking.id, 'pdf')}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface BookingReportsSummaryProps {
  summary: {
    total_bookings: number
    total_revenue: number
    average_progress: number
  }
  breakdown: {
    by_status: Record<string, number>
    by_category: Record<string, number>
  }
}

export function BookingReportsSummary({ summary, breakdown }: BookingReportsSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.total_bookings}</div>
          <p className="text-xs text-muted-foreground">
            All time bookings
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.total_revenue, 'USD')}
          </div>
          <p className="text-xs text-muted-foreground">
            Average: {formatCurrency(summary.total_revenue / Math.max(summary.total_bookings, 1), 'USD')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.average_progress.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            Across all active bookings
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {breakdown.by_status.completed || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.total_bookings > 0 
              ? ((breakdown.by_status.completed || 0) / summary.total_bookings * 100).toFixed(1)
              : 0
            }% of total bookings
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
