export type BookingStatus =
  | 'draft'
  | 'pending_provider_approval'
  | 'approved'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled'
  | 'declined'
  | 'rescheduled'
  | 'pending'

export const normalizeStatus = (s?: string): BookingStatus => {
  const m = (s || 'draft').toLowerCase()
  if (m === 'pending' || m === 'provider_review') return 'pending_provider_approval'
  if (m === 'active' || m === 'started') return 'in_progress'
  if (m === 'declined') return 'declined'
  if (m === 'rescheduled') return 'rescheduled'
  return (m as BookingStatus) || 'draft'
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  draft: 'Draft',
  pending_provider_approval: 'Pending Provider Approval',
  approved: 'Approved',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
  rescheduled: 'Rescheduled',
  pending: 'Pending'
}

export const STATUS_TONE: Record<BookingStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_provider_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-blue-100 text-blue-700',
  on_hold: 'bg-zinc-100 text-zinc-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
  declined: 'bg-red-100 text-red-700',
  rescheduled: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-amber-100 text-amber-700'
}


