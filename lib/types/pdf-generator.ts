// TypeScript interfaces for PDF generator

export interface InvoiceItem {
  id: string
  product: string
  description: string
  qty: number
  unit_price: number
  total: number
  invoice_id: string
  created_at: string
  updated_at: string
}

export interface Company {
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

export interface Client {
  id: string
  full_name: string
  email: string
  phone?: string
  company?: Company
  created_at?: string
  updated_at?: string
}

export interface Provider {
  id: string
  full_name: string
  email: string
  phone?: string
  company?: Company
}

export interface Service {
  id: string
  title: string
  description: string
  provider?: {
    id: string
    full_name: string
    email: string
    phone?: string
    company?: Array<{
      id: string
      name: string
      address?: string
      phone?: string
      email?: string
      website?: string
      logo_url?: string
    }>
  }
}

export interface Booking {
  id: string
  status: string
  requirements?: any
  client?: {
    id: string
    full_name: string
    email: string
    phone?: string
    company?: Array<{
      id: string
      name: string
      address?: any
      phone?: string
      email?: string
      website?: string
      logo_url?: string
    }>
  }
  service?: Service
}

export interface Invoice {
  id: string
  invoice_number?: string
  created_at: string
  due_date?: string
  subtotal?: number
  vat_percent?: number
  vat_amount?: number
  total_amount?: number
  amount: number
  currency?: string
  status: string
  notes?: string
  company_name?: string
  client_name?: string
  client_email?: string
  provider?: Provider
  client?: Client
  booking?: Booking
  invoice_items?: InvoiceItem[]
}

export interface PDFColors {
  primary: [number, number, number]
  accent: [number, number, number]
  text: [number, number, number]
  lightText: [number, number, number]
  border: [number, number, number]
  white: [number, number, number]
  background: [number, number, number]
}

export interface PDFTypography {
  title: { size: number; weight: string }
  subtitle: { size: number; weight: string }
  heading: { size: number; weight: string }
  body: { size: number; weight: string }
  small: { size: number; weight: string }
}

export interface PDFLayout {
  pageWidth: number
  pageHeight: number
  margin: number
  contentWidth: number
  lineHeight: number
  sidebarWidth: number
}
