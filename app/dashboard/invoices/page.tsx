'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getSupabaseClient } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Download, FileText, Banknote, Calendar, User, Building2 } from 'lucide-react'

interface InvoiceRecord {
  id: string
  booking_id: string
  client_id: string
  provider_id: string
  amount: number
  currency: string
  status: 'draft' | 'issued' | 'paid' | 'void'
  created_at: string
  invoice_pdf_url?: string | null
  bookings?: { services?: { title?: string } | null } | null
  clients?: { full_name?: string } | null
  providers?: { full_name?: string } | null
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'client' | 'provider' | 'admin'>('client')

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const userRole = user.user_metadata?.role || 'client'
      setRole(userRole)

      let query = supabase
        .from('invoices')
        .select(`
          id, booking_id, client_id, provider_id, amount, currency, status, created_at, invoice_pdf_url,
          bookings(services(title)),
          client_profile:profiles!client_id(full_name),
          provider_profile:profiles!provider_id(full_name)
        `)
        .order('created_at', { ascending: false })

      if (userRole === 'client') {
        query = query.eq('client_id', user.id)
      } else if (userRole === 'provider') {
        query = query.eq('provider_id', user.id)
      }

      const { data, error } = await query
      if (error) throw error
      setInvoices((data || []) as any)
    } catch (e) {
      console.error('Error fetching invoices', e)
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices & Receipts</h1>
          <p className="text-gray-600 mt-2">All your invoices in one place</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoices
          </CardTitle>
          <CardDescription>
            {role === 'client' ? 'Invoices for your completed payments' : 'Invoices issued to your clients'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No invoices found</p>
              <p className="text-sm">Invoices will appear here after successful payments.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900">{inv.bookings?.services?.title || 'Service'}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(inv.created_at).toLocaleDateString()}</span>
                      <span className="inline-flex items-center gap-1"><Banknote className="h-4 w-4" />{formatCurrency(inv.amount || 0, inv.currency || 'OMR')}</span>
                      {role === 'client' ? (
                        <span className="inline-flex items-center gap-1"><Building2 className="h-4 w-4" />{inv.providers?.full_name || 'Provider'}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1"><User className="h-4 w-4" />{inv.clients?.full_name || 'Client'}</span>
                      )}
                    </div>
                    <div className="text-xs">
                      <Badge className={
                        inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                        inv.status === 'issued' ? 'bg-blue-100 text-blue-800' :
                        inv.status === 'void' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }>
                        {inv.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {inv.invoice_pdf_url ? (
                      <a href={inv.invoice_pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
                        <Download className="h-4 w-4 mr-2" /> Download
                      </a>
                    ) : (
                      <Button variant="outline" disabled>
                        <Download className="h-4 w-4 mr-2" /> Pending PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


