import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'
export type UserRole = 'client' | 'provider' | 'admin'

export interface InvoiceData {
  id: string
  booking_id: string
  client_id: string
  provider_id: string
  amount: number
  currency: string
  status: InvoiceStatus
  invoice_number?: string
  service_title?: string
  service_description?: string
  client_name?: string
  client_email?: string
  provider_name?: string
  provider_email?: string
  company_name?: string
  company_logo?: string
  due_date?: string
  created_at: string
  updated_at: string
  pdf_url?: string
  payment_terms?: string
  notes?: string
  subtotal?: number
  vat_percent?: number
  vat_amount?: number
  total_amount?: number
  paid_at?: string
  payment_method?: string
  provider?: {
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
    }
  }
  client?: {
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
    }
  }
  booking?: {
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
    service?: {
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
  }
}

interface UseInvoiceReturn {
  invoice: InvoiceData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  user: any
}

export function useInvoice(invoiceId: string | undefined, role: UserRole): UseInvoiceReturn {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  const fetchInvoice = async () => {
    if (!invoiceId) {
      setError('Invoice ID is required')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const supabase = await getSupabaseClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Authentication required')
      }

      setUser(user)

      // Build query based on user role
      let query = supabase
        .from('invoices')
        .select(`
          *,
          provider:profiles!invoices_provider_id_fkey(
            id,
            full_name,
            email,
            phone,
            company:companies(
              id,
              name,
              address,
              phone,
              email,
              website,
              logo_url
            )
          ),
          client:profiles!invoices_client_id_fkey(
            id,
            full_name,
            email,
            phone,
            company:companies(
              id,
              name,
              address,
              phone,
              email,
              website,
              logo_url
            )
          ),
          booking:bookings(
            id,
            status,
            requirements,
            service:services(
              id,
              title,
              description
            )
          )
        `)
        .eq('id', invoiceId)

      // Apply role-based filtering
      if (role === 'client') {
        query = query.eq('client_id', user.id)
      } else if (role === 'provider') {
        query = query.eq('provider_id', user.id)
      }
      // Admin can see all invoices (no additional filter)

      const { data: invoiceData, error: invoiceError } = await query.single()

      if (invoiceError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Invoice fetch error:', {
            error: invoiceError,
            invoiceId,
            userId: user.id,
            role
          })
        }
        throw new Error('Invoice not found or access denied')
      }

      if (!invoiceData) {
        throw new Error('Invoice not found')
      }

      console.log('🔍 Invoice data fetched:', JSON.stringify(invoiceData, null, 2))
      // Transform the data to match the expected structure
      const transformedInvoice = {
        ...invoiceData,
        // Add the booking data at the top level for easier access
        booking: {
          ...invoiceData.booking,
          client: invoiceData.booking?.client,
          service: {
            ...invoiceData.booking?.service,
            provider: invoiceData.booking?.service?.provider
          }
        }
      }
      
      setInvoice(transformedInvoice)
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch invoice'
      setError(errorMessage)
      
      if (process.env.NODE_ENV === 'development') {
        console.error('useInvoice error:', {
          message: errorMessage,
          invoiceId,
          role,
          originalError: err
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoice()
  }, [invoiceId, role])

  return {
    invoice,
    loading,
    error,
    refetch: fetchInvoice,
    user
  }
}
