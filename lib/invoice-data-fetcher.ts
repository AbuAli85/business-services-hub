/**
 * Invoice Data Fetcher
 * 
 * Automated invoice data fetching and mapping from Supabase.
 * Fetches booking, provider, client, and service details dynamically.
 */

import { createClient } from '@supabase/supabase-js'

// ==================== Types ====================

export interface InvoiceDataComplete {
  // Invoice Core
  id: string
  invoice_number: string
  created_at: string
  due_date: string
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'
  
  // Provider Information
  provider: {
    id: string
    name: string
    company: string
    email: string
    phone: string
    address: string
    website?: string
    logo_url?: string
    vat_number?: string
    cr_number?: string
  }
  
  // Client Information
  client: {
    id: string
    name: string
    company: string
    email: string
    phone: string
    address: string
    website?: string
  }
  
  // Service/Items
  items: Array<{
    id?: string
    product: string
    description: string
    qty: number
    unit_price: number
    total: number
  }>
  
  // Financial
  currency: string
  subtotal: number
  vat_rate: number
  vat_amount: number
  total: number
  
  // Additional
  notes?: string
  payment_terms?: string
  booking_id?: string
}

export interface BookingDataForInvoice {
  id: string
  client_id: string
  provider_id: string
  service_id: string
  amount: number
  currency: string
  status: string
  created_at: string
  scheduled_date?: string
  requirements?: any
  
  // Relations
  service?: {
    id: string
    title: string
    description?: string
    base_price?: number
    provider?: {
      id: string
      full_name: string
      email?: string
      phone?: string
      company?: {
        name: string
        address?: string
        phone?: string
        email?: string
        website?: string
        logo_url?: string
        vat_number?: string
        cr_number?: string
      }
    }
  }
  
  client?: {
    id: string
    full_name: string
    email?: string
    phone?: string
    company?: {
      name: string
      address?: string
      phone?: string
      email?: string
      website?: string
    }
  }
}

// ==================== Main Data Fetcher ====================

/**
 * Fetch complete booking data with all relations for invoice generation
 */
export async function fetchBookingForInvoice(
  bookingId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<BookingDataForInvoice | null> {
  try {
    console.log('📊 Fetching booking data for invoice generation:', bookingId)
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Comprehensive query with all necessary relations
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        id,
        client_id,
        provider_id,
        service_id,
        amount,
        currency,
        status,
        created_at,
        scheduled_date,
        requirements,
        service:services (
          id,
          title,
          description,
          base_price,
          provider:profiles!services_provider_id_fkey (
            id,
            full_name,
            email,
            phone,
            company:companies (
              name,
              address,
              phone,
              email,
              website,
              logo_url,
              vat_number,
              cr_number
            )
          )
        ),
        client:profiles!bookings_client_id_fkey (
          id,
          full_name,
          email,
          phone,
          company:companies (
            name,
            address,
            phone,
            email,
            website
          )
        )
      `)
      .eq('id', bookingId)
      .single()
    
    if (error) {
      console.error('❌ Error fetching booking:', error)
      return null
    }
    
    if (!booking) {
      console.error('❌ Booking not found:', bookingId)
      return null
    }
    
    console.log('✅ Booking data fetched successfully')
    return booking as unknown as BookingDataForInvoice
    
  } catch (error) {
    console.error('❌ Unexpected error fetching booking data:', error)
    return null
  }
}

/**
 * Fetch existing invoice with all relations
 */
export async function fetchInvoiceWithRelations(
  invoiceId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<any | null> {
  try {
    console.log('📊 Fetching invoice with relations:', invoiceId)
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        client:profiles!invoices_client_id_fkey (
          id,
          full_name,
          email,
          phone,
          company:companies (
            id,
            name,
            address,
            phone,
            email,
            website
          )
        ),
        provider:profiles!invoices_provider_id_fkey (
          id,
          full_name,
          email,
          phone,
          company:companies (
            id,
            name,
            address,
            phone,
            email,
            website,
            logo_url,
            vat_number,
            cr_number
          )
        ),
        booking:bookings!invoices_booking_id_fkey (
          id,
          status,
          service:services (
            id,
            title,
            description,
            base_price
          )
        )
      `)
      .eq('id', invoiceId)
      .single()
    
    if (invoiceError) {
      console.error('❌ Error fetching invoice:', invoiceError)
      return null
    }
    
    if (!invoice) {
      console.error('❌ Invoice not found:', invoiceId)
      return null
    }
    
    // Fetch invoice items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
    
    if (itemsError) {
      console.warn('⚠️ Could not load invoice items:', itemsError)
    }
    
    console.log('✅ Invoice data fetched successfully')
    return { ...invoice, invoice_items: items || [] }
    
  } catch (error) {
    console.error('❌ Unexpected error fetching invoice:', error)
    return null
  }
}

