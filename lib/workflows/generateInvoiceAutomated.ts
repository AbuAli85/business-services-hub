/**
 * Automated Invoice Generation Workflow
 * 
 * Triggered when a booking is completed or approved.
 * Automatically fetches all data and generates invoice with PDF.
 */

import { createClient } from '@supabase/supabase-js'
import {
  fetchBookingForInvoice,
  mapBookingToInvoiceData,
  generateInvoiceNumber,
  calculateDueDate,
  InvoiceDataComplete
} from '../invoice-data-fetcher'
import { generateAutomatedInvoicePDF } from '../pdf-generator-automated'

export interface InvoiceGenerationResult {
  success: boolean
  invoice?: any
  invoiceData?: InvoiceDataComplete
  pdfUrl?: string
  error?: string
}

/**
 * Main workflow: Generate invoice automatically from booking
 */
export async function generateInvoiceFromBooking(
  bookingId: string,
  options: {
    supabaseUrl?: string
    supabaseKey?: string
    daysUntilDue?: number
    autoSendEmail?: boolean
  } = {}
): Promise<InvoiceGenerationResult> {
  try {
    console.log('🚀 Starting automated invoice generation for booking:', bookingId)
    
    // Get Supabase credentials
    const supabaseUrl = options.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // ==================== Step 1: Fetch Booking Data ====================
    
    console.log('📊 Step 1: Fetching booking data with relations...')
    const booking = await fetchBookingForInvoice(bookingId, supabaseUrl, supabaseKey)
    
    if (!booking) {
      return {
        success: false,
        error: 'Booking not found or missing required relations'
      }
    }
    
    console.log('✅ Booking data fetched:', {
      id: booking.id,
      amount: booking.amount,
      hasClient: !!booking.client,
      hasProvider: !!booking.service?.provider
    })
    
    // ==================== Step 2: Check for Existing Invoice ====================
    
    console.log('🔍 Step 2: Checking for existing invoice...')
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('booking_id', bookingId)
      .single()
    
    if (existingInvoice) {
      console.log('ℹ️ Invoice already exists:', existingInvoice.invoice_number)
      return {
        success: false,
        error: `Invoice already exists: ${existingInvoice.invoice_number}`
      }
    }
    
    // ==================== Step 3: Generate Invoice Number ====================
    
    console.log('🔢 Step 3: Generating invoice number...')
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
    
    const invoiceNumber = generateInvoiceNumber(count || 0)
    console.log('✅ Invoice number generated:', invoiceNumber)
    
    // ==================== Step 4: Map Data ====================
    
    console.log('🔄 Step 4: Mapping booking data to invoice structure...')
    const dueDate = calculateDueDate(options.daysUntilDue || 30)
    const invoiceData = mapBookingToInvoiceData(booking, invoiceNumber, dueDate)
    
    if (!invoiceData) {
      return {
        success: false,
        error: 'Failed to map booking data to invoice structure'
      }
    }
    
    console.log('✅ Invoice data mapped:', {
      invoiceNumber,
      subtotal: invoiceData.subtotal,
      total: invoiceData.total,
      provider: invoiceData.provider.company,
      client: invoiceData.client.company
    })
    
    // ==================== Step 5: Generate PDF ====================
    
    console.log('📄 Step 5: Generating PDF...')
    let pdfBuffer: Uint8Array
    try {
      pdfBuffer = await generateAutomatedInvoicePDF(invoiceData)
      console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes')
    } catch (pdfError) {
      console.error('❌ PDF generation failed:', pdfError)
      return {
        success: false,
        error: `PDF generation failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`
      }
    }
    
    // ==================== Step 6: Upload PDF to Storage ====================
    
    console.log('☁️ Step 6: Uploading PDF to storage...')
    const fileName = `invoices/${invoiceNumber}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true
      })
    
    let pdfUrl = ''
    if (uploadError) {
      console.warn('⚠️ Failed to upload PDF to storage:', uploadError.message)
      // Continue without PDF URL
    } else {
      const { data: urlData } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName)
      pdfUrl = urlData.publicUrl
      console.log('✅ PDF uploaded:', pdfUrl)
    }
    
    // ==================== Step 7: Insert Invoice Record ====================
    
    console.log('💾 Step 7: Saving invoice to database...')
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        booking_id: bookingId,
        client_id: booking.client_id,
        provider_id: booking.provider_id,
        invoice_number: invoiceNumber,
        amount: invoiceData.total,
        currency: invoiceData.currency,
        status: 'issued',
        due_date: dueDate.toISOString(),
        subtotal: invoiceData.subtotal,
        vat_percent: invoiceData.vat_rate,
        vat_amount: invoiceData.vat_amount,
        total_amount: invoiceData.total,
        payment_terms: invoiceData.payment_terms,
        notes: invoiceData.notes,
        pdf_url: pdfUrl || null
      })
      .select()
      .single()
    
    if (invoiceError) {
      console.error('❌ Failed to save invoice:', invoiceError)
      return {
        success: false,
        error: `Database error: ${invoiceError.message}`
      }
    }
    
    console.log('✅ Invoice saved to database:', invoice.id)
    
    // ==================== Step 8: Create Invoice Items ====================
    
    console.log('📝 Step 8: Creating invoice items...')
    const itemsToInsert = invoiceData.items.map(item => ({
      invoice_id: invoice.id,
      product: item.product,
      description: item.description,
      quantity: item.qty,
      unit_price: item.unit_price,
      total: item.total
    }))
    
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert)
    
    if (itemsError) {
      console.warn('⚠️ Failed to create invoice items:', itemsError.message)
      // Non-critical - continue
    } else {
      console.log('✅ Invoice items created')
    }
    
    // ==================== Step 9: Send Notifications (Optional) ====================
    
    if (options.autoSendEmail) {
      console.log('📧 Step 9: Sending notifications...')
      try {
        await sendInvoiceNotifications(invoice, booking, invoiceData)
        console.log('✅ Notifications sent')
      } catch (notificationError) {
        console.warn('⚠️ Failed to send notifications:', notificationError)
        // Non-critical - continue
      }
    }
    
    // ==================== Success ====================
    
    console.log('🎉 Invoice generation completed successfully!')
    return {
      success: true,
      invoice,
      invoiceData,
      pdfUrl
    }
    
  } catch (error) {
    console.error('❌ Invoice generation failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Send email and in-app notifications for new invoice
 */
async function sendInvoiceNotifications(
  invoice: any,
  booking: any,
  invoiceData: InvoiceDataComplete
): Promise<void> {
  try {
    // Send email to client
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: invoiceData.client.email,
        subject: `New Invoice: ${invoiceData.invoice_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e293b;">New Invoice Generated</h2>
            <p>Dear ${invoiceData.client.name},</p>
            <p>A new invoice has been generated for your booking.</p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #334155;">Invoice Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0;"><strong>Invoice Number:</strong></td>
                  <td style="text-align: right;">${invoiceData.invoice_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Service:</strong></td>
                  <td style="text-align: right;">${invoiceData.items[0]?.product || 'Service'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Amount:</strong></td>
                  <td style="text-align: right;">${invoiceData.currency} ${invoiceData.total.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Due Date:</strong></td>
                  <td style="text-align: right;">${new Date(invoiceData.due_date).toLocaleDateString('en-GB')}</td>
                </tr>
              </table>
            </div>
            <p>Please log in to your dashboard to view and pay the invoice.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/client/invoices/${invoice.id}" 
               style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              View Invoice
            </a>
            <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
              Thank you for your business!<br>
              ${invoiceData.provider.company}
            </p>
          </div>
        `
      })
    })
    
    // Create in-app notification for client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    await supabase
      .from('notifications')
      .insert({
        user_id: invoice.client_id,
        type: 'invoice_created',
        title: 'New Invoice Generated',
        message: `Invoice ${invoiceData.invoice_number} has been generated for ${invoiceData.currency} ${invoiceData.total.toFixed(2)}`,
        data: {
          invoice_id: invoice.id,
          booking_id: invoice.booking_id,
          amount: invoiceData.total,
          currency: invoiceData.currency
        },
        priority: 'normal'
      })
    
  } catch (error) {
    console.error('❌ Error sending notifications:', error)
    throw error
  }
}

/**
 * Bulk generate invoices for multiple bookings
 */
export async function generateInvoicesForBookings(
  bookingIds: string[],
  options: {
    supabaseUrl?: string
    supabaseKey?: string
    daysUntilDue?: number
    autoSendEmail?: boolean
  } = {}
): Promise<{ successful: number; failed: number; results: InvoiceGenerationResult[] }> {
  console.log(`🔄 Bulk generating invoices for ${bookingIds.length} bookings`)
  
  const results: InvoiceGenerationResult[] = []
  let successful = 0
  let failed = 0
  
  for (const bookingId of bookingIds) {
    const result = await generateInvoiceFromBooking(bookingId, options)
    results.push(result)
    
    if (result.success) {
      successful++
    } else {
      failed++
    }
  }
  
  console.log(`✅ Bulk generation completed: ${successful} successful, ${failed} failed`)
  
  return { successful, failed, results }
}

