'use client'

import React from 'react'

export interface BookingCalendarProps {
  bookings: any[]
  onBookingMove?: (bookingId: string, newDateISO: string) => void
  onDateSelect?: (dateISO: string) => void
}

// Minimal placeholder: a simple monthly grid with counts (drag/drop can be added later)
export function BookingCalendar({ bookings, onBookingMove, onDateSelect }: BookingCalendarProps) {
  const [month, setMonth] = React.useState(() => new Date())

  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()

  const byDay: Record<number, { total: number; pending: number; confirmed: number; in_progress: number; overdue: number }> = {}
  for (const b of bookings) {
    const d = new Date(b.scheduled_date || b.createdAt || b.created_at)
    if (d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear()) {
      const day = d.getDate()
      const entry = byDay[day] || { total: 0, pending: 0, confirmed: 0, in_progress: 0, overdue: 0 }
      entry.total += 1
      const s = String(b.status)
      if (s === 'pending') entry.pending += 1
      else if (s === 'confirmed' || s === 'approved') entry.confirmed += 1
      else if (s === 'in_progress' || s === 'in_production') entry.in_progress += 1
      if (b.is_overdue) entry.overdue += 1
      byDay[day] = entry
    }
  }

  const prevMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
  const nextMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))

  const cells: Array<JSX.Element> = []
  for (let i = 0; i < startWeekday; i++) cells.push(<div key={`empty-${i}`} />)
  for (let d = 1; d <= daysInMonth; d++) {
    const entry = byDay[d]
    const count = entry?.total || 0
    const dateISO = new Date(month.getFullYear(), month.getMonth(), d).toISOString()
    cells.push(
      <button key={d} className="border rounded p-2 text-left hover:bg-slate-50" onClick={()=> onDateSelect?.(dateISO)}>
        <div className="text-xs text-muted-foreground">{d}</div>
        {count > 0 && (
          <div className="mt-1 text-xs">
            <div className="font-medium">{count} booking{count>1?'s':''}</div>
            <div className="flex items-center gap-1 mt-1">
              {entry?.confirmed ? <span title="Confirmed" className="inline-block w-2 h-2 rounded-full bg-green-500" /> : null}
              {entry?.in_progress ? <span title="In Progress" className="inline-block w-2 h-2 rounded-full bg-blue-500" /> : null}
              {entry?.pending ? <span title="Pending" className="inline-block w-2 h-2 rounded-full bg-yellow-500" /> : null}
              {entry?.overdue ? <span title="Overdue" className="inline-block w-2 h-2 rounded-full bg-red-500" /> : null}
            </div>
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="text-sm underline">Prev</button>
        <div className="text-sm font-medium">{month.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}</div>
        <button onClick={nextMonth} className="text-sm underline">Next</button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((w)=> (
          <div key={w} className="text-xs text-muted-foreground">{w}</div>
        ))}
        {cells}
      </div>
    </div>
  )
}

export default BookingCalendar


