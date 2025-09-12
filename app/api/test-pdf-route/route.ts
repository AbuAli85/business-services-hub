import { NextRequest, NextResponse } from 'next/server'
import { generateProfessionalPDF, shouldRegeneratePDF } from '@/lib/pdf-invoice-generator'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing PDF generator import...')
    
    // Test the shouldRegeneratePDF function
    const testInvoice = {
      pdf_url: 'https://example.com/test.pdf',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
    
    const shouldRegenerate = shouldRegeneratePDF(testInvoice)
    console.log('✅ shouldRegeneratePDF test:', shouldRegenerate)
    
    // Test basic PDF generation with minimal data
    const testInvoiceData = {
      id: 'test-123',
      invoice_number: 'TEST-001',
      created_at: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      amount: 100,
      subtotal: 100,
      tax_rate: 0,
      tax_amount: 0,
      total_amount: 100,
      provider: {
        full_name: 'Test Provider',
        company: {
          name: 'Test Company',
          address: '123 Test St',
          phone: '555-1234',
          email: 'test@example.com'
        }
      },
      client: {
        full_name: 'Test Client',
        email: 'client@example.com'
      },
      invoice_items: []
    }
    
    console.log('🔍 Generating test PDF...')
    const pdfBuffer = await generateProfessionalPDF(testInvoiceData)
    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes')
    
    return NextResponse.json({ 
      success: true, 
      message: 'PDF generator is working',
      pdfSize: pdfBuffer.length,
      shouldRegenerate
    })
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
