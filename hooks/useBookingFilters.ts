import { useMemo, useState } from 'react'

export interface UseBookingFiltersState {
  dateType: 'created' | 'start' | 'end'
  dateStart: string | null
  dateEnd: string | null
  amountMin: string
  amountMax: string
  clients: string[]
  providers: string[]
  serviceCategories: string[]
  duration: 'all' | 'short' | 'medium' | 'long'
}

export function useBookingFilters(initial?: Partial<UseBookingFiltersState>) {
  const [filters, setFilters] = useState<UseBookingFiltersState>({
    dateType: 'created',
    dateStart: null,
    dateEnd: null,
    amountMin: '',
    amountMax: '',
    clients: [],
    providers: [],
    serviceCategories: [],
    duration: 'all',
    ...initial
  })

  const clearFilters = () => setFilters({
    dateType: 'created', dateStart: null, dateEnd: null, amountMin: '', amountMax: '', clients: [], providers: [], serviceCategories: [], duration: 'all'
  })

  return { filters, setFilters, clearFilters }
}

export function applyBookingFilters(bookings: any[], f: UseBookingFiltersState) {
  return bookings.filter((b) => {
    // date
    const date = new Date(
      f.dateType === 'start' ? (b.startDate || b.scheduled_date || b.createdAt) :
      f.dateType === 'end' ? (b.endDate || b.completed_at || b.createdAt) :
      (b.createdAt || b.created_at)
    )
    if (f.dateStart && new Date(f.dateStart) > date) return false
    if (f.dateEnd && new Date(f.dateEnd) < date) return false

    // amount
    const amount = Number(b.totalAmount ?? b.amount ?? (b.amount_cents ? b.amount_cents / 100 : 0))
    if (f.amountMin && amount < Number(f.amountMin)) return false
    if (f.amountMax && amount > Number(f.amountMax)) return false

    // categories
    if (f.serviceCategories.length > 0) {
      const cat = String(b.serviceCategory || b.service_category || '')
      if (!f.serviceCategories.includes(cat)) return false
    }

    // duration (simple heuristic on estimated days)
    const estDays = Number(b.duration?.estimated ?? 0)
    if (f.duration !== 'all') {
      if (f.duration === 'short' && !(estDays > 0 && estDays <= 7)) return false
      if (f.duration === 'medium' && !(estDays > 7 && estDays <= 30)) return false
      if (f.duration === 'long' && !(estDays > 30)) return false
    }

    return true
  })
}


