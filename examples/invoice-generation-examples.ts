/**
 * Invoice Generation Examples
 * 
 * Practical examples for using the automated invoice generation system
 */

import { generateInvoiceFromBooking, generateInvoicesForBookings } from '@/lib/workflows/generateInvoiceAutomated'
import { fetchBookingForInvoice, mapBookingToInvoiceData } from '@/lib/invoice-data-fetcher'
import { generateAutomatedInvoicePDF } from '@/lib/pdf-generator-automated'

// ==================== Example 1: Single Invoice Generation ====================

export async function example1_GenerateSingleInvoice() {
  const bookingId = 'your-booking-uuid-here'
  
  const result = await generateInvoiceFromBooking(bookingId, {
    daysUntilDue: 30,
    autoSendEmail: true
  })
  
  if (result.success) {
    console.log('✅ Invoice created successfully!')
    console.log('Invoice ID:', result.invoice?.id)
    console.log('Invoice Number:', result.invoiceData?.invoice_number)
    console.log('Total Amount:', result.invoiceData?.total)
    console.log('PDF URL:', result.pdfUrl)
  } else {
    console.error('❌ Failed to create invoice:', result.error)
  }
}

// ==================== Example 2: Bulk Invoice Generation ====================

export async function example2_BulkGeneration() {
  const bookingIds = [
    'booking-uuid-1',
    'booking-uuid-2',
    'booking-uuid-3'
  ]
  
  const result = await generateInvoicesForBookings(bookingIds, {
    daysUntilDue: 30,
    autoSendEmail: false // Don't send emails during bulk operations
  })
  
  console.log(`Generated ${result.successful} invoices`)
  console.log(`Failed: ${result.failed}`)
  
  // Check individual results
  result.results.forEach((r, index) => {
    if (r.success) {
      console.log(`✅ Booking ${bookingIds[index]}: ${r.invoice?.invoice_number}`)
    } else {
      console.log(`❌ Booking ${bookingIds[index]}: ${r.error}`)
    }
  })
}

// ==================== Example 3: API Call (Frontend) ====================

export async function example3_APICall() {
  try {
    const response = await fetch('/api/invoices/generate-automated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: 'your-booking-uuid',
        options: {
          daysUntilDue: 30,
          autoSendEmail: true
        }
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      console.log('Invoice created:', data.invoice)
      console.log('PDF URL:', data.pdf_url)
    } else {
      console.error('Error:', data.error)
    }
  } catch (error) {
    console.error('API call failed:', error)
  }
}

// ==================== Example 4: Auto-Generate on Booking Approval ====================

export async function example4_OnBookingApproval(bookingId: string) {
  // This would be called from your booking approval workflow
  
  console.log('📋 Booking approved, generating invoice...')
  
  const result = await generateInvoiceFromBooking(bookingId, {
    daysUntilDue: 30,
    autoSendEmail: true
  })
  
  if (result.success) {
    console.log('✅ Invoice auto-generated:', result.invoice?.invoice_number)
    
    // Optional: Update booking with invoice reference
    // await updateBooking(bookingId, { invoice_id: result.invoice?.id })
  } else {
    console.error('⚠️ Failed to auto-generate invoice:', result.error)
    // Handle error - maybe retry later or notify admin
  }
}

// ==================== Example 5: Manual Data Flow ====================

export async function example5_ManualDataFlow() {
  const bookingId = 'your-booking-uuid'
  
  // Step 1: Fetch booking data
  const booking = await fetchBookingForInvoice(
    bookingId,
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  if (!booking) {
    console.error('Booking not found')
    return
  }
  
  console.log('Booking data:', {
    id: booking.id,
    amount: booking.amount,
    provider: booking.service?.provider?.full_name,
    client: booking.client?.full_name
  })
  
  // Step 2: Map to invoice structure
  const invoiceNumber = `INV-${Date.now()}`
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 30)
  
  const invoiceData = mapBookingToInvoiceData(booking, invoiceNumber, dueDate)
  
  if (!invoiceData) {
    console.error('Failed to map invoice data')
    return
  }
  
  console.log('Invoice data:', {
    invoiceNumber: invoiceData.invoice_number,
    provider: invoiceData.provider.company,
    client: invoiceData.client.company,
    subtotal: invoiceData.subtotal,
    vat: invoiceData.vat_amount,
    total: invoiceData.total
  })
  
  // Step 3: Generate PDF
  const pdfBuffer = await generateAutomatedInvoicePDF(invoiceData)
  console.log('PDF generated, size:', pdfBuffer.length, 'bytes')
  
  // You can now upload the PDF or save the invoice record manually
}

