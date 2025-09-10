const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

class SmartInvoiceService {
  constructor() {
    this.supabase = supabase
  }

  /**
   * Automatically generate invoice when booking is approved
   */
  async generateInvoiceOnApproval(bookingId) {
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
            provider:profiles!services_provider_id_fkey(
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
          client:profiles!bookings_client_id_fkey(
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
      const subtotal = booking.subtotal || booking.service?.base_price || 0
      const vatPercent = 5.0 // Default VAT for Oman
      const vatAmount = Math.round((subtotal * vatPercent / 100) * 100) / 100
      const totalAmount = subtotal + vatAmount

      // Calculate due date (30 days from now)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)

      // Create invoice data (only using columns that exist in the table)
      const invoiceData = {
        booking_id: bookingId,
        client_id: booking.client_id,
        provider_id: booking.provider_id,
        amount: totalAmount,
        currency: booking.currency || 'OMR',
        status: 'issued'
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

      return invoice

    } catch (error) {
      console.error('❌ Error generating invoice:', error)
      return null
    }
  }

  /**
   * Generate unique invoice number
   */
  async generateInvoiceNumber() {
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
   * Send notifications to client and provider
   */
  async sendInvoiceNotifications(invoice, booking) {
    try {
      const serviceTitle = booking.service?.title || 'Service'
      const clientName = booking.client?.full_name || 'Client'
      const providerName = booking.service?.provider?.full_name || 'Provider'

      // Send notification to client
      await this.supabase
        .from('notifications')
        .insert({
          user_id: invoice.client_id,
          type: 'invoice_issued',
          title: 'New Invoice Issued',
          message: `Invoice has been issued for ${serviceTitle}`,
          payload: {
            invoice_id: invoice.id,
            amount: invoice.amount,
            currency: invoice.currency,
            service_title: serviceTitle
          }
        })

      // Send notification to provider
      await this.supabase
        .from('notifications')
        .insert({
          user_id: invoice.provider_id,
          type: 'invoice_created',
          title: 'Invoice Created',
          message: `Invoice has been created for ${serviceTitle}`,
          payload: {
            invoice_id: invoice.id,
            amount: invoice.amount,
            currency: invoice.currency,
            client_name: clientName
          }
        })

      console.log('✅ Invoice notifications sent')

    } catch (error) {
      console.error('❌ Error sending invoice notifications:', error)
    }
  }

  /**
   * Get invoices for a user (client or provider)
   */
  async getUserInvoices(userId, userRole) {
    try {
      const { data: invoices, error } = await this.supabase
        .from('invoices')
        .select(`
          *,
          booking:bookings(
            id,
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
  async updateInvoiceStatus(invoiceId, status) {
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
  async markInvoiceAsPaid(invoiceId, paymentMethod = 'online') {
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

const smartInvoiceService = new SmartInvoiceService()
module.exports = { smartInvoiceService }
