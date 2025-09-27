// lib/workflows/onBookingApproved.ts
import { getSupabaseClient } from '@/lib/supabase'

export async function onBookingApproved(bookingId: string) {
  const supabase = await getSupabaseClient()
  
  // Check if invoice exists
  const { data: invExists } = await supabase
    .from('invoices')
    .select('id')
    .eq('booking_id', bookingId)
    .limit(1)
    .maybeSingle()

  if (!invExists) {
    // Get booking details
    const { data: booking } = await supabase
      .from('bookings')
      .select('client_id, provider_id, amount, currency, total_amount')
      .eq('id', bookingId)
      .single()

    if (booking) {
      await supabase.from('invoices').insert({
        booking_id: bookingId,
        client_id: booking.client_id,
        provider_id: booking.provider_id,
        amount: booking.amount || booking.total_amount || 0,
        currency: booking.currency || 'OMR',
        status: 'draft',
        invoice_number: `INV-${Date.now()}`,
        total_amount: booking.amount || booking.total_amount || 0,
        subtotal: booking.amount || booking.total_amount || 0,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }
  }
}
