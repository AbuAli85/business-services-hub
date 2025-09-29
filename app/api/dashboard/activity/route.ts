import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Number(url.searchParams.get('limit') ?? 20)
  const offset = Number(url.searchParams.get('offset') ?? 0)

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_activity_feed', { limit_count: limit, offset_count: offset })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}