// ==================== Data Mapping ====================

/**
 * Map booking data to complete invoice data structure for PDF generation
 */
export function mapBookingToInvoiceData(
  booking: BookingDataForInvoice,
  invoiceNumber: string,
  dueDate: Date
): InvoiceDataComplete | null {
  try {
    console.log('🔄 Mapping booking data to invoice structure')
    
    // Validate required data
    if (!booking.client || !booking.service?.provider) {
      console.error('❌ Missing required booking relations (client or provider)')
      console.error('Booking structure:', {
        hasClient: !!booking.client,
        hasService: !!booking.service,
        hasProvider: !!booking.service?.provider
      })
      return null
    }
    
    // Provider information with safe fallbacks
    const providerProfile = booking.service.provider
    const providerCompanyRaw: any = providerProfile.company || {}
    
    const provider = {
      id: providerProfile.id,
      name: providerProfile.full_name || 'Provider Name',
      company: providerCompanyRaw.name || providerProfile.full_name || 'Company Name',
      email: providerCompanyRaw.email || providerProfile.email || '',
      phone: providerCompanyRaw.phone || providerProfile.phone || '',
      address: providerCompanyRaw.address || 'Address not provided',
      website: providerCompanyRaw.website,
      logo_url: providerCompanyRaw.logo_url,
      vat_number: providerCompanyRaw.vat_number,
      cr_number: providerCompanyRaw.cr_number
    }
    
    // Client information with safe fallbacks
    const clientProfile = booking.client
    const clientCompanyRaw: any = clientProfile.company || {}
    
    const client = {
      id: clientProfile.id,
      name: clientProfile.full_name || 'Client Name',
      company: clientCompanyRaw.name || clientProfile.full_name || 'Client Company',
      email: clientProfile.email || '',
      phone: clientProfile.phone || '',
      address: clientCompanyRaw.address || 'Address not provided',
      website: clientCompanyRaw.website
    }
    
    // Financial calculations
    const subtotal = booking.amount || booking.service.base_price || 0
    const vatRate = 5.0 // Default VAT for Oman (5%)
    const vatAmount = Math.round((subtotal * vatRate / 100) * 100) / 100
    const total = subtotal + vatAmount
    
    // Service/Items
    const items = [{
      product: booking.service.title || 'Professional Service',
      description: booking.service.description || 'High-quality professional service',
      qty: 1,
      unit_price: subtotal,
      total: subtotal
    }]
    
    // Construct complete invoice data
    const invoiceData: InvoiceDataComplete = {
      id: '', // Will be set after insertion
      invoice_number: invoiceNumber,
      created_at: new Date().toISOString(),
      due_date: dueDate.toISOString(),
      status: 'issued',
      provider,
      client,
      items,
      currency: booking.currency || 'OMR',
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total,
      payment_terms: 'Payment due within 30 days',
      notes: `Invoice for ${booking.service.title} - Booking #${booking.id.slice(0, 8)}`,
      booking_id: booking.id
    }
    
    console.log('✅ Invoice data mapped successfully')
    return invoiceData
    
  } catch (error) {
    console.error('❌ Error mapping booking to invoice data:', error)
    return null
  }
}

