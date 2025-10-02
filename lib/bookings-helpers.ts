export type AnyBooking = {
  status?: string | null
  approval_status?: string | null
  amount_cents?: number | null
  totalAmount?: number | null
  amount?: number | null
  total_price?: number | null
  currency?: string | null
}

export function isBookingApproved(booking: AnyBooking | null | undefined): boolean {
  if (!booking) return false
  const status = String(booking.status || '')
  const approval = String(booking.approval_status || '')
  if (approval === 'approved') return true
  return ['approved', 'confirmed', 'in_progress', 'completed'].includes(status)
}

export function deriveAmount(booking: AnyBooking | null | undefined): number {
  if (!booking) return 0
  if (typeof booking.amount_cents === 'number') return booking.amount_cents / 100
  if (typeof booking.totalAmount === 'number') return booking.totalAmount
  if (typeof booking.amount === 'number') return booking.amount
  if (typeof booking.total_price === 'number') return booking.total_price
  return 0
}

export function formatCurrency(amount: number, currency: string = 'OMR'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}


