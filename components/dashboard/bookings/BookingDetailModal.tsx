'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar, 
  User, 
  Building, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  MessageSquare,
  Upload,
  Download,
  Play,
  Pause,
  Target,
  TrendingUp,
  Mail,
  Phone
} from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { AmountDisplay } from './AmountDisplay'
import { ProgressIndicator } from './ProgressIndicator'

export interface BookingDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: any | null
  invoice?: any | null
  milestones?: any[]
  communications?: any[]
  files?: any[]
}

export function BookingDetailModal({ 
  open, 
  onOpenChange, 
  booking, 
  invoice,
  milestones = [],
  communications = [],
  files = []
}: BookingDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)

  // Reset tab when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab('overview')
    }
  }, [open])

  if (!booking) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">No booking selected.</div>
        </DialogContent>
      </Dialog>
    )
  }

  const serviceTitle = booking.service_title || booking.serviceTitle || booking.service_name || 'Professional Service'
  const clientName = booking.client_name || booking.clientName || 'Client'
  const providerName = booking.provider_name || booking.providerName || 'Provider'
  const status = booking.display_status || booking.status || 'pending'
  const approvalStatus = booking.approval_status || booking.approvalStatus
  const progressPercentage = booking.progress_percentage || booking.progressPercentage || 0
  const amountCents = booking.amount_cents || (booking.amount ? booking.amount * 100 : 0)
  const currency = booking.currency || 'OMR'
  const createdAt = booking.created_at || booking.createdAt
  const updatedAt = booking.updated_at || booking.updatedAt || createdAt
  const description = booking.description || booking.service_description
  const category = booking.category || booking.service_category

  const formatDate = (dateValue: any) => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{serviceTitle}</DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Booking ID: {booking.id}</span>
            <StatusBadge
              status={status}
              approval_status={approvalStatus}
              progress_percentage={progressPercentage}
              hasInvoice={!!invoice}
              invoiceStatus={invoice?.status}
            />
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Service Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Service Title</div>
                    <div className="font-medium">{serviceTitle}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Category</div>
                    <div className="font-medium">{category || 'General Service'}</div>
                  </div>
                </div>
                {description && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Description</div>
                    <div className="text-sm">{description}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressIndicator
                  status={status}
                  approval_status={approvalStatus}
                  progress_percentage={progressPercentage}
                  milestones_completed={milestones.filter(m => m.completed).length}
                  milestones_total={milestones.length}
                />
              </CardContent>
            </Card>

            {/* Client & Provider Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Client Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Name</div>
                    <div className="font-medium">{clientName}</div>
                  </div>
                  {booking.client_email && (
                    <div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <div className="font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {booking.client_email}
                      </div>
                    </div>
                  )}
                  {booking.client_phone && (
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <div className="font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {booking.client_phone}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Provider Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Name</div>
                    <div className="font-medium">{providerName}</div>
                  </div>
                  {booking.provider_email && (
                    <div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <div className="font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {booking.provider_email}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AmountDisplay
                  amount_cents={amountCents}
                  currency={currency}
                  status={status}
                  invoice_status={invoice?.status}
                  showStatus={true}
                />
                {invoice && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium mb-2">Invoice Details</div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Invoice ID</div>
                        <div className="font-medium">{invoice.id}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Status</div>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium">Created</div>
                    <div className="text-xs text-muted-foreground">{formatDate(createdAt)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium">Last Updated</div>
                    <div className="text-xs text-muted-foreground">{formatDate(updatedAt)}</div>
                  </div>
                </div>
                {booking.estimated_completion && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium">Estimated Completion</div>
                      <div className="text-xs text-muted-foreground">{formatDate(booking.estimated_completion)}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Project Milestones
                </CardTitle>
              </CardHeader>
              <CardContent>
                {milestones.length > 0 ? (
                  <div className="space-y-4">
                    {milestones.map((milestone, index) => (
                      <div key={milestone.id || index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          milestone.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {milestone.completed ? <CheckCircle className="h-4 w-4" /> : index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{milestone.title || milestone.name}</div>
                          <div className="text-sm text-muted-foreground">{milestone.description}</div>
                          {milestone.due_date && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Due: {formatDate(milestone.due_date)}
                            </div>
                          )}
                        </div>
                        <Badge variant={milestone.completed ? 'default' : 'secondary'}>
                          {milestone.completed ? 'Completed' : 'Pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No milestones defined for this project.</p>
                    <Button size="sm" className="mt-2" variant="outline">
                      Add Milestone
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Communications Tab */}
          <TabsContent value="communications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Communications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {communications.length > 0 ? (
                  <div className="space-y-4">
                    {communications.map((comm, index) => (
                      <div key={comm.id || index} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="font-medium">{comm.sender_name || 'System'}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(comm.created_at)}</div>
                        </div>
                        <div className="text-sm">{comm.message || comm.content}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No communications yet.</p>
                    <Button size="sm" className="mt-2" variant="outline">
                      Send Message
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Project Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                {files.length > 0 ? (
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div key={file.id || index} className="flex items-center gap-3 p-2 border rounded">
                        <FileText className="h-4 w-4" />
                        <div className="flex-1">
                          <div className="font-medium">{file.name}</div>
                          <div className="text-xs text-muted-foreground">{file.size}</div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No files uploaded yet.</p>
                    <Button size="sm" className="mt-2" variant="outline">
                      Upload File
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoice ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">Invoice #{invoice.id}</div>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Amount: {currency} {((invoice.amount_cents || 0) / 100).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Created: {formatDate(invoice.created_at)}
                      </div>
                      {invoice.paid_at && (
                        <div className="text-sm text-muted-foreground">
                          Paid: {formatDate(invoice.paid_at)}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No invoice generated yet.</p>
                    <Button size="sm" className="mt-2" variant="outline">
                      Generate Invoice
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default BookingDetailModal


