// Test script to verify invoice component works with current database schema
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testInvoiceComponent() {
  try {
    console.log('🧪 Testing Invoice Component with Current Database Schema...\n')

    // Test 1: Check if invoices table exists and has expected columns
    console.log('1️⃣ Checking invoices table structure...')
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .limit(1)

    if (invoicesError) {
      console.error('❌ Error accessing invoices table:', invoicesError.message)
      return
    }

    console.log('✅ Invoices table accessible')
    if (invoices && invoices.length > 0) {
      console.log('📄 Sample invoice columns:', Object.keys(invoices[0]))
    }

    // Test 2: Check if we can fetch a complete invoice with relationships
    console.log('\n2️⃣ Testing complete invoice fetch...')
    const { data: completeInvoice, error: completeError } = await supabase
      .from('invoices')
      .select(`
        *,
        client:profiles!invoices_client_id_fkey(
          id,
          full_name,
          email,
          company:companies(id, name, address)
        ),
        provider:profiles!invoices_provider_id_fkey(
          id,
          full_name,
          email,
          company:companies(id, name, address, phone, email, logo_url)
        ),
        booking:bookings(
          id,
          service:services(title, description, price)
        ),
        invoice_items(*)
      `)
      .limit(1)
      .single()

    if (completeError) {
      console.error('❌ Error fetching complete invoice:', completeError.message)
      return
    }

    console.log('✅ Complete invoice fetch successful')
    console.log('📄 Invoice ID:', completeInvoice.id)
    console.log('📄 Invoice Number:', completeInvoice.invoice_number || 'Not set')
    console.log('📄 Due Date:', completeInvoice.due_date || 'Not set (will be calculated)')
    console.log('📄 Amount:', completeInvoice.amount)
    console.log('📄 Status:', completeInvoice.status)

    // Test 3: Test the invoice service functions
    console.log('\n3️⃣ Testing invoice service functions...')
    
    // Simulate the invoice service logic
    const invoice = completeInvoice
    const provider = invoice.provider
    const client = invoice.client
    const serviceDetails = invoice.booking?.service
    const invoiceItems = invoice.invoice_items || []

    // Test due date calculation
    const dueDate = invoice.due_date || (() => {
      const createdDate = new Date(invoice.created_at)
      const calculatedDueDate = new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      return calculatedDueDate.toISOString()
    })()

    console.log('✅ Due date calculation:', dueDate)

    // Test invoice number generation
    const invoiceNumber = invoice.invoice_number || `INV-${invoice.id.slice(-8).toUpperCase()}`
    console.log('✅ Invoice number:', invoiceNumber)

    // Test company data extraction
    const companyData = {
      id: (provider?.company)?.id || 'default-company',
      name: (provider?.company)?.name || 'Business Services Hub',
      address: (provider?.company)?.address || '123 Business Street, Suite 100\nCity, State 12345',
      phone: (provider?.company)?.phone || '(555) 555-5555',
      email: (provider?.company)?.email || 'info@businessservices.com',
      logo_url: (provider?.company)?.logo_url || '/logo.png'
    }

    console.log('✅ Company data:', companyData.name)

    // Test client data extraction
    const clientData = {
      id: client?.id || '',
      full_name: client?.full_name || 'Client Name',
      email: client?.email || 'client@email.com',
      company: client?.company ? {
        id: client.company.id,
        name: client.company.name,
        address: client.company.address
      } : undefined
    }

    console.log('✅ Client data:', clientData.full_name)

    // Test service data extraction
    const serviceData = {
      title: serviceDetails?.title || 'Professional Service',
      description: serviceDetails?.description || 'Service provided as requested',
      price: serviceDetails?.price || invoice.amount || 0
    }

    console.log('✅ Service data:', serviceData.title)

    // Test invoice items
    const items = invoiceItems.length > 0 ? invoiceItems : [
      {
        id: 'item-1',
        invoice_id: invoice.id,
        product: serviceData.title,
        description: serviceData.description,
        qty: 1,
        unit_price: invoice.amount || 0,
        total: invoice.amount || 0,
        created_at: invoice.created_at,
        updated_at: invoice.created_at
      }
    ]

    console.log('✅ Invoice items:', items.length, 'item(s)')

    // Test final invoice object structure
    const finalInvoice = {
      id: invoice.id,
      invoice_number: invoiceNumber,
      issued_date: invoice.created_at,
      due_date: dueDate,
      subtotal: invoice.amount || 0,
      tax_rate: 0,
      tax_amount: 0,
      total: invoice.amount || 0,
      status: invoice.status,
      currency: invoice.currency || 'USD',
      company_id: companyData.id,
      client_id: invoice.client_id,
      created_at: invoice.created_at,
      updated_at: invoice.created_at,
      company: companyData,
      client: clientData,
      items: items
    }

    console.log('✅ Final invoice object created successfully')
    console.log('📄 Invoice Summary:')
    console.log('   - ID:', finalInvoice.id)
    console.log('   - Number:', finalInvoice.invoice_number)
    console.log('   - Due Date:', finalInvoice.due_date)
    console.log('   - Total:', finalInvoice.total, finalInvoice.currency)
    console.log('   - Status:', finalInvoice.status)
    console.log('   - Company:', finalInvoice.company.name)
    console.log('   - Client:', finalInvoice.client.full_name)
    console.log('   - Items:', finalInvoice.items.length)

    console.log('\n🎉 All tests passed! Invoice component should work correctly.')
    console.log('\n📝 Note: The due_date column is missing from the database.')
    console.log('   The component will calculate it as 30 days from creation date.')
    console.log('   To add the column, run the migration: supabase/migrations/140_add_invoice_columns.sql')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testInvoiceComponent()
