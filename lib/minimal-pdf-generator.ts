import { jsPDF } from 'jspdf'

export async function generateMinimalPDF(invoiceData: any): Promise<Uint8Array> {
  try {
    console.log('🔍 Minimal PDF Generator - Starting')
    
    // Create a simple PDF
    const doc = new jsPDF('p', 'mm', 'a4')
    
    // Add some basic text
    doc.setFont('helvetica')
    doc.setFontSize(20)
    doc.text('INVOICE', 20, 20)
    
    doc.setFontSize(12)
    doc.text(`Invoice #: ${invoiceData.invoice_number || 'N/A'}`, 20, 40)
    doc.text(`Amount: ${invoiceData.amount || 0} ${invoiceData.currency || 'OMR'}`, 20, 50)
    
    // Provider info
    const providerName = invoiceData.booking?.service?.provider?.company?.[0]?.name || 'Provider Company'
    doc.text(`From: ${providerName}`, 20, 70)
    
    // Client info
    const clientName = invoiceData.booking?.client?.full_name || 'Client Name'
    doc.text(`To: ${clientName}`, 20, 90)
    
    // Service info
    const serviceTitle = invoiceData.booking?.service?.title || 'Service'
    doc.text(`Service: ${serviceTitle}`, 20, 110)
    
    console.log('✅ Minimal PDF generated successfully')
    return new Uint8Array(doc.output('arraybuffer'))
    
  } catch (error) {
    console.error('❌ Minimal PDF Generator - Error:', error)
    console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}