/**
 * Map existing invoice database record to complete structure for PDF
 */
export function mapInvoiceToCompleteData(invoice: any): InvoiceDataComplete | null {
  try {
    console.log('🔄 Mapping invoice database record to complete structure')
    
    // Validate required relations
    if (!invoice.client || !invoice.provider) {
      console.error('❌ Missing required invoice relations')
      return null
    }
    
    // Provider information
    const providerProfile = invoice.provider
    const providerCompanyRaw: any = providerProfile.company || {}
    
    const provider = {
      id: providerProfile.id,
      name: providerProfile.full_name || 'Provider Name',
      company: providerCompanyRaw.name || providerProfile.full_name || 'Company Name',
      email: providerCompanyRaw.email || providerProfile.email || '',
      phone: providerCompanyRaw.phone || providerProfile.phone || '',
      address: providerCompanyRaw.address || 'Address not provided',
      website: providerCompanyRaw.website,
      logo_url: providerCompanyRaw.logo_url,
      vat_number: providerCompanyRaw.vat_number,
      cr_number: providerCompanyRaw.cr_number
    }
    
    // Client information
    const clientProfile = invoice.client
    const clientCompanyRaw: any = clientProfile.company || {}
    
    const client = {
      id: clientProfile.id,
      name: clientProfile.full_name || 'Client Name',
      company: clientCompanyRaw.name || clientProfile.full_name || 'Client Company',
      email: clientProfile.email || '',
      phone: clientProfile.phone || '',
      address: clientCompanyRaw.address || 'Address not provided',
      website: clientCompanyRaw.website
    }
    
    // Items - from invoice_items or booking service
    const items = invoice.invoice_items && invoice.invoice_items.length > 0
      ? invoice.invoice_items.map((item: any) => ({
          id: item.id,
          product: item.product || item.description || 'Service',
          description: item.description || '',
          qty: item.quantity || item.qty || 1,
          unit_price: item.unit_price || 0,
          total: item.total || (item.unit_price * (item.quantity || 1))
        }))
      : [{
          product: invoice.booking?.service?.title || 'Professional Service',
          description: invoice.booking?.service?.description || '',
          qty: 1,
          unit_price: invoice.subtotal || invoice.amount || 0,
          total: invoice.subtotal || invoice.amount || 0
        }]
    
    // Financial
    const subtotal = invoice.subtotal || invoice.amount || 0
    const vatRate = invoice.vat_percent || 5.0
    const vatAmount = invoice.vat_amount || Math.round((subtotal * vatRate / 100) * 100) / 100
    const total = invoice.total_amount || invoice.total || (subtotal + vatAmount)
    
    const invoiceData: InvoiceDataComplete = {
      id: invoice.id,
      invoice_number: invoice.invoice_number || `INV-${invoice.id.slice(-8).toUpperCase()}`,
      created_at: invoice.created_at,
      due_date: invoice.due_date || new Date(Date.now() + 30 * 86400000).toISOString(),
      status: invoice.status || 'issued',
      provider,
      client,
      items,
      currency: invoice.currency || 'OMR',
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total,
      payment_terms: invoice.payment_terms || 'Payment due within 30 days',
      notes: invoice.notes,
      booking_id: invoice.booking_id
    }
    
    console.log('✅ Invoice data mapped to complete structure')
    return invoiceData
    
  } catch (error) {
    console.error('❌ Error mapping invoice to complete data:', error)
    return null
  }
}

// ==================== Invoice Generation Helper ====================

/**
 * Generate invoice number
 */
export function generateInvoiceNumber(existingCount: number = 0): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const sequence = existingCount + 1
  
  return `INV-${year}${month}-${String(sequence).padStart(4, '0')}`
}

/**
 * Calculate due date (default: 30 days from now)
 */
export function calculateDueDate(daysFromNow: number = 30): Date {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + daysFromNow)
  return dueDate
}

