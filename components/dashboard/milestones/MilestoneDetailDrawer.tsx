'use client'

import { useMemo } from 'react'
import type { Milestone, Task } from '@/types/progress'

interface Props {
  open: boolean
  onClose: () => void
  milestone: Milestone | null
  tasks: Task[]
  approvals?: any[]
}

export default function MilestoneDetailDrawer({ open, onClose, milestone, tasks, approvals = [] }: Props) {
  const progress = useMemo(() => {
    if (!tasks?.length) return 0
    const done = tasks.filter(t => t.status === 'completed').length
    return Math.round((done / tasks.length) * 100)
  }, [tasks])

  const estimated = (milestone?.estimated_hours || 0) + (tasks?.reduce((s, t) => s + (t.estimated_hours || 0), 0) || 0)
  const actual = tasks?.reduce((s, t) => s + (t.actual_hours || 0), 0) || 0
  const actualPct = estimated > 0 ? Math.min(100, Math.round((actual / estimated) * 100)) : 0

  if (!open || !milestone) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{milestone.title}</h2>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>

        <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
        <div className="text-sm text-gray-500 mb-4">
          Status: <span className="font-medium">{milestone.status}</span>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-600">{progress}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded">
            <div className="h-3 bg-green-500 rounded" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Estimated vs Actual</span>
            <span className="text-sm text-gray-600">{actual}/{estimated} hrs</span>
          </div>
          <div className="h-3 bg-gray-200 rounded">
            <div className="h-3 bg-blue-500 rounded" style={{ width: `${actualPct}%` }} />
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2">Tasks ({tasks?.length || 0})</h3>
          <ul className="space-y-2">
            {tasks?.map((t) => (
              <li key={t.id} className="border rounded p-2 flex justify-between">
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-gray-500">Est: {t.estimated_hours || 0}h · Act: {t.actual_hours || 0}h</div>
                </div>
                <div className="text-sm">{t.status}</div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Approvals</h3>
          {approvals?.length ? approvals.map((a: any) => (
            <div key={a.id} className="text-sm border rounded p-2 mb-2">
              <div>Status: {a.status}</div>
              <div>By: {a.approver_name || a.user_id}</div>
              <div className="text-gray-600">Comment: {a.comment || a.feedback || '-'}</div>
            </div>
          )) : <div className="text-sm text-gray-500">No approvals yet</div>}
        </div>
      </div>
    </div>
  )
}


