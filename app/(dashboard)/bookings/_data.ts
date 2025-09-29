import { createClient } from '@/utils/supabase/server'

export interface BookingKpis {
  total: number
  completed: number
  in_progress: number
  approved: number
  pending: number
  total_revenue: number
}

export async function getBookingKpis(): Promise<BookingKpis> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_booking_kpis')
  if (error) throw error
  const row: any = Array.isArray(data) ? data[0] : data
  return {
    total: Number(row?.total ?? 0),
    completed: Number(row?.completed ?? 0),
    in_progress: Number(row?.in_progress ?? 0),
    approved: Number(row?.approved ?? 0),
    pending: Number(row?.pending ?? 0),
    total_revenue: Number(row?.total_revenue ?? 0)
  }
}


