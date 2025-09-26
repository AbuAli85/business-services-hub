'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

type ChangeHandler = (evt: { type: 'INSERT' | 'UPDATE' | 'DELETE'; new?: any; old?: any }) => void

export function useBookingsRealtime(onChange: ChangeHandler, enabled: boolean = true) {
  const cleanupRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!enabled) return

    let isCancelled = false
    const subs: any[] = []

    const init = async () => {
      const supabase = await getSupabaseClient()
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || isCancelled) return

      // Create filter strings inside the async function where user.id is available
      const clientFilter = `client_id=eq.${user.id}`
      const providerFilter = `provider_id=eq.${user.id}`

      // Subscribe to bookings where user is client
      const chClient = supabase
        .channel(`bookings-client-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: clientFilter }, (payload) => {
          onChange({ type: payload.eventType as any, new: payload.new, old: payload.old })
        })
        .subscribe()
      subs.push(chClient)

      // Subscribe to bookings where user is provider
      const chProvider = supabase
        .channel(`bookings-provider-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: providerFilter }, (payload) => {
          onChange({ type: payload.eventType as any, new: payload.new, old: payload.old })
        })
        .subscribe()
      subs.push(chProvider)

      cleanupRef.current = () => {
        subs.forEach((ch) => supabase.removeChannel(ch))
      }
    }

    init()

    return () => {
      isCancelled = true
      cleanupRef.current?.()
    }
  }, [onChange, enabled])
}


