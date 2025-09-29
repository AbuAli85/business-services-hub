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

  const byDay: Record<number, number> = {}
  for (const b of bookings) {
    const d = new Date(b.scheduled_date || b.createdAt || b.created_at)
    if (d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear()) {
      const day = d.getDate()
      byDay[day] = (byDay[day] || 0) + 1
    }
  }

  const prevMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
  const nextMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))

  const cells: Array<JSX.Element> = []
  for (let i = 0; i < startWeekday; i++) cells.push(<div key={`empty-${i}`} />)
  for (let d = 1; d <= daysInMonth; d++) {
    const count = byDay[d] || 0
    const dateISO = new Date(month.getFullYear(), month.getMonth(), d).toISOString()
    cells.push(
      <button key={d} className="border rounded p-2 text-left hover:bg-slate-50" onClick={()=> onDateSelect?.(dateISO)}>
        <div className="text-xs text-muted-foreground">{d}</div>
        {count > 0 && <div className="mt-1 text-sm font-medium">{count} booking{count>1?'s':''}</div>}
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


