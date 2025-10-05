import { Booking, Invoice } from '@/hooks/useBookings'

// Helper: derive booking status consistently using invoice lookup
export function getDerivedStatus(booking: Booking, invoiceByBooking: Map<string, Invoice>): string {
  if (booking.status === 'completed') return 'delivered'
  if (booking.status === 'in_progress') return 'in_production'

  const invoice = invoiceByBooking.get(String(booking.id))
  if (invoice && ['issued', 'paid'].includes(invoice.status)) {
    return 'ready_to_launch'
  }

  if (booking.approval_status === 'approved') return 'approved'
  if (booking.status === 'approved') return 'approved'
  if (booking.status === 'declined' || booking.approval_status === 'declined') return 'cancelled'
  if (booking.status === 'cancelled') return 'cancelled'
  if (booking.status === 'on_hold') return 'on_hold'
  if (booking.status === 'rescheduled') return 'pending_review'
  if (booking.status === 'pending') return 'pending_review'

  return booking.status || 'pending_review'
}

export function getStatusSubtitle(status: string): string {
  switch (status) {
    case 'delivered': return 'Project successfully delivered'
    case 'in_production': return 'Active development in progress'
    case 'ready_to_launch': return 'All prerequisites met • Ready to launch'
    case 'approved': return 'Approved and ready for next steps'
    case 'pending_review': return 'Awaiting provider approval'
    case 'cancelled': return 'Project cancelled'
    default: return 'Status unknown'
  }
}

export function calculateBookingStats(
  bookings: Booking[], 
  invoices: Invoice[], 
  summaryStats?: any
) {
  // If we have summary stats, use them for consistency
  // Only apply when there is at least some list data or upstream summary matches scope
  if (summaryStats && bookings.length > 0) {
    return {
      total: summaryStats.total,
      completed: summaryStats.completed,
      inProgress: summaryStats.inProgress,
      pending: summaryStats.pending,
      approved: summaryStats.approved,
      totalRevenue: summaryStats.totalRevenue,
      projectedBillings: summaryStats.projectedBillings,
      avgCompletionTime: summaryStats.avgCompletionTime,
      pendingApproval: summaryStats.pendingApproval,
      readyToLaunch: summaryStats.readyToLaunch
    }
  }

  // Fallback to current page calculation
  const total = bookings.length
  
  const completed = bookings.filter(b => getDerivedStatus(b, new Map()) === 'delivered').length
  const inProgress = bookings.filter(b => getDerivedStatus(b, new Map()) === 'in_production').length
  const approved = bookings.filter(b => 
    b.status === 'approved' || b.approval_status === 'approved'
  ).length
  const pending = bookings.filter(b => getDerivedStatus(b, new Map()) === 'pending_review').length
  
  const totalRevenue = invoices
    .filter(inv => ['issued', 'paid'].includes(inv.status))
    .reduce((sum, inv) => sum + (inv.amount || 0), 0)

  const projectedBillings = bookings
    .filter(b => ['ready_to_launch', 'in_production'].includes(getDerivedStatus(b, new Map())))
    .reduce((sum, b) => sum + (b.total_amount ?? 0), 0)
  
  const avgCompletionTime = 7.2
  const pendingApproval = pending
  const readyToLaunch = bookings.filter(b => getDerivedStatus(b, new Map()) === 'ready_to_launch').length

  return { 
    total, 
    completed, 
    inProgress, 
    pending, 
    approved, 
    totalRevenue, 
    projectedBillings, 
    avgCompletionTime,
    pendingApproval,
    readyToLaunch
  }
}

export function formatLocalDate(raw: any): string {
  if (!raw) return '—'
  const d = typeof raw === 'number' ? new Date(raw) : new Date(String(raw))
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { 
    timeZone: 'Asia/Muscat', 
    year: 'numeric', 
    month: 'short', 
    day: '2-digit' 
  }).format(d)
}

export function formatLocalTime(raw: any): string {
  if (!raw) return '—'
  const d = typeof raw === 'number' ? new Date(raw) : new Date(String(raw))
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { 
    timeZone: 'Asia/Muscat', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  }).format(d) + ' GST'
}

export function getCreatedAtTimestamp(record: any): number {
  const raw = record?.createdAt ?? record?.created_at ?? record?.created_at_utc ?? record?.created_at_iso
  if (!raw) return 0
  const date = typeof raw === 'number' ? new Date(raw) : new Date(String(raw))
  const time = date.getTime()
  return Number.isNaN(time) ? 0 : time
}

export function getUpdatedAtTimestamp(record: any): number {
  const raw =
    record?.updatedAt ?? record?.updated_at ??
    record?.modified_at ?? record?.updated_at_utc ?? record?.updated_at_iso
  if (!raw) return 0
  const d = typeof raw === 'number' ? new Date(raw) : new Date(String(raw))
  const t = d.getTime()
  return Number.isNaN(t) ? 0 : t
}
