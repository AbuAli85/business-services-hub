'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import UnifiedSearch from '@/components/ui/unified-search'
import { useDebouncedValue } from '@/components/ui/unified-search'
import React from 'react'

export type ActivityType = 'all' | 'bookings' | 'payments' | 'milestones' | 'system'
export type ActivityStatus = 'all' | 'completed' | 'pending' | 'failed' | 'approved' | 'info'
export type ActivityItem = {
  id: string
  type: 'booking' | 'payment' | 'milestones' | 'system'
  description: string
  timestamp: string | number | Date
  status: string
}

export interface ActivityFeedProps {
  title?: string
  description?: string
  items: ActivityItem[]
  defaultType?: ActivityType
  defaultStatus?: ActivityStatus
  defaultDateRange?: 'today' | 'week' | 'month'
  onViewAll?: () => void
}

export function ActivityFeed(props: ActivityFeedProps) {
  const {
    title = 'Recent Activity',
    description = 'Latest bookings and updates',
    items,
    defaultType = 'all',
    defaultStatus = 'all',
    defaultDateRange = 'month',
    onViewAll
  } = props

  const [activityType, setActivityType] = React.useState<ActivityType>(defaultType)
  const [activityStatus, setActivityStatus] = React.useState<ActivityStatus>(defaultStatus)
  const [activityDateRange, setActivityDateRange] = React.useState<'today' | 'week' | 'month'>(defaultDateRange)
  const [activityQuery, setActivityQuery] = React.useState('')
  const activityQ = useDebouncedValue(activityQuery, 250)

  const filteredItems = React.useMemo(() => {
    const now = new Date()
    return items.filter(a => {
      const typeOk = activityType === 'all' || a.type === (activityType === 'bookings' ? 'booking' : activityType)
      const statusOk = activityStatus === 'all' || a.status === activityStatus
      const ts = new Date(a.timestamp)
      let dateOk = true
      if (activityDateRange === 'today') {
        dateOk = ts.toDateString() === now.toDateString()
      } else if (activityDateRange === 'week') {
        const diff = (now.getTime() - ts.getTime()) / (1000 * 60 * 60 * 24)
        dateOk = diff <= 7
      } else {
        const diff = (now.getTime() - ts.getTime()) / (1000 * 60 * 60 * 24)
        dateOk = diff <= 31
      }
      const q = activityQ.toLowerCase()
      const searchOk = !q || a.description.toLowerCase().includes(q)
      return typeOk && statusOk && dateOk && searchOk
    })
  }, [items, activityType, activityStatus, activityDateRange, activityQ])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <select 
              className="form-input w-40" 
              value={activityType} 
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
              aria-label="Filter by activity type"
            >
              <option value="all">All Types</option>
              <option value="bookings">Bookings</option>
              <option value="payments">Payments</option>
              <option value="milestones">Milestones</option>
              <option value="system">System</option>
            </select>
            <select 
              className="form-input w-36" 
              value={activityStatus} 
              onChange={(e) => setActivityStatus(e.target.value as ActivityStatus)}
              aria-label="Filter by activity status"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="approved">Approved</option>
              <option value="info">Info</option>
            </select>
            <select 
              className="form-input w-32" 
              value={activityDateRange} 
              onChange={(e) => setActivityDateRange(e.target.value as any)}
              aria-label="Filter by date range"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <UnifiedSearch placeholder="Search activity..." onSearch={setActivityQuery} className="flex-1" />
          </div>

          {filteredItems.length > 0 ? (
            filteredItems.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${activity.type === 'payment' ? 'bg-green-500' : activity.type === 'milestones' ? 'bg-purple-500' : activity.type === 'system' ? 'bg-slate-400' : 'bg-blue-500'}`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
                </div>
                <Badge variant="outline" className="text-xs">{activity.status}</Badge>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          )}

          <div className="text-right">
            <button className="text-sm underline" onClick={onViewAll}>View All</button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ActivityFeed


