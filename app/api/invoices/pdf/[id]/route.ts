import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id.replace('.pdf', '')
    
    const supabase = await getSupabaseClient()
    
    // Get the invoice details
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

    // Generate a simple HTML invoice
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
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
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <p>Invoice #${invoice.id}</p>
          <p>Date: ${new Date(invoice.created_at).toLocaleDateString()}</p>
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
