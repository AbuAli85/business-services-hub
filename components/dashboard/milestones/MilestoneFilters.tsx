'use client'

import UnifiedSearch from '@/components/ui/unified-search'
import DateRangeFilter from '@/components/ui/date-range-filter'

interface Props {
  status: string
  setStatus: (s: any) => void
  projectType: string
  setProjectType: (p: any) => void
  dateFrom?: string
  setDateFrom: (v?: string) => void
  dateTo?: string
  setDateTo: (v?: string) => void
  onSearch: (q: string) => void
}

export default function MilestoneFilters({
  status, setStatus, projectType, setProjectType,
  dateFrom, setDateFrom, dateTo, setDateTo,
  onSearch,
}: Props) {
  return (
    <div className="bg-white border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <UnifiedSearch
            placeholder="Search milestones..."
            debounceMs={300}
            onSearch={onSearch}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Status</label>
          <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Project Type</label>
          <select className="form-input" value={projectType} onChange={e => setProjectType(e.target.value)}>
            <option value="all">All</option>
            <option value="one_time">One Time</option>
            <option value="monthly">Monthly</option>
            <option value="3_months">3 Months</option>
            <option value="6_months">6 Months</option>
            <option value="9_months">9 Months</option>
            <option value="12_months">12 Months</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Date</span>
        <DateRangeFilter
          value={{ from: dateFrom, to: dateTo }}
          onChange={(r) => { setDateFrom(r.from); setDateTo(r.to) }}
        />
      </div>
    </div>
  )
}


