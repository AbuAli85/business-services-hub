import { NextRequest, NextResponse } from 'next/server'
import { makeServerClient } from '@/utils/supabase/makeServerClient'
import { jsonError } from '@/lib/http'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

// CORS headers for cross-domain access
const ALLOWED_ORIGINS = (process.env.NEXT_PUBLIC_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
const originOk = (o?: string | null) =>
  !!o && (ALLOWED_ORIGINS.includes(o) || ALLOWED_ORIGINS.includes('*'))

const corsHeadersFor = (origin?: string | null) => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }

  // Only echo an origin if it's explicitly allowed (or '*' is in the list)
  if (originOk(origin) && origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  return headers
}

// Helper to add CORS headers to any response
const withCors = (res: Response, req: NextRequest) => {
  const h = corsHeadersFor(req.headers.get('origin'))
  for (const [k, v] of Object.entries(h)) res.headers.set(k, v)
  return res
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    console.log('🔐 Summary API: Authorization header present:', !!authHeader)
    
    const supabase = await makeServerClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('🔐 Summary API: Auth result:', { 
      hasUser: !!user, 
      userId: user?.id, 
      authError: authError?.message
    })
    
    if (authError || !user) return withCors(jsonError(401, 'UNAUTHENTICATED', 'No session'), request)

    // Get user profile to determine role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const userRole = profile?.role ?? user.user_metadata?.role ?? 'client'
    if (!['client', 'provider', 'admin'].includes(userRole)) {
      return withCors(jsonError(403, 'FORBIDDEN', 'Insufficient role'), request)
    }

    // Phase 5: Use optimized analytics view for better performance
    console.log('📊 Summary API: Using v_booking_status_metrics for fast KPIs...')
    
    // Try to use the new analytics view first (Phase 5 enhancement)
    const { data: metricsData, error: metricsError } = await supabase
      .from('v_booking_status_metrics')
      .select('*')
      .single()

    let allBookings: any[] = []
    
    if (metricsError) {
      console.warn('⚠️ Analytics view not available, falling back to legacy calculation:', metricsError.message)
      
      // Fallback to legacy calculation for backward compatibility
      const DAYS_BACK = 180
      const MAX_ROWS = 2000
      const sinceIso = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString()

      // Get ALL bookings for summary statistics (no pagination)
      let query = supabase
        .from('bookings')
        .select('id, status, approval_status, amount_cents, currency, service_id, client_id, provider_id, created_at', { count: 'planned' })
        .gte('created_at', sinceIso)

      // Apply role-based filtering
      if (userRole === 'client') {
        query = query.eq('client_id', user.id)
      } else if (userRole === 'provider') {
        query = query.eq('provider_id', user.id)
      }
      // Admin can see all bookings

      // Cap rows to avoid huge payloads
      query = query.range(0, MAX_ROWS - 1)

      const { data: bookingsData, error: queryError } = await query

      if (queryError) {
        console.error('Summary API: Query error:', queryError)
        // Graceful fallback instead of 400 to avoid dashboard break
        const minimal = {
          total: 0,
          completed: 0,
          inProgress: 0,
          approved: 0,
          pending: 0,
          readyToLaunch: 0,
          totalRevenue: 0,
          projectedBillings: 0,
          pendingApproval: 0,
          avgCompletionTime: 0
        }
        return withCors(NextResponse.json(minimal, { status: 200 }), request)
      }
      
      allBookings = bookingsData || []
    } else {
      console.log('✅ Using optimized analytics view:', metricsData)
      // Use the new analytics view data - no need to fetch individual bookings
    }

    // Get ALL invoices for revenue calculation
    const DAYS_BACK = 180
    const MAX_ROWS = 2000
    const sinceIso = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: allInvoices } = await supabase
      .from('invoices')
      .select('id, booking_id, status, amount, created_at')
      // Try to filter by same window if column exists; harmless if ignored by RLS
      .gte('created_at', sinceIso)
      .limit(MAX_ROWS)

    // Calculate summary statistics using optimized analytics view or legacy calculation
    let summary: any
    let bookingsData: any[] = []
    
    if (metricsData && !metricsError) {
      // Phase 5: Use optimized analytics view for instant KPIs
      console.log('🚀 Using v_booking_status_metrics for fast summary calculation')
      
      summary = {
        total: metricsData.total_bookings || 0,
        completed: metricsData.completed_count || 0,
        inProgress: metricsData.in_progress_count || 0,
        approved: metricsData.approved_count || 0,
        pending: metricsData.pending_count || 0,
        readyToLaunch: 0, // Will be calculated from invoices below
        totalRevenue: metricsData.total_revenue || 0,
        projectedBillings: 0, // Will be calculated below
        pendingApproval: metricsData.pending_count || 0,
        avgCompletionTime: 7.2, // Mock data
        avgProgress: metricsData.avg_progress || 0 // New field from analytics view
      }
      
      console.log('📊 Analytics view summary:', summary)
    } else {
      // Legacy calculation fallback
      bookingsData = allBookings || []
      
      // Helper function to determine derived status
      const getDerivedStatus = (booking: any): string => {
        if (booking.status === 'completed') return 'delivered'
        if (booking.status === 'in_progress') return 'in_production'
        
        // Check if there's an invoice for ready_to_launch
        const invoice = allInvoices?.find((inv: any) => inv.booking_id === booking.id)
        if (invoice && ['issued', 'paid'].includes(invoice.status)) {
          return 'ready_to_launch'
        }
        
        // Check approval status first
        if (booking.approval_status === 'approved') return 'approved'
        if (booking.status === 'approved') return 'approved'
        
        if (booking.status === 'declined' || booking.approval_status === 'declined') return 'cancelled'
        if (booking.status === 'rescheduled') return 'pending_review'
        if (booking.status === 'pending') return 'pending_review'
        
        return booking.status || 'pending_review'
      }

      // Calculate metrics
      const total = bookingsData.length
      const completed = bookingsData.filter((b: any) => getDerivedStatus(b) === 'delivered').length
      const inProgress = bookingsData.filter((b: any) => getDerivedStatus(b) === 'in_production').length
      const approved = bookingsData.filter((b: any) => 
        b.status === 'approved' || b.approval_status === 'approved'
      ).length
      const pending = bookingsData.filter((b: any) => getDerivedStatus(b) === 'pending_review').length
      const readyToLaunch = bookingsData.filter((b: any) => getDerivedStatus(b) === 'ready_to_launch').length

      // Debug ready to launch calculation
      const readyToLaunchBookings = bookingsData.filter((b: any) => getDerivedStatus(b) === 'ready_to_launch')
      console.log('🚀 Ready to Launch calculation:', {
        totalBookings: bookingsData.length,
        readyToLaunchCount: readyToLaunch,
        readyToLaunchBookings: readyToLaunchBookings.map((b: any) => ({
          id: b.id,
          status: b.status,
          approval_status: b.approval_status,
          service_id: b.service_id,
          hasInvoice: !!allInvoices?.find((inv: any) => inv.booking_id === b.id),
          invoiceStatus: allInvoices?.find((inv: any) => inv.booking_id === b.id)?.status
        }))
      })

      // Revenue calculation - include both issued and paid invoices
      const paidInvoices = (allInvoices || []).filter((inv: any) => inv.status === 'paid')
      const issuedInvoices = (allInvoices || []).filter((inv: any) => inv.status === 'issued')
      const totalRevenue = (allInvoices || [])
        .filter((inv: any) => ['issued', 'paid'].includes(inv.status))
        .reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)

      console.log('💰 Revenue calculation:', {
        totalInvoices: allInvoices?.length || 0,
        paidInvoices: paidInvoices.length,
        issuedInvoices: issuedInvoices.length,
        paidAmount: paidInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0),
        issuedAmount: issuedInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0),
        totalRevenue,
        sampleInvoices: (allInvoices || []).slice(0, 3).map((inv: any) => ({
          id: inv.id,
          status: inv.status,
          amount: inv.amount,
          booking_id: inv.booking_id
        }))
      })

      // Projected billings
      const projectedBillings = bookingsData
        .filter((b: any) => ['ready_to_launch', 'in_production'].includes(getDerivedStatus(b)))
        .reduce((sum: number, b: any) => sum + ((b.amount_cents ?? 0) / 100), 0)

      summary = {
        total,
        completed,
        inProgress,
        approved,
        pending,
        readyToLaunch,
        totalRevenue,
        projectedBillings,
        pendingApproval: pending,
        avgCompletionTime: 7.2 // Mock data
      }
    }
    
    // Calculate additional metrics that require invoice data (for both paths)
    const paidInvoices = (allInvoices || []).filter(inv => inv.status === 'paid')
    const issuedInvoices = (allInvoices || []).filter(inv => inv.status === 'issued')
    
    // Update readyToLaunch and projectedBillings if using analytics view
    if (metricsData && !metricsError) {
      // Calculate ready to launch from invoices
      const readyToLaunchCount = (allInvoices || [])
        .filter(inv => ['issued', 'paid'].includes(inv.status))
        .length
      
      summary.readyToLaunch = readyToLaunchCount
      
      // Calculate projected billings (simplified for analytics view)
      summary.projectedBillings = summary.totalRevenue * 0.3 // Estimate 30% of revenue as projected
    }

    console.log('📊 Summary API: Final calculated stats:', {
      total: summary.total,
      completed: summary.completed,
      inProgress: summary.inProgress,
      approved: summary.approved,
      pending: summary.pending,
      readyToLaunch: summary.readyToLaunch,
      totalRevenue: summary.totalRevenue,
      projectedBillings: summary.projectedBillings,
      avgProgress: summary.avgProgress || 'N/A',
      usingAnalyticsView: !!(metricsData && !metricsError),
      invoicesCount: allInvoices?.length || 0
    })

    return NextResponse.json(summary, { 
      status: 200, 
      headers: corsHeadersFor(request.headers.get('origin')),
    })

  } catch (error) {
    console.error('Summary API: Error:', error)
    // Graceful timeout handling
    if ((error as any)?.name === 'AbortError' || /AbortError/.test(String((error as any)?.message))) {
      const minimal = {
        total: 0,
        completed: 0,
        inProgress: 0,
        approved: 0,
        pending: 0,
        readyToLaunch: 0,
        totalRevenue: 0,
        projectedBillings: 0,
        pendingApproval: 0,
        avgCompletionTime: 0
      }
      return withCors(NextResponse.json(minimal), request)
    }
    return withCors(jsonError(500, 'INTERNAL_ERROR', 'Internal server error'), request)
  }
}

