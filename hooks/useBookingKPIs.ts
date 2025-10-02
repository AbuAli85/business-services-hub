import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'

export interface BookingKPIsState {
  milestonesTotal: number
  milestonesCompleted: number
  tasksTotal: number
  tasksCompleted: number
  loading: boolean
  error: string | null
}

export function useBookingKPIs(bookingId: string | null | undefined): BookingKPIsState {
  const [state, setState] = useState<BookingKPIsState>({
    milestonesTotal: 0,
    milestonesCompleted: 0,
    tasksTotal: 0,
    tasksCompleted: 0,
    loading: false,
    error: null
  })

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      if (!bookingId) return
      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const supabase = await getSupabaseClient()

        const { count: totalCount } = await supabase
          .from('milestones')
          .select('id', { count: 'exact', head: true })
          .eq('booking_id', bookingId)

        const { count: completedCount } = await supabase
          .from('milestones')
          .select('id', { count: 'exact', head: true })
          .eq('booking_id', bookingId)
          .eq('status', 'completed')

        const { data: milestoneIds } = await supabase
          .from('milestones')
          .select('id')
          .eq('booking_id', bookingId)

        const ids = (milestoneIds || []).map(m => m.id)
        let tasksTotalCount = 0
        let tasksDoneCount = 0
        if (ids.length > 0) {
          const { count: totalTasks } = await supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .in('milestone_id', ids)
          const { count: doneTasks } = await supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .in('milestone_id', ids)
            .in('status', ['done', 'completed'])
          tasksTotalCount = totalTasks ?? 0
          tasksDoneCount = doneTasks ?? 0
        }

        if (!isMounted) return
        setState({
          milestonesTotal: totalCount ?? 0,
          milestonesCompleted: completedCount ?? 0,
          tasksTotal: tasksTotalCount ?? 0,
          tasksCompleted: tasksDoneCount ?? 0,
          loading: false,
          error: null
        })
      } catch (e: any) {
        if (!isMounted) return
        setState(prev => ({ ...prev, loading: false, error: e?.message || 'Failed to load KPIs' }))
      }
    }
    load()
    return () => { isMounted = false }
  }, [bookingId])

  return state
}


