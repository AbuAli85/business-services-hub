// Simple test script to verify PDF generation works
// Run this with: node test-pdf-generation.js

const { generateTemplatePDF } = require('./lib/pdf-template-generator');

// Mock invoice data based on your actual data structure
const mockInvoice = {
  id: "b0482c14-ede3-4ab0-b939-75f5544dd8d8",
  invoice_number: "INV-000009",
  amount: 840.000,
  currency: "OMR",
  status: "issued",
  created_at: "2025-09-11T20:50:13.522356+00:00",
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
        name: "Fahad Alamri's Company",
        address: "Muscat, Oman",
        phone: "95153930",
        email: "chairman@falconeyegroup.net",
        website: "falconeyegroup.net",
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
};

async function testPDFGeneration() {
  try {
    console.log('🔍 Testing PDF generation...');
    const pdfBuffer = await generateTemplatePDF(mockInvoice);
    console.log('✅ PDF generated successfully!');
    console.log('📄 PDF size:', pdfBuffer.length, 'bytes');
    
    // Save the PDF to a file for inspection
    const fs = require('fs');
    fs.writeFileSync('test-invoice.pdf', pdfBuffer);
    console.log('💾 PDF saved as test-invoice.pdf');
    
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

testPDFGeneration();
