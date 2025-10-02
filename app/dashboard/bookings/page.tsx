'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getSupabaseClient } from '@/lib/supabase-client'

// Custom hooks
import { useAuth } from '@/hooks/useAuth'
import { useBookings } from '@/hooks/useBookings'
import { useRealtime } from '@/hooks/useRealtime'

// Components
import { DataTable } from '@/components/dashboard/DataTable'
import { FilterDropdown } from '@/components/dashboard/FilterDropdown'
import { StatusFilter } from '@/components/dashboard/bookings/StatusFilter'
import { ImprovedBookingCard } from '@/components/dashboard/bookings/ImprovedBookingCard'
import { StatusPill } from '@/components/ui/StatusPill'
import { AmountDisplay } from '@/components/dashboard/bookings/AmountDisplay'
import { BulkActions } from '@/components/dashboard/bookings/BulkActions'
import { SearchAndSort } from '@/components/dashboard/bookings/SearchAndSort'
import { BookingFilters } from '@/components/dashboard/bookings/BookingFilters'
import { BookingCalendar } from '@/components/dashboard/bookings/BookingCalendar'
import { BookingDetailModal } from '@/components/dashboard/bookings/BookingDetailModal'
import { BookingHeader } from '@/components/dashboard/bookings/BookingHeader'
import { BookingStats } from '@/components/dashboard/bookings/BookingStats'
import { BookingEmptyState } from '@/components/dashboard/bookings/BookingEmptyState'
import { BookingLoadingSkeleton } from '@/components/dashboard/bookings/BookingLoadingSkeleton'
import PaginationFooter from '@/components/ui/PaginationFooter'

// Utils
import { useBookingFilters, applyBookingFilters } from '@/hooks/useBookingFilters'
import { formatMuscat } from '@/lib/dates'
import { normalizeStatus } from '@/lib/status'
import { getDerivedStatus, calculateBookingStats } from '@/lib/booking-utils'
import { isBookingApproved, deriveAmount } from '@/lib/bookings-helpers'

