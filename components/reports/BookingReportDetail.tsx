import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  MessageSquare, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Printer,
  Share2,
  User,
  Building,
  MapPin,
  Target,
  TrendingUp
} from 'lucide-react'
import { formatMuscat } from '@/lib/dates'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface BookingReportData {
  booking: {
    id: string
    title: string
    status: string
    raw_status: string
    progress: number
    created_at: string
    updated_at: string
    due_at?: string
    scheduled_date?: string
    estimated_duration?: string
    location?: string
    requirements?: string
    notes?: string
  }
  client: {
    id: string
    name: string
    email: string
    company: string
    avatar: string
  }
  provider: {
    id: string
    name: string
    email: string
    company: string
    avatar: string
  }
  service: {
    id: string
    title: string
    description: string
    category: string
  }
  payment: {
    amount: number
    amount_cents: number
    currency: string
    status: string
    invoice_status: string
  }
  milestones: {
    total: number
    completed: number
    completion_rate: number
    details: Array<{
      id: string
      title: string
      description: string
      status: string
      created_at: string
      completed_at?: string
    }>
  }
  tasks: {
    total: number
    completed: number
    completion_rate: number
    details: Array<{
      id: string
      title: string
      description: string
      status: string
      priority: string
      created_at: string
      completed_at?: string
    }>
  }
  communications: {
    total_messages: number
    details: Array<{
      id: string
      content: string
      sender_id: string
      receiver_id: string
      created_at: string
    }>
  }
  files: {
    total_files: number
    details: Array<{
      id: string
      filename: string
      file_type: string
      file_size: number
      uploaded_at: string
    }>
  }
  invoice?: {
    id: string
    invoice_number: string
    status: string
    amount: number
    due_date: string
    created_at: string
  }
  analytics: {
    duration_days?: number
    days_since_created: number
    days_until_due?: number
    overall_progress: number
  }
}

interface BookingReportDetailProps {
  data: BookingReportData
  onExport?: (format: 'pdf' | 'excel') => void
  onPrint?: () => void
  onShare?: () => void
}

export function BookingReportDetail({ 
  data, 
  onExport, 
  onPrint, 
  onShare 
}: BookingReportDetailProps) {
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
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

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6 p-6 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Booking Report</h1>
          <p className="text-gray-600 mt-2">
            Detailed report for booking: {data.booking?.title || 'Booking'}
          </p>
          <p className="text-sm text-gray-500">
            Generated on {formatMuscat(new Date().toISOString())}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onExport?.('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExport?.('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={onShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.analytics.overall_progress}%</div>
            <Progress value={data.analytics.overall_progress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.payment.amount, data.payment.currency)}
            </div>
            <Badge className={getStatusColor(data.payment.status)}>
              {data.payment.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Milestones</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.milestones.completed}/{data.milestones.total}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.milestones.completion_rate.toFixed(1)}% completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.analytics.duration_days || 'N/A'} days
            </div>
            <p className="text-xs text-muted-foreground">
              {data.analytics.days_since_created} days since created
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Booking Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <div className="mt-1">
                <Badge className={getStatusColor(data.booking.status)}>
                  {data.booking.status}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Created</label>
                <p className="text-sm text-gray-900">{formatMuscat(data.booking.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Due Date</label>
                <p className="text-sm text-gray-900">
                  {data.booking.due_at ? formatMuscat(data.booking.due_at) : 'Not set'}
                </p>
              </div>
            </div>

            {data.booking.location && (
              <div>
                <label className="text-sm font-medium text-gray-700">Location</label>
                <p className="text-sm text-gray-900 flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {data.booking.location}
                </p>
              </div>
            )}

            {data.booking.requirements && (
              <div>
                <label className="text-sm font-medium text-gray-700">Requirements</label>
                <p className="text-sm text-gray-900">{data.booking.requirements}</p>
              </div>
            )}

            {data.booking.notes && (
              <div>
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <p className="text-sm text-gray-900">{data.booking.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Service Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Service Title</label>
              <p className="text-sm text-gray-900 font-medium">{data.service?.title || 'Professional Service'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Category</label>
              <Badge variant="secondary">{data.service?.category || 'General'}</Badge>
            </div>
            
            {data.service?.description && (
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm text-gray-900">{data.service.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={data.client?.avatar} />
                <AvatarFallback>{data.client?.name?.charAt(0) || 'C'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{data.client?.name || 'Unknown Client'}</p>
                <p className="text-sm text-gray-600">{data.client?.email || 'No email'}</p>
                {data.client?.company && (
                  <p className="text-sm text-gray-500">{data.client.company}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Provider Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Provider Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={data.provider?.avatar} />
                <AvatarFallback>{data.provider?.name?.charAt(0) || 'P'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{data.provider?.name || 'Unknown Provider'}</p>
                <p className="text-sm text-gray-600">{data.provider?.email || 'No email'}</p>
                {data.provider?.company && (
                  <p className="text-sm text-gray-500">{data.provider.company}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Milestones ({data.milestones.completed}/{data.milestones.total})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.milestones.details.map((milestone) => (
                <div key={milestone.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{milestone?.title || 'Milestone'}</p>
                    {milestone.description && (
                      <p className="text-sm text-gray-600">{milestone.description}</p>
                    )}
                  </div>
                  <Badge className={getStatusColor(milestone.status)}>
                    {milestone.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Tasks ({data.tasks.completed}/{data.tasks.total})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.tasks.details.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{task?.title || 'Task'}</p>
                    {task.description && (
                      <p className="text-sm text-gray-600">{task.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Communications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Communications ({data.communications.total_messages})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.communications.details.slice(0, 5).map((message) => (
                <div key={message.id} className="p-3 border rounded-lg">
                  <p className="text-sm text-gray-900">{message.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatMuscat(message.created_at)}
                  </p>
                </div>
              ))}
              {data.communications.total_messages > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  ... and {data.communications.total_messages - 5} more messages
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Files */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Files ({data.files.total_files})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.files.details.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{file.filename}</p>
                    <p className="text-sm text-gray-600">
                      {file.file_type} • {(file.file_size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatMuscat(file.uploaded_at)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Information */}
      {data.invoice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Invoice Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Invoice Number</label>
                <p className="text-sm text-gray-900">{data.invoice.invoice_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Amount</label>
                <p className="text-sm text-gray-900">{formatCurrency(data.invoice.amount, data.payment.currency)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Badge className={getStatusColor(data.invoice.status)}>
                  {data.invoice.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
