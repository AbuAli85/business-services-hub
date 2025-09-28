'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { ProgressTrackingService, TimeEntry } from '@/lib/progress-tracking'

interface TimeEntriesExampleProps {
  bookingId: string
}

export function TimeEntriesExample({ bookingId }: TimeEntriesExampleProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTimeEntries()
  }, [bookingId])

  const loadTimeEntries = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // ✅ CORRECT WAY: Use the service method that handles the relationship chain
      const entries = await ProgressTrackingService.getTimeEntriesByBookingId(bookingId)
      setTimeEntries(entries)
      
    } catch (err) {
      console.error('Error loading time entries:', err)
      setError(err instanceof Error ? err.message : 'Failed to load time entries')
    } finally {
      setLoading(false)
    }
  }

  // ❌ WRONG WAY: This will cause 406 error because time_entries doesn't have booking_id
  const wrongWay = async () => {
    const supabase = await getSupabaseClient()
    
    // This will fail with 406 error
    const { data, error } = await supabase
      .from('time_entries')
      .select('id, booking_id, duration, created_at') // booking_id doesn't exist!
      .eq('booking_id', bookingId)
  }

  // ✅ ALTERNATIVE CORRECT WAY: Direct query with proper relationship
  const alternativeCorrectWay = async () => {
    const supabase = await getSupabaseClient()
    
    // First get task IDs for this booking
    const { data: milestones } = await supabase
      .from('milestones')
      .select(`
        id,
        tasks(
          id
        )
      `)
      .eq('booking_id', bookingId)
    
    const allTaskIds = milestones?.flatMap(m => m.tasks?.map((t: any) => t.id) || []) || []
    
    // Filter out invalid task IDs (booking IDs, non-UUIDs, etc.)
    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    const taskIds = allTaskIds.filter((id: string) => {
      const isValid = isUuid(id) && id !== bookingId
      if (!isValid) {
        console.warn('⚠️ Filtering out invalid task ID from time entries query:', id, 'bookingId:', bookingId)
      }
      return isValid
    })
    
    if (taskIds.length === 0) return []
    
    // Then get time entries for those tasks
    const { data, error } = await supabase
      .from('time_entries')
      .select('id, task_id, duration_minutes, created_at')
      .in('task_id', taskIds)
      .order('created_at', { ascending: false })
    
    return data || []
  }

  if (loading) {
    return <div>Loading time entries...</div>
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Time Entries for Booking {bookingId}</h3>
      
      {timeEntries.length === 0 ? (
        <p className="text-gray-500">No time entries found for this booking.</p>
      ) : (
        <div className="space-y-2">
          {timeEntries.map((entry) => (
            <div key={entry.id} className="p-3 border rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">Task ID: {entry.task_id}</p>
                  <p className="text-sm text-gray-600">
                    Duration: {entry.duration_minutes || 0} minutes
                  </p>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs ${
                    entry.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {entry.is_active ? 'Active' : 'Completed'}
                  </span>
                </div>
              </div>
              {entry.description && (
                <p className="text-sm text-gray-600 mt-2">{entry.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Common 406 Error Fix</h4>
        <p className="text-sm text-yellow-700 mb-2">
          The <code>time_entries</code> table doesn't have a <code>booking_id</code> column.
          Use the relationship chain: <code>bookings → milestones → tasks → time_entries</code>
        </p>
        <p className="text-sm text-yellow-700">
          Use <code>ProgressTrackingService.getTimeEntriesByBookingId(bookingId)</code> instead.
        </p>
      </div>
    </div>
  )
}
