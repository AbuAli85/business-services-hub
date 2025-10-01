import React, { useState } from 'react'
import { StatusPill } from '@/components/ui/StatusPill'
import { normalizeStatus } from '@/lib/status'
import { safePercent } from '@/lib/progress'
import { formatMuscat } from '@/lib/dates'

type Totals = {
  milestonesDone: number
  milestonesTotal: number
  tasksDone: number
  tasksTotal: number
}

export function SmartStatusOverview({
  booking,
  totals,
  currentUserId,
  onApprove,
  onDecline,
}: {
  booking: { id: string; status?: string; provider_id: string; deadline?: string }
  totals: Totals
  currentUserId?: string | null
  onApprove: () => Promise<void>
  onDecline: () => Promise<void>
}) {
  const s = normalizeStatus(booking.status)
  const mPct = safePercent(totals.milestonesDone, totals.milestonesTotal)
  const tPct = safePercent(totals.tasksDone, totals.tasksTotal)
  const canApprove = s === 'pending_provider_approval' && currentUserId === booking.provider_id
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null)
  const [actionMsg, setActionMsg] = useState('')

  return (
    <section className="rounded-lg border bg-white p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Smart Status Overview</h3>
          <StatusPill status={s} />
        </div>
        <div className="text-xs text-slate-600">
          Deadline: {formatMuscat(booking.deadline)}
        </div>
      </header>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Milestones</span>
            <span>
              {totals.milestonesTotal > 0
                ? `${totals.milestonesDone}/${totals.milestonesTotal} • ${mPct}%`
                : 'No milestones yet'}
            </span>
          </div>
          <div className="mt-1 h-2 w-full rounded bg-slate-100">
            <div className="h-2 rounded bg-slate-400" style={{ width: `${mPct}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Tasks</span>
            <span>
              {totals.tasksTotal > 0
                ? `${totals.tasksDone}/${totals.tasksTotal} • ${tPct}%`
                : 'No tasks yet'}
            </span>
          </div>
          <div className="mt-1 h-2 w-full rounded bg-slate-100">
            <div className="h-2 rounded bg-slate-400" style={{ width: `${tPct}%` }} />
          </div>
        </div>
      </div>

      {s === 'pending_provider_approval' && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <div className="mb-1 font-medium text-amber-900">Next Action Required</div>
          <div className="text-amber-900">Provider needs to approve booking.</div>
          {canApprove && (
            <div className="mt-3 flex gap-2">
              <div role="status" aria-live="polite" className="sr-only">{actionMsg}</div>
              <button
                className="btn btn-primary"
                disabled={busy !== null}
                onClick={async () => {
                  try {
                    setBusy('approve'); setActionMsg('Approving booking…')
                    await onApprove()
                    setActionMsg('Booking approved.')
                  } catch { setActionMsg('Approval failed.') }
                  finally { setBusy(null) }
                }}
              >
                {busy === 'approve' ? 'Processing…' : 'Approve Booking'}
              </button>
              <button
                className="btn btn-outline"
                disabled={busy !== null}
                onClick={async () => {
                  try {
                    setBusy('decline'); setActionMsg('Declining booking…')
                    await onDecline()
                    setActionMsg('Booking declined.')
                  } catch { setActionMsg('Decline failed.') }
                  finally { setBusy(null) }
                }}
              >
                {busy === 'decline' ? 'Processing…' : 'Decline'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}


