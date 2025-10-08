// Invoice-related TypeScript types - Updated with phone field

export interface Company {
  id: string
  name: string
  address: string
  phone?: string
  email?: string
  website?: string
  logo_url?: string
  created_at?: string
  updated_at?: string
}

export interface Client {
  id: string
  full_name: string
  email: string
  phone?: string
  company?: {
    id: string
    name: string
    address?: string
    phone?: string
    email?: string
    website?: string
    logo_url?: string
    created_at?: string
    updated_at?: string
  }
  created_at?: string
  updated_at?: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  product: string
  description: string
  qty: number
  unit_price: number
  total: number
  created_at?: string
  updated_at?: string
}

export interface Invoice {
  id: string
  invoice_number: string
  issued_date: string
  due_date?: string
  subtotal: number
  vat_percent: number
  vat_amount: number
  total: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  currency: string
  notes?: string
  company_id: string
  client_id: string
  created_at: string
  updated_at: string
  company: Company
  client: Client
  items: InvoiceItem[]
}

export interface InvoiceProps {
  invoiceId: string
  className?: string
  showPrintButton?: boolean
  onPrint?: () => void
}

export interface InvoiceSummary {
  subtotal: number
  vat_amount: number
  total: number
  item_count: number
}
