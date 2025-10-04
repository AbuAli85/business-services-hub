'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  CreditCard, 
  Star, 
  MessageSquare, 
  FileText,
  User,
  Building2,
  Phone,
  Mail,
  Globe,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  X,
  Download,
  Share2,
  Edit,
  Eye,
  BarChart3,
  Zap,
  Award,
  Target,
  Timer,
  Users,
  Briefcase,
  Settings,
  Bell,
  History,
  Activity,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ProfessionalBookingDetailsProps {
  booking: any
  userRole: 'client' | 'provider' | 'admin'
  onEdit?: () => void
  onApprove?: () => void
  onDecline?: () => void
  onExport?: () => void
  onShare?: () => void
}

function formatCurrency(amount: number, currency: string = 'OMR'): string {
  const amountValue = amount / 100 // Convert from cents
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'OMR' ? 'USD' : currency,
    minimumFractionDigits: 2,
  }).format(amountValue).replace('$', currency === 'OMR' ? 'OMR ' : '$')
}

function formatDate(dateValue: any): string {
  if (!dateValue) return '—'
  
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return '—'
  
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function formatDateTime(dateValue: any): string {
  if (!dateValue) return '—'
  
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return '—'
  
  return date.toLocaleString('en-GB', { 
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'approved':
    case 'confirmed':
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'pending':
    case 'draft':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'in_progress':
    case 'active':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'cancelled':
    case 'declined':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'on_hold':
    case 'paused':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function ProfessionalBookingDetails({
  booking,
  userRole,
  onEdit,
  onApprove,
  onDecline,
  onExport,
  onShare
}: ProfessionalBookingDetailsProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showEditModal, setShowEditModal] = useState(false)

  // Extract booking data with comprehensive fallbacks
  const serviceTitle = booking.service_title || booking.serviceTitle || booking.service_name || 'Professional Service'
  const serviceDescription = booking.service_description || booking.description || 'No description available'
  const clientName = booking.client_name || booking.client_full_name || booking.client_display_name || 'Client'
  const clientCompany = booking.client_company || booking.client_company_name || booking.client_organization || 'Individual'
  const clientEmail = booking.client_email || 'No email provided'
  const clientPhone = booking.client_phone || 'No phone provided'
  const providerName = booking.provider_name || booking.provider_full_name || booking.provider_display_name || 'Provider'
  const providerCompany = booking.provider_company || booking.provider_company_name || booking.provider_organization || 'Professional'
  const providerEmail = booking.provider_email || 'No email provided'
  const providerPhone = booking.provider_phone || 'No phone provided'
  const status = booking.status || 'pending'
  const approvalStatus = booking.approval_status || booking.approvalStatus
  // Calculate actual progress from milestone data
  const calculateProgressFromMilestones = () => {
    if (!milestones || milestones.length === 0) {
      return booking.progress_percentage || 0
    }
    
    const totalMilestones = milestones.length
    const completedMilestones = milestones.filter((m: any) => m.status === 'completed').length
    const inProgressMilestones = milestones.filter((m: any) => m.status === 'in_progress').length
    
    // Calculate weighted progress
    let totalProgress = 0
    milestones.forEach((milestone: any) => {
      if (milestone.status === 'completed') {
        totalProgress += 100
      } else if (milestone.status === 'in_progress') {
        totalProgress += milestone.progress_percentage || 50
      }
    })
    
    return totalMilestones > 0 ? Math.round(totalProgress / totalMilestones) : 0
  }
  
  const actualProgressPercentage = calculateProgressFromMilestones()
  const progressPercentage = actualProgressPercentage
  const amountCents = booking.amount_cents || (booking.amount ? booking.amount * 100 : 0)
  const currency = booking.currency || 'OMR'
  const createdAt = booking.created_at || booking.createdAt
  const updatedAt = booking.updated_at || booking.updatedAt || createdAt
  const scheduledDate = booking.scheduled_date || booking.scheduledDate
  const location = booking.location || 'Not specified'
  const notes = booking.notes || booking.description || 'No additional notes'

  // Real milestone data from booking or API
  const milestones = booking.milestones || []

  // Real time entries data from booking or API
  const timeEntries = booking.time_entries || []

  // Real messages data from booking or API
  const messages = booking.messages || []

  // Real files data from booking or API
  const files = booking.files || []

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 60) return 'bg-blue-500'
    if (percentage >= 40) return 'bg-yellow-500'
    if (percentage >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getMilestoneIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />
      case 'pending': return <AlertCircle className="h-4 w-4 text-gray-400" />
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Professional Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    {serviceTitle}
                  </CardTitle>
                  <p className="text-gray-600">{serviceDescription}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Badge className={cn("font-medium border", getStatusColor(status))}>
                  {approvalStatus || status}
                </Badge>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  Created {formatDate(createdAt)}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  Updated {formatDateTime(updatedAt)}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={onShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Progress</p>
                <p className="text-2xl font-bold text-gray-900">{progressPercentage}%</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <Progress value={progressPercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(amountCents, currency)}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Payment pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Milestones</p>
                <p className="text-2xl font-bold text-gray-900">
                  {milestones.filter((m: any) => m.status === 'completed').length}/{milestones.length}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Time Logged</p>
                <p className="text-2xl font-bold text-gray-900">
                  {timeEntries.reduce((sum: number, entry: any) => sum + (entry.hours || entry.duration_hours || 0), 0)}h
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Timer className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Total hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="participants" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Participants
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Timeline
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

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Service Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900">{serviceTitle}</h4>
                  <p className="text-sm text-gray-600 mt-1">{serviceDescription}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Category</p>
                    <p className="text-sm text-gray-900">{booking.category || 'Business Service'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Duration</p>
                    <p className="text-sm text-gray-900">{booking.estimated_duration || 'TBD'}</p>
                  </div>
                </div>

                {scheduledDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Scheduled Date</p>
                    <p className="text-sm text-gray-900">{formatDate(scheduledDate)}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-500">Location</p>
                  <p className="text-sm text-gray-900">{location}</p>
                </div>
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Financial Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Total Amount</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(amountCents, currency)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Payment Status</span>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                    Pending
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Currency</span>
                  <span className="text-sm text-gray-900">{currency}</span>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h5 className="font-medium text-gray-900">Payment Breakdown</h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service Fee</span>
                      <span className="text-gray-900">{formatCurrency(amountCents * 0.8, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Platform Fee</span>
                      <span className="text-gray-900">{formatCurrency(amountCents * 0.2, currency)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {notes && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={booking.client_logo_url || booking.client_avatar} />
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {getInitials(clientName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-gray-900">{clientName}</h4>
                    <p className="text-sm text-gray-600">{clientCompany}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{clientEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{clientPhone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Provider Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Provider Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={booking.provider_logo_url || booking.provider_avatar} />
                    <AvatarFallback className="bg-green-100 text-green-600">
                      {getInitials(providerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-gray-900">{providerName}</h4>
                    <p className="text-sm text-gray-600">{providerCompany}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{providerEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{providerPhone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Project Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {milestones.map((milestone: any, index: number) => (
                  <div key={milestone.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      {getMilestoneIcon(milestone.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                        <span className="text-sm text-gray-500">{formatDate(milestone.dueDate)}</span>
                      </div>
                      <Progress value={milestone.progress} className="mt-2" />
                      <p className="text-sm text-gray-600 mt-1">{milestone.progress}% complete</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Time Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeEntries.map((entry: any) => (
                  <div key={entry.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Timer className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">{entry.description || entry.task_description || 'Time Entry'}</h4>
                        <span className="text-sm font-medium text-gray-900">{entry.hours || entry.duration_hours || 0}h</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>{formatDate(entry.date || entry.logged_at || entry.created_at)}</span>
                        <span>•</span>
                        <span>{entry.user_name || entry.user_full_name || entry.created_by || 'User'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Communication History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.map((message: any) => {
                  const isClient = message.sender_id === booking.client_id || message.type === 'client'
                  const senderName = isClient ? 
                    (booking.client_name || booking.client_full_name || 'Client') : 
                    (booking.provider_name || booking.provider_full_name || 'Provider')
                  
                  return (
                    <div key={message.id} className={cn(
                      "flex gap-3 p-4 rounded-lg",
                      isClient ? "bg-blue-50" : "bg-gray-50"
                    )}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={cn(
                          "text-xs",
                          isClient ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                        )}>
                          {senderName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{senderName}</span>
                          <span className="text-xs text-gray-500">{message.timestamp || message.created_at}</span>
                        </div>
                        <p className="text-sm text-gray-700">{message.message || message.content}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Files & Attachments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {files.map((file: any) => (
                  <div key={file.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <FileText className="h-4 w-4 text-gray-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">{file.name}</h4>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>{file.size}</span>
                        <span>•</span>
                        <span>Uploaded by {file.uploadedBy}</span>
                        <span>•</span>
                        <span>{formatDate(file.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ProfessionalBookingDetails
