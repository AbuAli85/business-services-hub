import { useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { isBookingApproved, deriveAmount } from '@/lib/bookings-helpers'

interface Booking {
  id: string
  provider_id?: string
  status: string
  created_at: string
  [key: string]: any
}

interface UseBookingActionsReturn {
  approveBooking: (bookingId: string, providerId?: string, status?: string) => Promise<void>
  declineBooking: (bookingId: string, providerId?: string, status?: string) => Promise<void>
  handleCreateInvoice: (booking: Booking) => Promise<void>
  handleSendInvoice: (invoiceId: string) => Promise<void>
  handleMarkInvoicePaid: (invoiceId: string) => Promise<void>
  exportBookings: (format: 'csv' | 'pdf' | 'json', ids?: string[]) => void
}

export function useBookingActions(
  userRole?: string,
  userId?: string,
  refresh?: (force?: boolean) => void
): UseBookingActionsReturn {
  const router = useRouter()

  const approveBooking = useCallback(async (bookingId: string, providerId?: string, status?: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const res = await fetch(`/api/bookings/${bookingId}/approve`, {
        method: 'POST',
        headers,
        credentials: 'include'
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Approval failed')
      }

      toast.success('Booking approved successfully')
      if (refresh) refresh(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve booking'
      console.error('Approval error:', errorMessage)
      toast.error(errorMessage)
    }
  }, [refresh])

  const declineBooking = useCallback(async (bookingId: string, providerId?: string, status?: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const res = await fetch(`/api/bookings/${bookingId}/decline`, {
        method: 'POST',
        headers,
        credentials: 'include'
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Decline failed')
      }

      toast.success('Booking declined')
      if (refresh) refresh(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to decline booking'
      console.error('Decline error:', errorMessage)
      toast.error(errorMessage)
    }
  }, [refresh])

  const handleCreateInvoice = useCallback(async (booking: Booking) => {
    try {
      // Centralize approval logic
      const isApproved = isBookingApproved(booking)
      
      if (!isApproved) {
        toast.error('Invoice can be created only after approval')
        return
      }
      
      const canCreateInvoice = userRole === 'provider' || userRole === 'admin'
      if (!canCreateInvoice) {
        toast.error('You do not have permission to create invoices')
        return
      }
      
      const supabase = await getSupabaseClient()
      // Centralize amount derivation
      const amount = deriveAmount(booking)
      const currency = String(booking.currency ?? 'OMR')
      
      if (amount <= 0) {
        toast.error('Invalid booking amount')
        return
      }
      
      const payload: any = {
        booking_id: booking.id,
        client_id: booking.client_id || booking.client_profile?.id,
        provider_id: booking.provider_id || booking.provider_profile?.id || userId,
        amount,
        currency,
        status: 'draft',
        invoice_number: `INV-${Date.now()}`,
        total_amount: amount,
        subtotal: amount,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('invoices')
        .insert(payload)
        .select('id, booking_id, status, amount, currency')
        .single()
      
      if (error) {
        throw new Error(error.message || 'Failed to create invoice')
      }
      
      toast.success('Invoice created successfully')
      if (refresh) refresh(true)
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to create invoice'
      console.error('Invoice creation failed:', errorMessage)
      toast.error(errorMessage)
    }
  }, [userRole, userId, refresh])

  const handleSendInvoice = useCallback(async (invoiceId: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'issued',
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (error) throw error

      toast.success('Invoice sent successfully')
      if (refresh) refresh(true)
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to send invoice'
      console.error('Send invoice failed:', errorMessage)
      toast.error(errorMessage)
    }
  }, [refresh])

  const handleMarkInvoicePaid = useCallback(async (invoiceId: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (error) throw error

      toast.success('Invoice marked as paid')
      if (refresh) refresh(true)
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to mark invoice as paid'
      console.error('Mark paid failed:', errorMessage)
      toast.error(errorMessage)
    }
  }, [refresh])

  const exportBookings = useCallback((format: 'csv' | 'pdf' | 'json', ids?: string[], bookings?: Booking[]) => {
    try {
      if (!bookings || bookings.length === 0) {
        toast.error('No bookings to export')
        return
      }

      const bookingsToExport = ids && ids.length > 0
        ? bookings.filter(b => ids.includes(b.id))
        : bookings

      if (bookingsToExport.length === 0) {
        toast.error('No bookings to export')
        return
      }

      const filename = `bookings-export-${new Date().toISOString().split('T')[0]}`
      
      if (format === 'csv') {
        // Import exportToCSV dynamically to avoid SSR issues
        import('@/lib/export-utils').then(({ exportToCSV }) => {
          exportToCSV(bookingsToExport, `${filename}.csv`)
          toast.success(`CSV export downloaded (${bookingsToExport.length} bookings)`)
        })
      } else if (format === 'pdf') {
        // Import exportToPDF dynamically
        import('@/lib/export-utils').then(({ exportToPDF }) => {
          exportToPDF(bookingsToExport, `${filename}.pdf`)
          toast.success('PDF export opened in print dialog')
        })
      } else if (format === 'json') {
        const json = JSON.stringify(bookingsToExport, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${filename}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        toast.success(`JSON export downloaded (${bookingsToExport.length} bookings)`)
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export bookings')
    }
  }, [])

  return {
    approveBooking,
    declineBooking,
    handleCreateInvoice,
    handleSendInvoice,
    handleMarkInvoicePaid,
    exportBookings
  }
}