export default function BookingsPage() {
  const router = useRouter()
  
  // Authentication
  const { user, userRole, loading: userLoading, error: authError } = useAuth()
  
  // UI State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('lastUpdated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'card' | 'calendar' | 'table'>(() => {
    if (typeof window === 'undefined') return 'card'
    return (localStorage.getItem('bookings:viewMode') as any) || 'card'
  })
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>(() => {
    if (typeof window === 'undefined') return 'comfortable'
    return (localStorage.getItem('bookings:density') as any) || 'comfortable'
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailBooking, setDetailBooking] = useState<any | null>(null)
  const [detailMilestones, setDetailMilestones] = useState<any[]>([])
  const [detailCommunications, setDetailCommunications] = useState<any[]>([])
  const [detailFiles, setDetailFiles] = useState<any[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // Bookings data
  const {
    bookings,
    invoices,
    totalCount,
    summaryStats,
    loading: dataLoading,
    error: dataError,
    lastUpdatedAt,
    refresh,
    approveBooking,
    declineBooking
  } = useBookings({
    userRole,
    userId: user?.id,
    currentPage,
    pageSize,
    statusFilter,
    searchQuery,
    sortBy,
    sortOrder,
    enableRealtime: true
  })

  // Realtime subscriptions
  useRealtime({
    userId: user?.id,
    userRole,
    enabled: true,
    onRefresh: () => refresh(true)
  })

  // Client-side filters
  const { filters, setFilters, clearFilters } = useBookingFilters()
  const filteredBookings = applyBookingFilters(bookings, filters)

  // Categories for filters
  const categories = useMemo(() => {
    const s = new Set<string>()
    for (const b of bookings || []) {
      const c = String((b as any).service_category || (b as any).serviceCategory || '')
      if (c) s.add(c)
    }
    return Array.from(s).sort()
  }, [bookings])

  // Invoice lookup
  const invoiceByBooking = useMemo(() => {
    const m = new Map<string, any>()
    invoices.forEach((invoice: any) => {
      const bookingId = String(invoice.bookingId ?? invoice.booking_id)
      m.set(bookingId, invoice)
    })
    return m
  }, [invoices])

  // Calculate statistics
  const stats = useMemo(() => {
    return calculateBookingStats(bookings, invoices, summaryStats)
  }, [bookings, invoices, summaryStats])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const paginatedBookings = filteredBookings

  // Persist preferences
  useEffect(() => {
    if (typeof window === 'undefined') return
    try { localStorage.setItem('bookings:viewMode', viewMode) } catch {}
  }, [viewMode])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { localStorage.setItem('bookings:density', density) } catch {}
  }, [density])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds(new Set())
    setSelectAll(false)
  }, [statusFilter, searchQuery])

  // Role-based permissions
  const canCreateBooking = userRole === 'client' || userRole === 'admin'
  const canManageBookings = userRole === 'admin'
  const canViewAllBookings = userRole === 'admin'
  const canCreateInvoice = userRole === 'provider' || userRole === 'admin'

  // Export function
  const exportBookings = useCallback((format: 'csv' | 'pdf' | 'xlsx', ids?: string[]) => {
    const params = new URLSearchParams()
    params.set('format', format)
    if (ids && ids.length > 0) params.set('ids', ids.join(','))
    const url = `/api/bookings/export?${params.toString()}`
    window.open(url, '_blank')
  }, [])

  // Invoice creation
  const handleCreateInvoice = useCallback(async (booking: any) => {
    try {
      // Centralize approval logic
      const isApproved = isBookingApproved(booking)
      
      if (!isApproved) {
        toast.error('Invoice can be created only after approval')
        return
      }
      
      if (!canCreateInvoice) {
        toast.error('You do not have permission to create invoices')
        return
      }
      
      const supabase = await getSupabaseClient()
      // Centralize amount derivation
      const amount = deriveAmount(booking)
      const currency = String(booking.currency ?? 'OMR')
      
      if (amount <= 0) {
        toast.error('Invalid booking amount')
        return
      }
      
      const payload: any = {
        booking_id: booking.id,
        client_id: booking.client_id || booking.client_profile?.id,
        provider_id: booking.provider_id || booking.provider_profile?.id || user?.id,
        amount,
        currency,
        status: 'draft',
        invoice_number: `INV-${Date.now()}`,
        total_amount: amount,
        subtotal: amount,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('invoices')
        .insert(payload)
        .select('id, booking_id, status, amount, currency')
        .single()
      
      if (error) {
        throw new Error(error.message || 'Failed to create invoice')
      }
      
      toast.success('Invoice created successfully')
      refresh(true)
    } catch (e: any) {
      console.error('Invoice creation failed:', e)
      toast.error(e?.message || 'Failed to create invoice')
    }
  }, [canCreateInvoice, user, refresh])

  // Quick invoice actions
  const handleSendInvoice = useCallback(async (invoiceId: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'issued',
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (error) throw error

      toast.success('Invoice sent successfully')
      refresh(true)
    } catch (e: any) {
      console.error('Send invoice failed:', e)
      toast.error(e?.message || 'Failed to send invoice')
    }
  }, [refresh])

  const handleMarkInvoicePaid = useCallback(async (invoiceId: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (error) throw error

      toast.success('Invoice marked as paid')
      refresh(true)
    } catch (e: any) {
      console.error('Mark paid failed:', e)
      toast.error(e?.message || 'Failed to mark invoice as paid')
    }
  }, [refresh])

  // Open booking details
  const openBookingDetails = useCallback(async (booking: any) => {
    try {
      setDetailOpen(true)
      setDetailBooking(booking)
      setDetailMilestones([])
      setDetailCommunications([])
      setDetailFiles([])
      setDetailLoading(true)

      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const [bookingRes, milestonesRes, commsRes] = await Promise.all([
        fetch(`/api/bookings/${booking.id}`, { headers, credentials: 'include' }),
        fetch(`/api/milestones?bookingId=${encodeURIComponent(booking.id)}`, { headers, credentials: 'include' }),
        fetch(`/api/messages?booking_id=${encodeURIComponent(booking.id)}`, { headers, credentials: 'include' })
      ])

      if (bookingRes.ok) {
        const { booking: enriched } = await bookingRes.json()
        if (enriched) setDetailBooking(enriched)
      }
      if (milestonesRes.ok) {
        const { milestones } = await milestonesRes.json()
        setDetailMilestones(Array.isArray(milestones) ? milestones : [])
      }
      if (commsRes.ok) {
        const { messages } = await commsRes.json()
        setDetailCommunications(Array.isArray(messages) ? messages : [])
      }
    } catch (e) {
      console.warn('Failed to load booking details:', e)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  // Get invoice href
  const getInvoiceHref = useCallback((invoiceId: string) => {
    if (userRole === 'admin') return `/dashboard/invoices/template/${invoiceId}`
    if (userRole === 'provider') return `/dashboard/provider/invoices/template/${invoiceId}`
    return `/dashboard/client/invoices/template/${invoiceId}`
  }, [userRole])

  // Loading states
  if (userLoading) {
    return <BookingLoadingSkeleton />
  }

  if (authError || (!user || !userRole)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md mx-auto">
          <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Session Loading</h3>
          <p className="text-sm text-gray-600 mb-4">
            Please wait while we verify your session and role...
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Reload Page
          </Button>
        </div>
      </div>
    )
  }

  if (dataError) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-red-500" />
          <h3 className="text-lg font-semibold">Error Loading Bookings</h3>
          <p className="text-sm mt-2 text-gray-600">{dataError}</p>
          <Button onClick={() => refresh(true)} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <BookingHeader
        userRole={userRole}
        stats={stats}
        filters={{
          dateStart: filters.dateStart || undefined,
          dateEnd: filters.dateEnd || undefined
        }}
        lastUpdatedAt={lastUpdatedAt}
        dataLoading={dataLoading}
        viewMode={viewMode}
        density={density}
        onRefresh={() => refresh(true)}
        onViewModeChange={setViewMode}
        onDensityChange={setDensity}
        onExport={exportBookings}
        canCreateBooking={canCreateBooking}
      />

      {/* Statistics */}
      <BookingStats stats={stats} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <StatusFilter
          currentStatus={statusFilter as any}
          onStatusChangeAction={(s) => { setStatusFilter(s as any); setCurrentPage(1) }}
          counts={{
            all: totalCount,
            pending: bookings.filter((b:any)=> {
              const status = normalizeStatus(b.status)
              return status === 'pending_provider_approval' || status === 'pending' || status === 'draft'
            }).length,
            confirmed: bookings.filter((b:any)=> normalizeStatus(b.status) === 'approved').length,
            in_progress: bookings.filter((b:any)=> normalizeStatus(b.status) === 'in_progress').length,
            completed: bookings.filter((b:any)=> normalizeStatus(b.status) === 'completed').length,
            cancelled: bookings.filter((b:any)=> {
              const status = normalizeStatus(b.status)
              return status === 'cancelled' || status === 'declined'
            }).length,
          }}
        />
        <FilterDropdown
          label="Page Size"
          options={[
            { label: '10 / page', value: '10' },
            { label: '25 / page', value: '25' },
            { label: '50 / page', value: '50' },
          ]}
          value={String(pageSize)}
          onChange={(v) => { setPageSize(parseInt(String(v || 10), 10)); setCurrentPage(1) }}
        />
      </div>

      {/* Search and Sort */}
      <div className="mb-6 space-y-3">
        <SearchAndSort
          search={searchQuery}
          onSearch={setSearchQuery}
          sortBy={sortBy}
          onSortBy={setSortBy}
          sortOrder={sortOrder}
          onSortOrder={setSortOrder}
        />
        <div className="flex items-center gap-2">
          <Button variant={showFilters ? 'default' : 'outline'} size="sm" onClick={()=> setShowFilters(v=>!v)}>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="mb-6">
          <BookingFilters
            value={filters as any}
            onChange={setFilters as any}
            onClear={clearFilters}
            categories={categories}
          />
        </div>
      )}

      {/* Calendar view */}
      {viewMode === 'calendar' && (
        <div className="mb-6">
          <BookingCalendar bookings={filteredBookings} onDateSelect={(d)=> console.log('date', d)} />
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="mb-4">
          <BulkActions
            selectedCount={selectedIds.size}
            onClear={() => { setSelectedIds(new Set()); setSelectAll(false) }}
            onExport={(fmt)=> exportBookings(fmt, Array.from(selectedIds) as string[])}
            onUpdateStatus={async (status)=> {
              const ids = Array.from(selectedIds)
              if (ids.length === 0) return
              try {
                const supabase = await getSupabaseClient()
                const { data: { session } } = await supabase.auth.getSession()
                const headers: Record<string,string> = { 'Content-Type': 'application/json' }
                if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
                
                if (status === 'approved' || status === 'confirmed') {
                  await Promise.all(ids.map(async (id) => {
                    const r = await fetch(`/api/bookings/${id}/approve`, { method: 'POST', headers, credentials: 'include' })
                    if (!r.ok) throw new Error('Approval failed')
                  }))
                } else {
                  const res = await fetch('/api/bookings/bulk', { method: 'POST', headers, credentials: 'include', body: JSON.stringify({ action: 'update_status', status, booking_ids: ids }) })
                  if (!res.ok) { toast.error('Bulk update failed'); return }
                }
                toast.success('Updated selected bookings')
                setSelectedIds(new Set())
                setSelectAll(false)
                refresh(true)
                } catch (e: any) {
                  console.error('Bulk update failed:', e)
                  toast.error(e?.message || 'Bulk update failed')
              }
            }}
            onNotify={()=> console.log('Notify', Array.from(selectedIds))}
            onReport={()=> console.log('Report', Array.from(selectedIds))}
            onArchive={()=> console.log('Archive', Array.from(selectedIds))}
          />
        </div>
      )}

      {/* Bookings Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 relative">
        {dataLoading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-md">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading bookings...</p>
            </div>
          </div>
        )}
        
        {paginatedBookings.length > 0 ? (
          viewMode === 'table' ? (
            <div className="p-4">
              <DataTable
                stickyHeader
                columns={[
                  {
                    key: 'select',
                    header: (
                      <input
                        aria-label="Select all visible"
                        type="checkbox"
                        checked={paginatedBookings.every((b:any)=> selectedIds.has(b.id)) && paginatedBookings.length > 0}
                        onChange={(e)=> {
                          const checked = e.currentTarget.checked
                          if (checked) setSelectedIds(new Set([...(selectedIds as any), ...paginatedBookings.map((b:any)=> b.id)]))
                          else setSelectedIds(new Set())
                        }}
                      />
                    ),
                    widthClass: 'w-8',
                    render: (r:any) => (
                      <input
                        aria-label={`Select booking ${r.id}`}
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={(e)=>{
                          const checked = e.currentTarget.checked
                          setSelectedIds(prev=> {
                            const next = new Set(prev)
                            if (checked) next.add(r.id); else next.delete(r.id)
                            return next
                          })
                        }}
                      />
                    )
                  },
                  { key: 'serviceTitle', header: 'Service', widthClass: 'w-1/4', sortable: true, render: (r:any) => r.service_title || r.serviceTitle || '—' },
                  { key: 'clientName', header: 'Client', widthClass: 'w-1/5', sortable: true, render: (r:any) => r.client_name || r.clientName || '—' },
                  { key: 'providerName', header: 'Provider', widthClass: 'w-1/5', sortable: true, render: (r:any) => r.provider_name || r.providerName || '—' },
                  { key: 'status', header: 'Status', widthClass: 'w-40', render: (r:any) => (
                    <StatusPill status={normalizeStatus(r.status)} />
                  ) },
                  { key: 'progress', header: 'Progress', widthClass: 'w-24', render: (r:any) => {
                    const pct = Math.max(0, Math.min(100, Number(r.progress_percentage ?? r.progress?.percentage ?? 0)))
                    return `${pct}%`
                  } },
                  { key: 'payment', header: 'Payment', widthClass: 'w-28', render: (r:any) => {
                    const inv = invoiceByBooking.get(String(r.id))
                    return inv?.status ? String(inv.status) : '—'
                  } },
                  { key: 'totalAmount', header: 'Amount', widthClass: 'w-32', sortable: true, render: (r:any) => (
                    <AmountDisplay
                      amount_cents={r.amount_cents || (r.amount ? r.amount * 100 : 0)}
                      currency={r.currency || 'OMR'}
                      status={r.status}
                      invoice_status={invoiceByBooking.get(String(r.id))?.status}
                      compact={true}
                      showStatus={false}
                    />
                  ) },
                  { key: 'createdAt', header: 'Created', widthClass: 'w-32', sortable: true, render: (r:any) => (
                    formatMuscat(r.created_at || r.createdAt)
                  ) },
                  { key: 'actions', header: 'Actions', widthClass: 'w-40', render: (r:any) => (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={()=> router.push(`/dashboard/bookings/${r.id}`)} aria-label="View details">Details</Button>
                      {canManageBookings && !((r?.approval_status === 'approved') || (r?.status === 'approved') || (r?.status === 'confirmed')) && (
                        <Button size="sm" variant="outline" onClick={()=> approveBooking(r.id)} aria-label="Approve booking">Approve</Button>
                      )}
                      <Select value={String(r.status || '')} onValueChange={async (v)=>{
                        try {
                          const supabase = await getSupabaseClient()
                          const { data: { session } } = await supabase.auth.getSession()
                          const headers: Record<string,string> = { 'Content-Type': 'application/json' }
                          if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
                          
                          if (v === 'approved') {
                            await approveBooking(r.id, r.provider_id, r.status)
                          } else if (v === 'declined') {
                            await declineBooking(r.id, r.provider_id, r.status)
                          } else {
                            await fetch('/api/bookings/bulk', { method: 'POST', headers, credentials: 'include', body: JSON.stringify({ action: 'update_status', status: v, booking_ids: [r.id] }) })
                            refresh(true)
                            toast.success('Status updated')
                          }
                        } catch (err: any) {
                          toast.error(err?.message || 'Status update failed')
                        }
                      }}>
                        <SelectTrigger className="h-8 w-28"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="declined">Declined</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" onClick={()=> {
                        const email = r.client_email || r.client?.email || ''
                        if (email) window.location.href = `mailto:${email}?subject=Booking%20Update&body=Hello%2C%20this%20is%20a%20gentle%20reminder%20regarding%20your%20booking%20${r.id}.`
                      }} aria-label="Send reminder">Reminder</Button>
                    </div>
                  ) }
                ]}
                data={paginatedBookings as any}
                page={currentPage}
                pageSize={pageSize}
                total={totalCount}
                onPageChange={(p)=> setCurrentPage(Math.max(1, Math.min(p, totalPages)))}
                onSortChange={(key, dir)=>{
                  const map: Record<string,string> = {
                    createdAt: 'createdAt',
                    totalAmount: 'totalAmount',
                    serviceTitle: 'serviceTitle',
                    clientName: 'clientName',
                    providerName: 'providerName'
                  }
                  const uiKey = map[key] || 'createdAt'
                  setSortBy(uiKey)
                  setSortOrder(dir)
                }}
                sortKey={sortBy}
                sortDirection={sortOrder}
                className={density === 'compact' ? 'text-xs' : density === 'spacious' ? 'text-base' : 'text-sm'}
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Header row with select all */}
              <div className="px-4 py-2 bg-gray-50 flex items-center gap-3">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={(v)=>{
                    const checked = Boolean(v)
                    setSelectAll(checked)
                    if (checked) {
                      setSelectedIds(new Set(paginatedBookings.map((b:any)=>b.id)))
                    } else {
                      setSelectedIds(new Set())
                    }
                  }}
                />
                <span className="text-sm text-gray-500">Select all on this page</span>
              </div>
              {paginatedBookings.map((booking) => (
                <div key={booking.id} className="mb-3">
                  <ImprovedBookingCard
                    booking={booking}
                    invoice={invoiceByBooking.get(String(booking.id))}
                    isSelected={selectedIds.has(booking.id)}
                    onSelect={(checked) => {
                      setSelectedIds(prev => {
                        const next = new Set(prev)
                        if (checked) next.add(booking.id); else next.delete(booking.id)
                        return next
                      })
                    }}
                    onQuickAction={async (action) => {
                      if (action === 'view') {
                        router.push(`/dashboard/bookings/${booking.id}`)
                      } else if (action === 'approve') {
                        await approveBooking(booking.id, booking.provider_id, booking.status)
                      } else if (action === 'decline') {
                        await declineBooking(booking.id, booking.provider_id, booking.status)
                      } else if (action === 'create_invoice') {
                        await handleCreateInvoice(booking)
                      } else if (action === 'send_invoice') {
                        const inv = invoiceByBooking.get(String(booking.id)); if (inv) await handleSendInvoice(inv.id)
                      } else if (action === 'mark_paid') {
                        const inv = invoiceByBooking.get(String(booking.id)); if (inv) await handleMarkInvoicePaid(inv.id)
                      } else if (action === 'pay_invoice') {
                        const inv = invoiceByBooking.get(String(booking.id)); if (inv) router.push(getInvoiceHref(inv.id))
                      } else if (action === 'view_invoice') {
                        const inv = invoiceByBooking.get(String(booking.id)); if (inv) router.push(getInvoiceHref(inv.id))
                      } else if (action === 'update_progress') {
                        router.push(`/dashboard/bookings/${booking.id}/milestones`)
                      } else if (action === 'message') {
                        router.push('/dashboard/messages')
                      }
                    }}
                    onViewDetails={(id) => { router.push(`/dashboard/bookings/${booking.id}`) }}
                    density={density}
                    userRole={userRole || undefined}
                  />
                </div>
              ))}
            </div>
          )
        ) : (
          <BookingEmptyState 
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            userRole={userRole}
          />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <PaginationFooter
              page={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageCount={paginatedBookings.length}
              onPrev={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              onNext={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              onGoTo={(p) => setCurrentPage(p)}
              onPageSizeChange={(size)=> { setPageSize(size); setCurrentPage(1) }}
              pageSize={pageSize}
            />
          </CardContent>
        </Card>
      )}
      
      {/* Detail Modal */}
      <BookingDetailModal 
        open={detailOpen} 
        onOpenChange={setDetailOpen} 
        booking={detailBooking}
        invoice={detailBooking ? invoiceByBooking.get(String(detailBooking.id)) : null}
        milestones={detailMilestones}
        communications={detailCommunications}
        files={detailFiles}
      />
    </div>
  )
}
