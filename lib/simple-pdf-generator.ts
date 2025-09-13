import { jsPDF } from 'jspdf'

export async function generateSimplePDF(invoiceData: any): Promise<Uint8Array> {
  try {
    console.log('🔍 Simple PDF Generator - Starting with invoice:', invoiceData.id)
    
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    
    // Colors
    const primaryColor = [59, 130, 246] // Blue
    const textColor = [31, 41, 55] // Gray-800
    const lightTextColor = [107, 114, 128] // Gray-500
    
    // Set font
    doc.setFont('helvetica')
    
    // Header
    doc.setFillColor(...primaryColor)
    doc.rect(0, 0, pageWidth, 30, 'F')
    
    // Company name
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    const companyName = invoiceData.booking?.service?.provider?.company?.[0]?.name ?? 'Provider Company'
    doc.text(companyName, 20, 20)
    
    // Invoice title
    doc.setTextColor(...textColor)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('INVOICE', pageWidth - 60, 20)
    
    // Invoice number
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    const invoiceNumber = invoiceData.invoice_number ?? `INV-${invoiceData.id.slice(-8).toUpperCase()}`
    doc.text(`Invoice #: ${invoiceNumber}`, pageWidth - 60, 30)
    
    // Date
    const invoiceDate = new Date(invoiceData.created_at).toLocaleDateString()
    doc.text(`Date: ${invoiceDate}`, pageWidth - 60, 35)
    
    // Provider info
    doc.setTextColor(...textColor)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    let yPos = 50
    
    const providerCompany = invoiceData.booking?.service?.provider?.company?.[0]
    if (providerCompany) {
      doc.text(providerCompany.address ?? 'Address not provided', 20, yPos)
      yPos += 5
      doc.text(`Phone: ${providerCompany.phone ?? 'Phone not provided'}`, 20, yPos)
      yPos += 5
      doc.text(`Email: ${providerCompany.email ?? 'Email not provided'}`, 20, yPos)
      yPos += 5
      doc.text(`Website: ${providerCompany.website ?? 'Website not provided'}`, 20, yPos)
    }
    
    // Client info
    yPos = 50
    doc.setFont('helvetica', 'bold')
    doc.text('Bill To:', pageWidth - 100, yPos)
    yPos += 8
    
    doc.setFont('helvetica', 'normal')
    const client = invoiceData.booking?.client
    if (client) {
      doc.text(client.full_name ?? 'Client Name', pageWidth - 100, yPos)
      yPos += 5
      
      const clientCompany = client.company?.[0]
      if (clientCompany) {
        doc.text(clientCompany.name ?? 'Client Company', pageWidth - 100, yPos)
        yPos += 5
        doc.text(clientCompany.address ?? 'Address not provided', pageWidth - 100, yPos)
        yPos += 5
        doc.text(`Phone: ${clientCompany.phone ?? client.phone ?? 'Phone not provided'}`, pageWidth - 100, yPos)
        yPos += 5
        doc.text(`Email: ${clientCompany.email ?? client.email ?? 'Email not provided'}`, pageWidth - 100, yPos)
        yPos += 5
        doc.text(`Website: ${clientCompany.website ?? 'Website not provided'}`, pageWidth - 100, yPos)
      }
    }
    
    // Service items table
    yPos = 120
    doc.setFillColor(248, 250, 252) // Gray-50
    doc.rect(20, yPos, pageWidth - 40, 20, 'F')
    
    // Table headers
    doc.setTextColor(...textColor)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Description', 25, yPos + 12)
    doc.text('Qty', pageWidth - 80, yPos + 12)
    doc.text('Rate', pageWidth - 50, yPos + 12)
    doc.text('Amount', pageWidth - 20, yPos + 12)
    
    // Service item
    yPos += 25
    const service = invoiceData.booking?.service
    if (service) {
      doc.setFont('helvetica', 'normal')
      doc.text(service.title ?? 'Service', 25, yPos + 12)
      doc.text('1', pageWidth - 80, yPos + 12)
      
      const amount = invoiceData.amount ?? 0
      const formattedAmount = new Intl.NumberFormat('en-OM', {
        style: 'currency',
        currency: 'OMR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount)
      
      doc.text(formattedAmount, pageWidth - 50, yPos + 12)
      doc.text(formattedAmount, pageWidth - 20, yPos + 12)
    }
    
    // Totals
    yPos += 40
    const amount = invoiceData.amount ?? 0
    const taxRate = 0.05 // 5% VAT
    const taxAmount = amount * taxRate
    const total = amount + taxAmount
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
    
    doc.setFont('helvetica', 'normal')
    doc.text('Subtotal:', pageWidth - 60, yPos)
    doc.text(formatCurrency(amount), pageWidth - 20, yPos)
    
    yPos += 8
    doc.text(`Tax (5%):`, pageWidth - 60, yPos)
    doc.text(formatCurrency(taxAmount), pageWidth - 20, yPos)
    
    yPos += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Total:', pageWidth - 60, yPos)
    doc.text(formatCurrency(total), pageWidth - 20, yPos)
    
    // Footer
    yPos = pageHeight - 30
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...lightTextColor)
    doc.text('Thank you for your business!', 20, yPos)
    
    console.log('✅ Simple PDF generated successfully')
    return new Uint8Array(doc.output('arraybuffer'))
    
  } catch (error) {
    console.error('❌ Simple PDF Generator - Error:', error)
    throw error
  }
}
