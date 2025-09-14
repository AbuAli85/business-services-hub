import { NextRequest, NextResponse } from 'next/server'
import { generateTemplatePDF } from '@/lib/pdf-template-generator'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing invoice template with specific ID: b0482c14-ede3-4ab0-b939-75f5544dd8d8')
    
    // Mock invoice data based on the specific invoice ID you mentioned
    const mockInvoice = {
      id: "b0482c14-ede3-4ab0-b939-75f5544dd8d8",
      invoice_number: "INV-000009",
      amount: 840.000,
      currency: "OMR",
      status: "issued",
      subtotal: 800,
      vat_percent: 5,
      vat_amount: 40,
      total_amount: 840,
      created_at: "2025-09-11T20:50:13.522356+00:00",
      due_date: "2025-10-11T20:50:13.522356+00:00",
      booking: {
        id: "087c823e-2198-434f-aed1-c80939d9fee5",
        status: "approved",
        client: {
          id: "4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b",
          full_name: "Fahad Alamri",
          email: "chairman@falconeyegroup.net",
          phone: "95153930",
          company: [{
            id: "31741f22-7372-4f5f-9c3d-0fe7455b46dd",
            name: "falcon eye group",
            address: "PO. Box 762, PC. 122, Al Khuwair, Muscat Grand Mall, Oman",
            phone: "95153930",
            email: "chairman@falconeyegroup.net",
            website: "https://yourwebsite.com",
            logo_url: null
          }]
        },
        service: {
          id: "770e8400-e29b-41d4-a716-446655440001",
          title: "Website Development",
          description: "Custom website development using modern technologies like React and Next.js. Perfect for businesses looking to establish their online presence.",
          provider: {
            id: "d2ce1fe9-806f-4dbc-8efb-9cf160f19e4b",
            full_name: "fahad alamri",
            email: "luxsess2001@hotmail.com",
            phone: "95153930",
            company: [{
              id: "4af8c59e-5f85-4428-95e8-a5f5b904a59c",
              name: "smartPRO",
              address: "PO. Box 354, PC. 133, Al Khuwair",
              phone: "95153930",
              email: "chairman@falconeyegroup.net",
              website: "https://thesmartpro.io",
              logo_url: "https://reootcngcptfogfozlmz.supabase.co/storage/v1/object/public/company-assets/company-logos/1755940991498-3gz3eqv6vrc.jpg"
            }]
          }
        }
      }
    }

    console.log('🔍 Mock invoice data:', JSON.stringify(mockInvoice, null, 2))
    
    // Test PDF generation
    const pdfBuffer = await generateTemplatePDF(mockInvoice as any)
    console.log('✅ PDF generated successfully! Size:', pdfBuffer.length, 'bytes')

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="test-invoice-template.pdf"',
      },
    })
  } catch (error) {
    console.error('❌ Test failed:', error)
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
