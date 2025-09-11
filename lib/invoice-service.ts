import { createClient } from '@supabase/supabase-js'
import { Invoice, Company, Client, InvoiceItem } from '@/types/invoice'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Utility function to format currency
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

// Utility function to format date
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Fetch invoice data from Supabase with proper joins
export const fetchInvoiceData = async (invoiceId: string): Promise<Invoice | null> => {
  try {
    // First, get the invoice with basic details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        created_at,
        due_date,
        amount,
        currency,
        status,
        booking_id,
        client_id,
        provider_id
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError) {
      console.error('Error fetching invoice:', invoiceError)
      return null
    }

    if (!invoice) {
      return null
    }

    // Get client information
    const { data: client, error: clientError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        company:companies(
          id,
          name,
          address
        )
      `)
      .eq('id', invoice.client_id)
      .single()

    if (clientError) {
      console.error('Error fetching client:', clientError)
    }

    // Get provider/company information
    const { data: provider, error: providerError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        company:companies(
          id,
          name,
          address,
          phone,
          email,
          logo_url
        )
      `)
      .eq('id', invoice.provider_id)
      .single()

    if (providerError) {
      console.error('Error fetching provider:', providerError)
    }

    // Get service details from booking
    let serviceDetails = null
    if (invoice.booking_id) {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          service:services(
            title,
            description,
            price
          )
        `)
        .eq('id', invoice.booking_id)
        .single()

      if (!bookingError && booking) {
        serviceDetails = booking.service
      }
    }

    // Transform the data to match our Invoice interface
    const transformedInvoice: Invoice = {
      id: invoice.id,
      invoice_number: invoice.invoice_number || `INV-${invoice.id.slice(-8).toUpperCase()}`,
      issued_date: invoice.created_at,
      due_date: invoice.due_date || (() => {
        // Calculate due date as 30 days from creation if not set
        const createdDate = new Date(invoice.created_at)
        const dueDate = new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000)
        return dueDate.toISOString()
      })(),
      subtotal: invoice.amount || 0,
      tax_rate: 0, // Default to 0% tax - you can add this to your invoices table
      tax_amount: 0,
      total: invoice.amount || 0,
      status: invoice.status as any,
      currency: invoice.currency || 'USD',
      company_id: (provider?.company as any)?.id || 'default-company',
      client_id: invoice.client_id,
      created_at: invoice.created_at,
      updated_at: invoice.created_at,
      company: {
        id: (provider?.company as any)?.id || 'default-company',
        name: (provider?.company as any)?.name || 'Business Services Hub',
        address: (provider?.company as any)?.address || '123 Business Street, Suite 100\nCity, State 12345',
        phone: (provider?.company as any)?.phone || '(555) 555-5555',
        email: (provider?.company as any)?.email || 'info@businessservices.com',
        logo_url: (provider?.company as any)?.logo_url || null
      },
      client: {
        id: client?.id || '',
        full_name: client?.full_name || 'Client Name',
        email: client?.email || 'client@email.com',
        company: client?.company ? {
          id: (client.company as any).id,
          name: (client.company as any).name,
          address: (client.company as any).address
        } : undefined
      },
      items: [
        {
          id: 'item-1',
          invoice_id: invoice.id,
          product: (serviceDetails as any)?.title || 'Professional Service',
          description: (serviceDetails as any)?.description || 'Service provided as requested',
          qty: 1,
          unit_price: invoice.amount || 0,
          total: invoice.amount || 0,
          created_at: invoice.created_at,
          updated_at: invoice.created_at
        }
      ]
    }

    return transformedInvoice
  } catch (error) {
    console.error('Error in fetchInvoiceData:', error)
    return null
  }
}

// Fetch all invoices for a client
export const fetchClientInvoices = async (clientId: string): Promise<Invoice[]> => {
  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        created_at,
        due_date,
        amount,
        currency,
        status,
        booking_id,
        client_id,
        provider_id
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching client invoices:', error)
      return []
    }

    // Transform each invoice
    const transformedInvoices: Invoice[] = []
    
    for (const invoice of invoices || []) {
      const fullInvoice = await fetchInvoiceData(invoice.id)
      if (fullInvoice) {
        transformedInvoices.push(fullInvoice)
      }
    }

    return transformedInvoices
  } catch (error) {
    console.error('Error in fetchClientInvoices:', error)
    return []
  }
}

// Create a new invoice
export const createInvoice = async (invoiceData: Partial<Invoice>): Promise<Invoice | null> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceData.invoice_number,
        amount: invoiceData.total,
        currency: invoiceData.currency || 'USD',
        status: invoiceData.status || 'draft',
        client_id: invoiceData.client_id,
        provider_id: invoiceData.company_id,
        booking_id: (invoiceData as any).booking_id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invoice:', error)
      return null
    }

    return await fetchInvoiceData(data.id)
  } catch (error) {
    console.error('Error in createInvoice:', error)
    return null
  }
}

// Update invoice status
export const updateInvoiceStatus = async (invoiceId: string, status: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', invoiceId)

    if (error) {
      console.error('Error updating invoice status:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateInvoiceStatus:', error)
    return false
  }
}
