import { getSupabaseClient } from './supabase'

export interface InvoiceData {
  id: string
  booking_id: string
  client_id: string
  provider_id: string
  amount: number
  currency: string
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'
  invoice_number: string
  service_title: string
  service_description?: string
  client_name: string
  client_email: string
  provider_name: string
  provider_email: string
  company_name?: string
  company_logo?: string
  due_date: string
  created_at: string
  updated_at: string
  pdf_url?: string
  payment_terms?: string
  notes?: string
  subtotal?: number
  vat_percent?: number
  vat_amount?: number
  total_amount?: number
  paid_at?: string
  payment_method?: string
  booking?: {
    id: string
    scheduled_date?: string
    status: string
    requirements?: any
  }
}

export interface BookingData {
  id: string
  client_id: string
  provider_id: string
  service_id: string
  service_title: string
  service_description?: string
  amount: number
  currency: string
  status: string
  created_at: string
  scheduled_date?: string
  requirements?: any
}

export class SmartInvoiceService {
  private supabase: any

  constructor() {
    this.supabase = getSupabaseClient()
  }

  /**
   * Automatically generate invoice when booking is approved
   */
  async generateInvoiceOnApproval(bookingId: string): Promise<InvoiceData | null> {
    try {
      console.log('🔧 Generating invoice for approved booking:', bookingId)

      // Get booking details with service and user information
      const { data: booking, error: bookingError } = await this.supabase
        .from('bookings')
        .select(`
          *,
          service:services(
            id,
            title,
            description,
            base_price,
            currency,
            provider:profiles(
              id,
              full_name,
              email,
              company:companies(
                name,
                logo_url,
                vat_number,
                cr_number
              )
            )
          ),
          client:profiles(
            id,
            full_name,
            email
          )
        `)
        .eq('id', bookingId)
        .single()

      if (bookingError) {
        console.error('❌ Error fetching booking:', bookingError)
        return null
      }

      if (!booking) {
        console.error('❌ Booking not found:', bookingId)
        return null
      }

      // Check if invoice already exists
      const { data: existingInvoice } = await this.supabase
        .from('invoices')
        .select('id')
        .eq('booking_id', bookingId)
        .single()

      if (existingInvoice) {
        console.log('ℹ️ Invoice already exists for booking:', bookingId)
        return null
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber()

      // Calculate amounts
      const subtotal = booking.amount || booking.service?.base_price || 0
      const vatPercent = 5.0 // Default VAT for Oman
      const vatAmount = Math.round((subtotal * vatPercent / 100) * 100) / 100
      const totalAmount = subtotal + vatAmount

      // Calculate due date (30 days from now)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)

      // Create invoice data with only fields that exist in the table
      const invoiceData = {
        booking_id: bookingId,
        client_id: booking.client_id,
        provider_id: booking.provider_id,
        amount: totalAmount,
        currency: booking.currency || 'OMR',
        status: 'issued' as const,
        invoice_number: invoiceNumber,
        due_date: dueDate.toISOString(),
        subtotal,
        tax_rate: vatPercent,
        tax_amount: vatAmount,
        total_amount: totalAmount,
        payment_terms: 'Payment due within 30 days',
        notes: `Invoice for ${booking.service?.title || 'Service'} - Booking #${bookingId.slice(0, 8)}`,
        // Add optional fields that might exist
        ...(booking.service?.title && { service_title: booking.service.title }),
        ...(booking.service?.description && { service_description: booking.service.description }),
        ...(booking.client?.full_name && { client_name: booking.client.full_name }),
        ...(booking.client?.email && { client_email: booking.client.email }),
        ...(booking.service?.provider?.full_name && { provider_name: booking.service.provider.full_name }),
        ...(booking.service?.provider?.email && { provider_email: booking.service.provider.email }),
        ...(booking.service?.provider?.company?.name && { company_name: booking.service.provider.company.name }),
        ...(booking.service?.provider?.company?.logo_url && { company_logo: booking.service.provider.company.logo_url }),
        vat_percent: vatPercent,
        vat_amount: vatAmount
      }

      // Insert invoice into database
      const { data: invoice, error: invoiceError } = await this.supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single()

      if (invoiceError) {
        console.error('❌ Error creating invoice:', invoiceError)
        return null
      }

      console.log('✅ Invoice created successfully:', invoice.id)

      // Send notifications
      await this.sendInvoiceNotifications(invoice, booking)

      // Send notification to client about new invoice
      try {
        await this.sendInvoiceNotificationToClient(invoice, booking)
      } catch (notificationError) {
        console.warn('⚠️ Failed to send invoice notification to client:', notificationError)
      }

      return invoice

    } catch (error) {
      console.error('❌ Error generating invoice:', error)
      return null
    }
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    
    // Get count of invoices this month
    const { count } = await this.supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-${month}-01`)
      .lt('created_at', `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`)

    const sequence = (count || 0) + 1
    return `INV-${year}${month}-${String(sequence).padStart(3, '0')}`
  }

  /**
   * Send notification to client about new invoice
   */
  private async sendInvoiceNotificationToClient(invoice: InvoiceData, booking: any): Promise<void> {
    try {
      // Send email notification to client
      if (invoice.client_email) {
        await fetch('/api/notifications/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: invoice.client_email,
            subject: `New Invoice: ${invoice.invoice_number}`,
            text: `Dear ${invoice.client_name},\n\nA new invoice has been generated for your booking.\n\nInvoice Number: ${invoice.invoice_number}\nAmount: ${invoice.currency} ${invoice.amount}\nDue Date: ${new Date(invoice.due_date).toLocaleDateString()}\n\nPlease log in to your dashboard to view and pay the invoice.\n\nThank you for your business!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">New Invoice Generated</h2>
                <p>Dear ${invoice.client_name},</p>
                <p>A new invoice has been generated for your booking.</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #333;">Invoice Details</h3>
                  <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                  <p><strong>Amount:</strong> ${invoice.currency} ${invoice.amount}</p>
                  <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
                  <p><strong>Service:</strong> ${invoice.service_title}</p>
                </div>
                <p>Please log in to your dashboard to view and pay the invoice.</p>
                <p>Thank you for your business!</p>
              </div>
            `
          })
        })
      }

      // Create in-app notification
      await this.supabase
        .from('notifications')
        .insert({
          user_id: invoice.client_id,
          type: 'invoice_created',
          title: 'New Invoice Generated',
          message: `Invoice ${invoice.invoice_number} has been generated for ${invoice.currency} ${invoice.amount}`,
          data: {
            invoice_id: invoice.id,
            booking_id: invoice.booking_id,
            amount: invoice.amount,
            currency: invoice.currency
          },
          priority: 'normal'
        })

      console.log('✅ Invoice notification sent to client:', invoice.client_email)
    } catch (error) {
      console.error('❌ Error sending invoice notification to client:', error)
      throw error
    }
  }

  /**
   * Send notifications to client and provider
   */
  private async sendInvoiceNotifications(invoice: InvoiceData, booking: any): Promise<void> {
    try {
      const { triggerInvoiceCreated } = await import('./notification-triggers-simple')
      
      await triggerInvoiceCreated(booking.id, {
        client_id: invoice.client_id,
        provider_id: invoice.provider_id,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        booking_title: booking.title || 'Service Booking',
        amount: invoice.amount,
        currency: invoice.currency,
        due_date: invoice.due_date
      })
      
      console.log('✅ Invoice notifications sent successfully')

    } catch (error) {
      console.warn('⚠️ Failed to send invoice notifications:', error)
      // Non-blocking - don't fail invoice creation if notifications fail
    }
  }

  /**
   * Get invoices for a user (client or provider)
   */
  async getUserInvoices(userId: string, userRole: 'client' | 'provider'): Promise<InvoiceData[]> {
    try {
      const { data: invoices, error } = await this.supabase
        .from('invoices')
        .select(`
          *,
          booking:bookings(
            id,
            service_title,
            scheduled_date,
            status
          )
        `)
        .eq(userRole === 'client' ? 'client_id' : 'provider_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching invoices:', error)
        return []
      }

      return invoices || []

    } catch (error) {
      console.error('❌ Error fetching user invoices:', error)
      return []
    }
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(invoiceId: string, status: InvoiceData['status']): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('invoices')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (error) {
        console.error('❌ Error updating invoice status:', error)
        return false
      }

      console.log('✅ Invoice status updated:', status)
      return true

    } catch (error) {
      console.error('❌ Error updating invoice status:', error)
      return false
    }
  }

  /**
   * Mark invoice as paid
   */
  async markInvoiceAsPaid(invoiceId: string, paymentMethod: string = 'online'): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('invoices')
        .update({ 
          status: 'paid',
          payment_method: paymentMethod,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (error) {
        console.error('❌ Error marking invoice as paid:', error)
        return false
      }

      // Update related booking status if needed
      const { data: invoice } = await this.supabase
        .from('invoices')
        .select('booking_id')
        .eq('id', invoiceId)
        .single()

      if (invoice) {
        await this.supabase
          .from('bookings')
          .update({ 
            status: 'paid',
            payment_status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', invoice.booking_id)
      }

      console.log('✅ Invoice marked as paid')
      return true

    } catch (error) {
      console.error('❌ Error marking invoice as paid:', error)
      return false
    }
  }
}

export const smartInvoiceService = new SmartInvoiceService()
