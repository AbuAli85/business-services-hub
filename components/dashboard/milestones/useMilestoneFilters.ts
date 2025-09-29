'use client'

import { useMemo, useState } from 'react'
import { useDebouncedValue } from '@/components/ui/unified-search'
import type { Milestone } from '@/types/progress'

type Status = 'all' | 'pending' | 'in_progress' | 'completed' | 'rejected'
type ProjectType = 'all' | 'one_time' | 'monthly' | '3_months' | '6_months' | '9_months' | '12_months'

export interface MilestoneFiltersState {
  status: Status
  setStatus: (s: Status) => void
  projectType: ProjectType
  setProjectType: (p: ProjectType) => void
  dateFrom?: string
  setDateFrom: (d?: string) => void
  dateTo?: string
  setDateTo: (d?: string) => void
  query: string
  setQuery: (q: string) => void
}

export function useMilestoneFilters(milestones: Milestone[]) {
  const [status, setStatus] = useState<Status>('all')
  const [projectType, setProjectType] = useState<ProjectType>('all')
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined)
  const [dateTo, setDateTo] = useState<string | undefined>(undefined)
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 250)

  const filtered = useMemo(() => {
    const q = debounced.toLowerCase()
    return (milestones || []).filter((m: any) => {
      const statusOk = status === 'all' || m.status === status
      const typeValue = m.project_type || 'one_time'
      const typeOk = projectType === 'all' || typeValue === projectType
      const dt = new Date(m.due_date || m.created_at || m.updated_at || Date.now()).getTime()
      const fromOk = !dateFrom || dt >= new Date(dateFrom).getTime()
      const toOk = !dateTo || dt <= new Date(dateTo).getTime()
      const searchOk =
        q === '' ||
        (m.title || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q)
      return statusOk && typeOk && fromOk && toOk && searchOk
    })
  }, [milestones, status, projectType, dateFrom, dateTo, debounced])

  return {
    filters: { status, setStatus, projectType, setProjectType, dateFrom, setDateFrom, dateTo, setDateTo, query, setQuery },
    filtered,
  }
}


