'use server'

import { NextResponse } from 'next/server'
// import { generatePDF, generateExcel } from '@/lib/export-utils' // TODO: Implement server-side PDF/Excel generation
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

function toCsv(rows: any[]): string {
  if (!rows || rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: any) => {
    const s = String(v ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(headers.map(h => escape((r as any)[h])).join(','))
  }
  return lines.join('\n')
}

export async function GET(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const format = (url.searchParams.get('format') || 'csv').toLowerCase()
    const ids = (url.searchParams.get('ids') || '').split(',').map(s => s.trim()).filter(Boolean)

    // Determine role to scope data
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role ?? user.user_metadata?.role ?? 'client'

    let query = supabase
      .from('v_booking_status')
      .select('id, booking_title, display_status, amount, currency, progress, booking_created_at, booking_updated_at, scheduled_date')

    if (ids.length > 0) {
      query = query.in('id', ids)
    }

    if (userRole === 'provider') {
      query = query.eq('provider_id', user.id)
    } else if (userRole === 'client') {
      query = query.eq('client_id', user.id)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Enrich bookings with missing data
    const enrichedData = await Promise.all(
      (data || []).map(async (booking: any) => {
        try {
          // Fetch service information
          const { data: service } = await supabase
            .from('services')
            .select('title')
            .eq('id', booking.service_id)
            .single()

          // Fetch client information
          const { data: client } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', booking.client_id)
            .single()

          // Fetch provider information
          const { data: provider } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', booking.provider_id)
            .single()

          // Fetch booking details for approval_status
          const { data: bookingDetails } = await supabase
            .from('bookings')
            .select('approval_status')
            .eq('id', booking.id)
            .single()

          return {
            ...booking,
            service_title: service?.title || 'Unknown Service',
            client_name: client?.full_name || 'Unknown Client',
            provider_name: provider?.full_name || 'Unknown Provider',
            approval_status: bookingDetails?.approval_status || 'pending',
            created_at: booking.booking_created_at,
            updated_at: booking.booking_updated_at
          }
        } catch (error) {
          console.error('Error enriching booking:', error)
          return {
            ...booking,
            service_title: 'Unknown Service',
            client_name: 'Unknown Client',
            provider_name: 'Unknown Provider',
            approval_status: 'pending',
            created_at: booking.booking_created_at,
            updated_at: booking.booking_updated_at
          }
        }
      })
    )

    if (format === 'csv') {
      // Format the data for CSV export with proper column names
      const formattedData = (enrichedData || []).map((booking: any) => ({
        'Booking ID': booking.id,
        'Service Title': booking.service_title || 'Service',
        'Client Name': booking.client_name || 'Client',
        'Provider Name': booking.provider_name || 'Provider',
        'Status': booking.display_status || booking.status,
        'Approval Status': booking.approval_status || 'pending',
        'Amount': booking.amount || '0.00',
        'Currency': booking.currency || 'OMR',
        'Progress %': booking.progress || '0',
        'Created Date': booking.created_at ? new Date(booking.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: '2-digit' 
        }) : '',
        'Updated Date': booking.updated_at ? new Date(booking.updated_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: '2-digit' 
        }) : '',
        'Scheduled Date': booking.scheduled_date ? new Date(booking.scheduled_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: '2-digit' 
        }) : ''
      }))
      
      const csv = toCsv(formattedData)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="bookings_export.csv"'
        }
      })
    }

    if (format === 'pdf' || format === 'xlsx') {
      // TODO: Implement server-side PDF/Excel generation
      return NextResponse.json({ 
        error: `${format.toUpperCase()} export is not currently supported. Please use CSV format.` 
      }, { status: 501 })
    }

    // default JSON
    return NextResponse.json({ data: enrichedData })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}


