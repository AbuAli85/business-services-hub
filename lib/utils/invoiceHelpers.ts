import type { InvoiceData } from '@/lib/hooks/useInvoice'

/**
 * Get client display name with fallback priority
 */
export function getClientName(invoice: InvoiceData | null): string {
  if (!invoice) return 'Client Information'
  
  return invoice.client?.full_name || 
         invoice.client_name || 
         invoice.client?.company?.name || 
         'Client Information'
}

/**
 * Get provider display name with fallback priority
 */
export function getProviderName(invoice: InvoiceData | null): string {
  if (!invoice) return 'Service Provider'
  
  return invoice.provider?.full_name || 
         invoice.provider?.company?.name || 
         invoice.provider_name || 
         'Service Provider'
}

/**
 * Get service title with fallback priority
 */
export function getServiceTitle(invoice: InvoiceData | null): string {
  if (!invoice) return 'Professional Service'
  
  return invoice.booking?.service?.title || 
         invoice.service_title || 
         'Professional Service'
}

/**
 * Get service description with fallback priority
 */
export function getServiceDescription(invoice: InvoiceData | null): string {
  if (!invoice) return 'High-quality professional service'
  
  return invoice.booking?.service?.description || 
         invoice.service_description || 
         'High-quality professional service'
}

/**
 * Format invoice number with proper prefix
 */
export function formatInvoiceNumber(invoiceNumber?: string): string {
  if (!invoiceNumber) return 'N/A'
  
  // If already has prefix, return as is
  if (invoiceNumber.startsWith('INV-') || invoiceNumber.startsWith('#')) {
    return invoiceNumber
  }
  
  // Add INV- prefix if missing
  return `INV-${invoiceNumber}`
}

/**
 * Get status display text
 */
export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'draft': 'Draft',
    'issued': 'Issued',
    'paid': 'Paid',
    'overdue': 'Overdue',
    'cancelled': 'Cancelled'
  }
  
  return statusMap[status] || status
}

/**
 * Get status badge variant for UI components
 */
export function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    'draft': 'outline',
    'issued': 'default',
    'paid': 'secondary',
    'overdue': 'destructive',
    'cancelled': 'outline'
  }
  
  return variantMap[status] || 'outline'
}

/**
 * Check if invoice can be paid
 */
export function canPayInvoice(invoice: InvoiceData | null, userRole: string): boolean {
  if (!invoice) return false
  
  return userRole === 'client' && 
         invoice.status === 'issued' && 
         !invoice.paid_at
}

/**
 * Check if invoice can be edited
 */
export function canEditInvoice(invoice: InvoiceData | null, userRole: string): boolean {
  if (!invoice) return false
  
  return (userRole === 'provider' || userRole === 'admin') && 
         invoice.status === 'draft'
}

/**
 * Check if invoice can be cancelled
 */
export function canCancelInvoice(invoice: InvoiceData | null, userRole: string): boolean {
  if (!invoice) return false
  
  return (userRole === 'provider' || userRole === 'admin') && 
         ['draft', 'issued'].includes(invoice.status)
}

/**
 * Get invoice total amount with proper fallback
 */
export function getInvoiceTotal(invoice: InvoiceData | null): number {
  if (!invoice) return 0
  
  return invoice.total_amount || 
         invoice.amount || 
         0
}

/**
 * Get invoice subtotal with proper fallback
 */
export function getInvoiceSubtotal(invoice: InvoiceData | null): number {
  if (!invoice) return 0
  
  return invoice.subtotal || 
         (invoice.amount * 0.95) || // 95% of total if no subtotal
         0
}

/**
 * Get invoice tax amount with proper fallback
 */
export function getInvoiceTaxAmount(invoice: InvoiceData | null): number {
  if (!invoice) return 0
  
  return invoice.vat_amount || 
         (invoice.subtotal || invoice.amount) * 0.05 || // 5% VAT
         0
}

/**
 * Get invoice tax rate as percentage
 */
export function getInvoiceTaxRate(invoice: InvoiceData | null): number {
  if (!invoice) return 0.05 // Default 5%
  
  return invoice.vat_percent ? invoice.vat_percent / 100 : 0.05
}

/**
 * Check if invoice is overdue
 */
export function isInvoiceOverdue(invoice: InvoiceData | null): boolean {
  if (!invoice || !invoice.due_date) return false
  
  const dueDate = new Date(invoice.due_date)
  const today = new Date()
  
  return dueDate < today && invoice.status !== 'paid'
}

/**
 * Get days until due date
 */
export function getDaysUntilDue(invoice: InvoiceData | null): number | null {
  if (!invoice || !invoice.due_date) return null
  
  const dueDate = new Date(invoice.due_date)
  const today = new Date()
  const diffTime = dueDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}
