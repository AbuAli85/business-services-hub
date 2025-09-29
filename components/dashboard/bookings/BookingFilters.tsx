'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FilterDropdown } from '@/components/dashboard/FilterDropdown'
import { getSupabaseClient } from '@/lib/supabase-client'

export interface BookingFiltersState {
  dateType: 'created' | 'start' | 'end'
  dateStart: string | null
  dateEnd: string | null
  amountMin: string
  amountMax: string
  clients: string[]
  providers: string[]
  serviceCategories: string[]
  duration: 'all' | 'short' | 'medium' | 'long'
  paymentStatus?: 'all' | 'paid' | 'pending' | 'overdue' | 'partial'
  invoiceStatus?: 'all' | 'generated' | 'sent' | 'viewed' | 'downloaded'
  clientType?: 'all' | 'individual' | 'business' | 'government' | 'nonprofit'
  priority?: 'all' | 'low' | 'medium' | 'high' | 'urgent'
  tags?: string[]
}

export interface BookingFiltersProps {
  value: BookingFiltersState
  onChange: (next: BookingFiltersState) => void
  onClear: () => void
  categories?: string[]
}

export function BookingFilters({ value, onChange, onClear, categories = [] }: BookingFiltersProps) {
  const [clientQuery, setClientQuery] = React.useState('')
  const [providerQuery, setProviderQuery] = React.useState('')
  const [clientResults, setClientResults] = React.useState<any[]>([])
  const [providerResults, setProviderResults] = React.useState<any[]>([])

  React.useEffect(() => {
    const t = setTimeout(async () => {
      if (!clientQuery) { setClientResults([]); return }
      try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        const headers: Record<string,string> = { 'Content-Type': 'application/json' }
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
        const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(clientQuery)}&role=client`, { headers })
        const json = await res.json()
        setClientResults(json.results || [])
      } catch {}
    }, 250)
    return () => clearTimeout(t)
  }, [clientQuery])

  React.useEffect(() => {
    const t = setTimeout(async () => {
      if (!providerQuery) { setProviderResults([]); return }
      try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        const headers: Record<string,string> = { 'Content-Type': 'application/json' }
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
        const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(providerQuery)}&role=provider`, { headers })
        const json = await res.json()
        setProviderResults(json.results || [])
      } catch {}
    }, 250)
    return () => clearTimeout(t)
  }, [providerQuery])
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Date Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="mb-1 block">Date type</Label>
            <FilterDropdown
              label="Type"
              options={[
                { label: 'Created', value: 'created' },
                { label: 'Start', value: 'start' },
                { label: 'End', value: 'end' }
              ]}
              value={value.dateType}
              onChange={(v)=> onChange({ ...value, dateType: (v as any) || 'created' })}
            />
          </div>
          <div>
            <Label className="mb-1 block">Date range start</Label>
            <Input type="date" value={value.dateStart ?? ''} onChange={(e)=> onChange({ ...value, dateStart: e.target.value || null })} />
          </div>
          <div>
            <Label className="mb-1 block">Date range end</Label>
            <Input type="date" value={value.dateEnd ?? ''} onChange={(e)=> onChange({ ...value, dateEnd: e.target.value || null })} />
          </div>
        </div>

        {/* Financial Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="mb-1 block">Min amount</Label>
            <Input type="number" placeholder="0" value={value.amountMin} onChange={(e)=> onChange({ ...value, amountMin: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block">Max amount</Label>
            <Input type="number" placeholder="10000" value={value.amountMax} onChange={(e)=> onChange({ ...value, amountMax: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block">Duration</Label>
            <FilterDropdown
              label="Duration"
              options={[
                { label: 'All', value: 'all' },
                { label: 'Short', value: 'short' },
                { label: 'Medium', value: 'medium' },
                { label: 'Long', value: 'long' }
              ]}
              value={value.duration}
              onChange={(v)=> onChange({ ...value, duration: (v as any) || 'all' })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="mb-1 block">Payment Status</Label>
            <FilterDropdown
              label="Payment"
              options={[
                { label: 'All', value: 'all' },
                { label: 'Paid', value: 'paid' },
                { label: 'Pending', value: 'pending' },
                { label: 'Overdue', value: 'overdue' },
                { label: 'Partial', value: 'partial' }
              ]}
              value={value.paymentStatus || 'all'}
              onChange={(v)=> onChange({ ...value, paymentStatus: (v as any) || 'all' })}
            />
          </div>
          <div>
            <Label className="mb-1 block">Invoice Status</Label>
            <FilterDropdown
              label="Invoice"
              options={[
                { label: 'All', value: 'all' },
                { label: 'Generated', value: 'generated' },
                { label: 'Sent', value: 'sent' },
                { label: 'Viewed', value: 'viewed' },
                { label: 'Downloaded', value: 'downloaded' }
              ]}
              value={value.invoiceStatus || 'all'}
              onChange={(v)=> onChange({ ...value, invoiceStatus: (v as any) || 'all' })}
            />
          </div>
          <div>
            <Label className="mb-1 block">Priority</Label>
            <FilterDropdown
              label="Priority"
              options={[
                { label: 'All', value: 'all' },
                { label: 'Low', value: 'low' },
                { label: 'Medium', value: 'medium' },
                { label: 'High', value: 'high' },
                { label: 'Urgent', value: 'urgent' }
              ]}
              value={value.priority || 'all'}
              onChange={(v)=> onChange({ ...value, priority: (v as any) || 'all' })}
            />
          </div>
        </div>

        {/* Client & Provider Autocomplete */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1 block">Client</Label>
            <Input placeholder="Search clients" value={clientQuery} onChange={(e)=> setClientQuery(e.target.value)} />
            {clientResults.length > 0 && (
              <div className="mt-1 border rounded p-2 max-h-40 overflow-auto text-sm bg-white">
                {clientResults.map(c => (
                  <button key={c.id} className="block w-full text-left px-2 py-1 hover:bg-slate-50 rounded" onClick={()=> {
                    setClientQuery(c.full_name || c.email)
                    onChange({ ...value, clients: Array.from(new Set([...(value.clients||[]), c.id])) })
                  }}>{c.full_name || c.email}</button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label className="mb-1 block">Provider</Label>
            <Input placeholder="Search providers" value={providerQuery} onChange={(e)=> setProviderQuery(e.target.value)} />
            {providerResults.length > 0 && (
              <div className="mt-1 border rounded p-2 max-h-40 overflow-auto text-sm bg-white">
                {providerResults.map(p => (
                  <button key={p.id} className="block w-full text-left px-2 py-1 hover:bg-slate-50 rounded" onClick={()=> {
                    setProviderQuery(p.full_name || p.email)
                    onChange({ ...value, providers: Array.from(new Set([...(value.providers||[]), p.id])) })
                  }}>{p.full_name || p.email}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Categories & Tags */}
        <div>
          <Label className="mb-1 block">Service Categories</Label>
          <FilterDropdown
            label="Categories"
            options={categories.map(c => ({ label: c, value: c }))}
            value={value.serviceCategories}
            onChange={(v)=> onChange({ ...value, serviceCategories: (v as string[]) || [] })}
            multi
          />
        </div>

        <div>
          <Label className="mb-1 block">Project Tags</Label>
          <Input placeholder="Enter tags comma-separated" value={(value.tags || []).join(', ')} onChange={(e)=> onChange({ ...value, tags: e.target.value.split(',').map(s=> s.trim()).filter(Boolean) })} />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClear}>Clear Filters</Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default BookingFilters