// ==================== Example 6: Schedule Job (Cron) ====================

export async function example6_ScheduledInvoiceGeneration() {
  // This would run daily via cron job
  console.log('🕐 Running scheduled invoice generation...')
  
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/invoices/generate-automated`,
      { method: 'GET' }
    )
    
    const data = await response.json()
    
    console.log(`✅ Generated ${data.successful} invoices`)
    if (data.failed > 0) {
      console.warn(`⚠️ ${data.failed} invoices failed`)
      // Send alert to admin
    }
  } catch (error) {
    console.error('❌ Scheduled job failed:', error)
    // Send alert to admin
  }
}

// ==================== Example 7: Error Handling ====================

export async function example7_ErrorHandling() {
  const bookingId = 'your-booking-uuid'
  
  const result = await generateInvoiceFromBooking(bookingId, {
    autoSendEmail: true
  })
  
  if (!result.success) {
    // Handle different error scenarios
    if (result.error?.includes('already exists')) {
      console.log('ℹ️ Invoice already exists for this booking')
      // Maybe fetch the existing invoice
    } else if (result.error?.includes('not found')) {
      console.error('❌ Booking not found')
      // Handle missing booking
    } else if (result.error?.includes('missing required relations')) {
      console.error('❌ Booking data incomplete')
      // Notify admin to fix booking data
    } else {
      console.error('❌ Unexpected error:', result.error)
      // Log to error tracking service
    }
  }
}

// ==================== Example 8: Testing Without Email ====================

export async function example8_TestingMode() {
  // For testing - generates invoice but doesn't send emails
  const result = await generateInvoiceFromBooking('test-booking-uuid', {
    daysUntilDue: 30,
    autoSendEmail: false // Disable emails for testing
  })
  
  if (result.success) {
    console.log('✅ Test invoice created (no emails sent)')
    console.log('Invoice:', result.invoice)
    console.log('PDF:', result.pdfUrl)
  }
}

// ==================== Example 9: Integration with Make.com ====================

export async function example9_MakeComWebhook() {
  // This would be called by Make.com when a booking is approved
  // Make.com sends HTTP POST with booking data
  
  // In your Make.com scenario:
  // 1. Watch Bookings table for status = 'approved'
  // 2. HTTP POST to this endpoint with bookingId
  // 3. Store response in Make.com for further processing
  
  const bookingId = 'from-make-webhook'
  
  const result = await generateInvoiceFromBooking(bookingId, {
    autoSendEmail: true
  })
  
  // Return structured response for Make.com
  return {
    success: result.success,
    invoiceId: result.invoice?.id,
    invoiceNumber: result.invoiceData?.invoice_number,
    pdfUrl: result.pdfUrl,
    error: result.error
  }
}

// ==================== Example 10: React Component Usage ====================

export function Example10_ReactComponent() {
  // Example React component for manual invoice generation
  
  const handleGenerateInvoice = async (bookingId: string) => {
    try {
      const response = await fetch('/api/invoices/generate-automated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`Invoice ${data.invoice.invoice_number} created!`)
        // Redirect to invoice page
        window.location.href = `/dashboard/invoices/${data.invoice.id}`
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to generate invoice:', error)
      alert('Failed to generate invoice. Please try again.')
    }
  }
  
  return (
    <button onClick={() => handleGenerateInvoice('booking-id-here')}>
      Generate Invoice
    </button>
  )
}

// ==================== Helper: Check Booking is Ready for Invoice ====================

export async function checkBookingReadyForInvoice(bookingId: string): Promise<{
  ready: boolean
  issues: string[]
}> {
  const booking = await fetchBookingForInvoice(
    bookingId,
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const issues: string[] = []
  
  if (!booking) {
    issues.push('Booking not found')
    return { ready: false, issues }
  }
  
  if (!booking.client) {
    issues.push('Client information missing')
  }
  
  if (!booking.service?.provider) {
    issues.push('Provider information missing')
  }
  
  if (!booking.amount || booking.amount <= 0) {
    issues.push('Invalid booking amount')
  }
  
  return {
    ready: issues.length === 0,
    issues
  }
}

