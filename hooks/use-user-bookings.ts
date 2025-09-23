'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

export interface UserBooking {
  id: string
  title?: string
  amount?: number
  currency?: string
  status: string
  created_at: string
  client_id: string
  provider_id: string
  service?: { id: string; title?: string; description?: string } | null
}

export function useUserBookings() {
  const [bookings, setBookings] = useState<UserBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabaseRef = useRef<any>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = await getSupabaseClient()
      supabaseRef.current = supabase
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setBookings([])
        setLoading(false)
        return
      }

      const [asClient, asProvider] = await Promise.all([
        fetch('/api/bookings?role=client', { cache: 'no-store' }).then((r) => r.ok ? r.json() : r.json().then((x) => Promise.reject(x))).catch(() => ({ bookings: [] })),
        fetch('/api/bookings?role=provider', { cache: 'no-store' }).then((r) => r.ok ? r.json() : r.json().then((x) => Promise.reject(x))).catch(() => ({ bookings: [] })),
      ])

      const merged = [...(asClient.bookings || []), ...(asProvider.bookings || [])]
      const byId = new Map<string, any>()
      for (const b of merged) byId.set(b.id, b)
      setBookings(Array.from(byId.values()))
    } catch (e: any) {
      setError(e?.message || 'Failed to load bookings')
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    let subs: any[] = []
    let cancelled = false
    const init = async () => {
      const supabase = supabaseRef.current || (await getSupabaseClient())
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const ch1 = supabase
        .channel(`bookings-rt-client-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `client_id=eq.${user.id}` }, () => fetchAll())
        .subscribe()
      const ch2 = supabase
        .channel(`bookings-rt-provider-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `provider_id=eq.${user.id}` }, () => fetchAll())
        .subscribe()
      subs = [ch1, ch2]
    }
    init()
    return () => {
      cancelled = true
      if (supabaseRef.current) subs.forEach((c) => supabaseRef.current.removeChannel(c))
    }
  }, [fetchAll])

  return { bookings, loading, error, refresh: fetchAll }
}


