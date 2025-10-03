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
      .from('bookings')
      .select('id, status, created_at, amount, currency, client_id, provider_id, title')

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

    if (format === 'csv') {
      const csv = toCsv(data || [])
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
    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}


