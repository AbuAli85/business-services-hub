import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ServiceColumn,
  ClientColumn,
  StatusColumn,
  ProgressColumn,
  PaymentColumn,
  AmountColumn,
  CreatedColumn,
  ActionsColumn
} from './EnhancedBookingColumns'
import { cn } from '@/lib/utils'

interface BookingFullData {
  id: string
  title: string
  service_title: string
  service_category?: string
  client_name: string
  client_company?: string
  client_avatar?: string
  provider_name: string
  provider_company?: string
  normalized_status: string
  calculated_progress_percentage: number
  total_milestones: number
  completed_milestones: number
  payment_status: string
  invoice_status?: string
  amount?: number
  amount_cents?: number
  currency: string
  created_at: string
  updated_at?: string
  service_id: string
  client_id: string
  provider_id: string
  invoice_id?: string
}

interface EnhancedBookingsTableProps {
  bookings: BookingFullData[]
  selectedIds: Set<string>
  onSelect: (bookingId: string, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  onViewDetails: (bookingId: string) => void
  onViewMilestones: (bookingId: string) => void
  onViewInvoice: (bookingId: string) => void
  onMessageClient: (bookingId: string) => void
  userRole?: string
  density?: 'compact' | 'comfortable' | 'spacious'
  loading?: boolean
  className?: string
}

export function EnhancedBookingsTable({
  bookings,
  selectedIds,
  onSelect,
  onSelectAll,
  onViewDetails,
  onViewMilestones,
  onViewInvoice,
  onMessageClient,
  userRole,
  density = 'comfortable',
  loading = false,
  className = ''
}: EnhancedBookingsTableProps) {
  const allSelected = bookings.length > 0 && bookings.every(booking => selectedIds.has(booking.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  const densityClasses = {
    compact: 'text-xs py-2',
    comfortable: 'text-sm py-3',
    spacious: 'text-base py-4'
  }

  const headerClasses = {
    compact: 'text-xs py-2',
    comfortable: 'text-sm py-3',
    spacious: 'text-base py-4'
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className="rounded-full bg-gray-200 h-4 w-4"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (bookings.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-12 text-center">
          <div className="text-gray-500">
            <div className="text-lg font-medium mb-2">No bookings found</div>
            <div className="text-sm">Try adjusting your filters or create a new booking</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Bookings ({bookings.length})
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {selectedIds.size} selected
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 bg-gray-50 border-b border-gray-200">
          <div className="col-span-1 flex items-center">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onSelectAll}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
          </div>
          <div className="col-span-3">
            <div className={cn("font-medium text-gray-700", headerClasses[density])}>
              Service
            </div>
          </div>
          <div className="col-span-2">
            <div className={cn("font-medium text-gray-700", headerClasses[density])}>
              Client
            </div>
          </div>
          <div className="col-span-1">
            <div className={cn("font-medium text-gray-700", headerClasses[density])}>
              Status
            </div>
          </div>
          <div className="col-span-1">
            <div className={cn("font-medium text-gray-700", headerClasses[density])}>
              Progress
            </div>
          </div>
          <div className="col-span-1">
            <div className={cn("font-medium text-gray-700", headerClasses[density])}>
              Payment
            </div>
          </div>
          <div className="col-span-1">
            <div className={cn("font-medium text-gray-700 text-right", headerClasses[density])}>
              Amount
            </div>
          </div>
          <div className="col-span-1">
            <div className={cn("font-medium text-gray-700", headerClasses[density])}>
              Created
            </div>
          </div>
          <div className="col-span-1">
            <div className={cn("font-medium text-gray-700", headerClasses[density])}>
              Actions
            </div>
          </div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-gray-100">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className={cn(
                "grid grid-cols-12 gap-4 px-4 hover:bg-gray-50 transition-colors",
                densityClasses[density]
              )}
            >
              {/* Selection Checkbox */}
              <div className="col-span-1 flex items-center">
                <Checkbox
                  checked={selectedIds.has(booking.id)}
                  onCheckedChange={(checked) => onSelect(booking.id, checked as boolean)}
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
              </div>

              {/* Service Column */}
              <div className="col-span-3 flex items-center">
                <ServiceColumn booking={booking} />
              </div>

              {/* Client Column */}
              <div className="col-span-2 flex items-center">
                <ClientColumn booking={booking} />
              </div>

              {/* Status Column */}
              <div className="col-span-1 flex items-center">
                <StatusColumn booking={booking} />
              </div>

              {/* Progress Column */}
              <div className="col-span-1 flex items-center">
                <ProgressColumn booking={booking} />
              </div>

              {/* Payment Column */}
              <div className="col-span-1 flex items-center">
                <PaymentColumn booking={booking} />
              </div>

              {/* Amount Column */}
              <div className="col-span-1 flex items-center">
                <AmountColumn booking={booking} />
              </div>

              {/* Created Column */}
              <div className="col-span-1 flex items-center">
                <CreatedColumn booking={booking} />
              </div>

              {/* Actions Column */}
              <div className="col-span-1 flex items-center">
                <ActionsColumn
                  booking={booking}
                  userRole={userRole}
                  onViewDetails={() => onViewDetails(booking.id)}
                  onViewMilestones={() => onViewMilestones(booking.id)}
                  onViewInvoice={() => onViewInvoice(booking.id)}
                  onMessageClient={() => onMessageClient(booking.id)}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
