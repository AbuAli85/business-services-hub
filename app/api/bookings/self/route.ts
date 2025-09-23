import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(req: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? '10')))
  const status = url.searchParams.get('status') ?? 'all'
  const sortBy = url.searchParams.get('sortBy') ?? 'created_at'
  const sortOrder = (url.searchParams.get('sortOrder') ?? 'desc') as 'asc' | 'desc'
  const q = (url.searchParams.get('q') ?? '').trim()

  const sortCol =
    sortBy === 'createdAt'   ? 'created_at' :
    sortBy === 'totalAmount' ? 'amount'     :
    sortBy === 'clientName'  ? 'client_profile.full_name' :
    sortBy === 'serviceTitle'? 'service.title' : 'created_at'

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('bookings')
    .select(`
      id, status, created_at, amount, currency, client_id, provider_id,
      service:services(id, title),
      client_profile:profiles(id, full_name),
      provider_profile:profiles(id, full_name),
      invoices(id, status)
    `, { count: 'exact' })
    .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)

  if (status !== 'all') query = query.eq('status', status)

  if (q) {
    const term = q.replace(/^#/, '')
    query = query.or(`id.ilike.%${term}%,client_profile.full_name.ilike.%${term}%,provider_profile.full_name.ilike.%${term}%`)
  }

  query = query.order(sortCol, { ascending: sortOrder === 'asc' }).range(from, to)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ items: data ?? [], total: count ?? 0 })
}


