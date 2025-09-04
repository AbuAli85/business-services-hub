import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

function generateInvoiceHTML(invoice: any) {
  const logoUrl = invoice.providers?.company_logo_url || invoice.providers?.logo_url
  const brandBlock = logoUrl
    ? `<img src="${logoUrl}" alt="Logo" style="height:40px;object-fit:contain;"/>`
    : `<div style="font-size:18px;font-weight:700;color:#2563EB;">${invoice.providers?.company_name || 'BusinessHub Provider'}</div>`

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoice.id}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 30px; }
        .invoice-details { margin-bottom: 30px; }
        .client-details, .provider-details { margin-bottom: 20px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background-color: #f2f2f2; }
        .total { text-align: right; font-weight: bold; font-size: 18px; }
        .status { padding: 5px 10px; border-radius: 3px; color: white; }
        .status.paid { background-color: #28a745; }
        .status.issued { background-color: #007bff; }
        .status.draft { background-color: #ffc107; color: black; }
        .virtual-notice { background-color: #e3f2fd; border: 1px solid #2196f3; padding: 10px; margin-bottom: 20px; border-radius: 4px; }
      </style>
    </head>
    <body>
      ${invoice.id?.startsWith('virtual-') ? `<div class="virtual-notice"><strong>Virtual Invoice:</strong> This invoice was generated from your booking data. It will be saved to the database once permissions are updated.</div>` : ''}
      
      <div class="header">
        <div>
          <h1 style="margin:0">INVOICE</h1>
          <p style="margin:4px 0 0 0">Invoice #${invoice.id}</p>
          <p style="margin:4px 0 0 0">Date: ${new Date(invoice.created_at).toLocaleDateString()}</p>
        </div>
        <div style="text-align:right">
          ${brandBlock}
          ${invoice.providers?.company_name ? `<div style="margin-top:6px;color:#6B7280">${invoice.providers.company_name}</div>` : ''}
        </div>
      </div>

      <div class="invoice-details">
        <div class="provider-details">
          <h3>From:</h3>
          <p><strong>${invoice.providers?.full_name || 'Provider'}</strong></p>
          ${invoice.providers?.company_name ? `<p>${invoice.providers.company_name}</p>` : ''}
          <p>${invoice.providers?.email || ''}</p>
          ${invoice.providers?.phone ? `<p>${invoice.providers.phone}</p>` : ''}
        </div>

        <div class="client-details">
          <h3>To:</h3>
          <p><strong>${invoice.clients?.full_name || 'Client'}</strong></p>
          <p>${invoice.clients?.email || ''}</p>
          ${invoice.clients?.phone ? `<p>${invoice.clients.phone}</p>` : ''}
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${invoice.bookings?.services?.title || invoice.bookings?.title || 'Service'}</td>
            <td>${invoice.currency} ${invoice.amount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div class="total">
        <p>Total: ${invoice.currency} ${invoice.amount.toFixed(2)}</p>
        <p>Status: <span class="status ${invoice.status}">${invoice.status.toUpperCase()}</span></p>
      </div>
    </body>
    </html>
  `
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id.replace('.pdf', '')
    
    const supabase = await getSupabaseClient()
    
    // Check if this is a virtual invoice
    if (invoiceId.startsWith('virtual-')) {
      // For virtual invoices, create a simple invoice from the booking ID
      const bookingId = invoiceId.replace('virtual-', '')
      
      // Get booking details
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          title,
          subtotal,
          currency,
          status,
          created_at,
          client_id,
          provider_id,
          services:service_id (
            title,
            description
          )
        `)
        .eq('id', bookingId)
        .single()

      if (bookingError || !booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }

      // Get client and provider details
      const { data: client } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', booking.client_id)
        .single()

      const { data: provider } = await supabase
        .from('profiles')
        .select('full_name, email, phone, company_name')
        .eq('id', booking.provider_id)
        .single()

      // Create virtual invoice object
      const virtualInvoice = {
        id: invoiceId,
        booking_id: booking.id,
        amount: booking.subtotal || 0,
        currency: booking.currency || 'OMR',
        status: booking.status === 'paid' ? 'paid' : 'issued',
        created_at: booking.created_at,
        bookings: booking,
        clients: client,
        providers: provider
      }

      // Generate HTML for virtual invoice
      const htmlContent = generateInvoiceHTML(virtualInvoice)
      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `inline; filename="invoice-${invoiceId}.html"`
        }
      })
    }
    
    // Get the invoice details from database
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        bookings:booking_id (
          id,
          title,
          subtotal,
          currency,
          services:service_id (
            title,
            description
          )
        ),
        clients:client_id (
          full_name,
          email,
          phone
        ),
        providers:provider_id (
          full_name,
          email,
          phone,
          company_name
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Generate HTML for regular invoice
    const htmlContent = generateInvoiceHTML(invoice)

    // Return HTML content (in a real implementation, you would convert this to PDF)
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="invoice-${invoiceId}.html"`
      }
    })

  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
