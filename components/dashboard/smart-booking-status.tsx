"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  CheckCircle,
  Clock,
  Play,
  Pause,
  AlertTriangle,
  Target,
  Award,
  MessageSquare,
  Receipt,
  Settings,
  Shield,
  X,
  XCircle,
  ThumbsUp,
  Calendar,
  BarChart3,
  Zap,
  Bell,
  TrendingUp,
  Star,
  Users,
  DollarSign,
  Timer,
  CheckCircle2,
  AlertCircle,
  Info,
  Sparkles,
  Rocket,
  Crown,
  Gem,
  Flame
} from 'lucide-react'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent
} from '@/components/ui/tooltip'
import { toast } from 'sonner'

import { SmartBookingStatus, ContextualAction, smartBookingStatusService } from '@/lib/smart-booking-status'

const toTitle = (str: string) => str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
const clampPct = (value: number) => Math.min(100, Math.max(0, Math.round(value || 0)))

type Priority = 'low' | 'medium' | 'high'
type StatusKey =
  | 'pending_review' | 'approved' | 'ready_to_launch' | 'in_production'
  | 'delivered' | 'on_hold' | 'cancelled' | 'completed' | 'pending'
  | 'in_progress' | 'unknown'

const statusStyles: Record<StatusKey, {
  icon: React.ReactNode
  label: string
  className: string
  glow: string
  priority: Priority
}> = {
  pending_review: {
    icon: <Clock className="h-3 w-3" />,
    label: 'Pending Review',
    className: 'text-amber-700 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-sm',
    glow: 'shadow-amber-200',
    priority: 'low'
  },
  approved: {
    icon: <Gem className="h-3 w-3" />,
    label: 'Approved',
    className: 'text-purple-700 border-purple-200 bg-gradient-to-r from-purple-50 to-violet-50 shadow-sm',
    glow: 'shadow-purple-200',
    priority: 'medium'
  },
  ready_to_launch: {
    icon: <Rocket className="h-3 w-3" />,
    label: 'Ready to Launch',
    className: 'text-blue-700 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 shadow-sm',
    glow: 'shadow-blue-200',
    priority: 'high'
  },
  in_production: {
    icon: <Flame className="h-3 w-3" />,
    label: 'In Production',
    className: 'text-orange-700 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 shadow-sm',
    glow: 'shadow-orange-200',
    priority: 'high'
  },
  delivered: {
    icon: <Crown className="h-3 w-3" />,
    label: 'Delivered',
    className: 'text-emerald-700 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 shadow-sm',
    glow: 'shadow-emerald-200',
    priority: 'high'
  },
  on_hold: {
    icon: <Pause className="h-3 w-3" />,
    label: 'On Hold',
    className: 'text-gray-700 border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50 shadow-sm',
    glow: 'shadow-gray-200',
    priority: 'medium'
  },
  cancelled: {
    icon: <XCircle className="h-3 w-3" />,
    label: 'Cancelled',
    className: 'text-red-700 border-red-200 bg-gradient-to-r from-red-50 to-rose-50 shadow-sm',
    glow: 'shadow-red-200',
    priority: 'low'
  },
  completed: {
    icon: <CheckCircle className="h-3 w-3" />,
    label: 'Completed',
    className: 'text-emerald-700 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 shadow-sm',
    glow: 'shadow-emerald-200',
    priority: 'high'
  },
  pending: {
    icon: <Clock className="h-3 w-3" />,
    label: 'Pending',
    className: 'text-amber-700 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-sm',
    glow: 'shadow-amber-200',
    priority: 'low'
  },
  in_progress: {
    icon: <Play className="h-3 w-3" />,
    label: 'In Progress',
    className: 'text-blue-700 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 shadow-sm',
    glow: 'shadow-blue-200',
    priority: 'high'
  },
  unknown: {
    icon: <AlertTriangle className="h-3 w-3" />,
    label: 'Unknown',
    className: 'text-gray-700 border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50 shadow-sm',
    glow: 'shadow-gray-200',
    priority: 'low'
  }
}

const getStatusConfig = (status: string) =>
  statusStyles[(status as StatusKey) in statusStyles ? (status as StatusKey) : 'unknown']

const actionIcons: Record<
  'approve'|'decline'|'manage'|'view'|'invoice'|'message',
  React.ReactNode
> = {
  approve: <ThumbsUp className="h-3 w-3" />,
  decline: <X className="h-3 w-3" />,
  manage: <Settings className="h-3 w-3" />,
  view: <Info className="h-3 w-3" />,
  invoice: <Receipt className="h-3 w-3" />,
  message: <MessageSquare className="h-3 w-3" />
}

const fmtMuscatDate = (d: string | number | Date) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Muscat',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(d))

interface SmartBookingStatusProps {
  bookingId: string
  userRole: 'client' | 'provider' | 'admin'
  compact?: boolean
  onStatusChangeAction?: () => void
}

export function SmartBookingStatusComponent({
  bookingId,
  userRole,
  compact = false,
  onStatusChangeAction
}: SmartBookingStatusProps) {
  const [status, setStatus] = useState<SmartBookingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [selectedAction, setSelectedAction] = useState<ContextualAction | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    loadSmartStatus()
    return () => { mountedRef.current = false }
  }, [bookingId])

  const loadSmartStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const smartStatus = await smartBookingStatusService.getSmartStatus(bookingId, userRole)
      if (!mountedRef.current) return
      setStatus(smartStatus)
    } catch (err) {
      console.error('Failed to load smart status:', err)
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to load status')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  const executeAction = async (action: ContextualAction, params: Record<string, any> = {}) => {
    try {
      setActionLoading(action.id)
      const result = await smartBookingStatusService.executeAction(
        bookingId,
        action.action,
        { ...action.params, ...params },
        userRole
      )
      if (result.success) {
        toast.success(result.message)
        await loadSmartStatus()
        onStatusChangeAction?.()
      } else {
        toast.error(result.message)
      }
    } catch (err) {
      console.error('Action execution failed:', err)
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(null)
      setShowActionDialog(false)
      setSelectedAction(null)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse" aria-busy="true" aria-live="polite">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    )
  }

  if (error || !status) {
    return (
      <div className="text-red-600 text-sm">
        <AlertTriangle className="h-4 w-4 inline mr-1" />
        Status unavailable
      </div>
    )
  }

  if (compact) {
    const cfg = getStatusConfig(status.overall_status)
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className={cfg.className} variant="outline">
            {cfg.icon}
            <span className="ml-1">{cfg.label}</span>
          </Badge>
          {status.current_milestone && (
            <Badge variant="outline" className="text-xs">
              {status.current_milestone}
            </Badge>
          )}
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{clampPct(status.progress_percentage)}%</span>
          </div>
          <Progress value={clampPct(status.progress_percentage)} className="h-2" />
          {status.milestones_total > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {status.milestones_completed}/{status.milestones_total} milestones • {status.tasks_completed}/{status.tasks_total} tasks
            </div>
          )}
        </div>

        {status.next_action && (
          <div className="text-xs text-gray-600">
            <Clock className="h-3 w-3 inline mr-1" />
            {status.next_action}
          </div>
        )}

        {status.contextual_actions.filter(a => a.urgent).slice(0, 1).map(action => (
          <Button
            key={action.id}
            size="sm"
            className={`text-xs ${action.type === 'primary' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            onClick={() => executeAction(action)}
            disabled={!!actionLoading}
            aria-busy={actionLoading === action.id}
          >
            {actionIcons[action.action as keyof typeof actionIcons] ?? <Target className="h-3 w-3" />}
            <span className="ml-1">{action.label}</span>
          </Button>
        ))}
      </div>
    )
  }

  const headerCfg = getStatusConfig(status.overall_status)

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${headerCfg.className}`}>
              {headerCfg.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {headerCfg.label} Project
              </h3>
              {status.status_description && (
                <p className="text-sm text-gray-600">{status.status_description}</p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadSmartStatus}>
            <Zap className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-bold">{clampPct(status.progress_percentage)}%</span>
          </div>
          <Progress value={clampPct(status.progress_percentage)} className="h-3 mb-3" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span>{status.milestones_completed}/{status.milestones_total} Milestones</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>{status.tasks_completed}/{status.tasks_total} Tasks</span>
            </div>
            {status.current_phase && (
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                <span>{status.current_phase}</span>
              </div>
            )}
            {status.estimated_completion && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-600" />
                <span>ETA: {fmtMuscatDate(status.estimated_completion)}</span>
              </div>
            )}
          </div>
        </div>

        {status.current_milestone && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Play className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Currently Working On</span>
            </div>
            <p className="text-blue-800">{status.current_milestone}</p>
          </div>
        )}

        {status.next_action && (
          <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-900">Next Action Required</span>
            </div>
            <p className="text-amber-800">{status.next_action}</p>
            {status.next_action_by && (
              <p className="text-xs text-amber-700 mt-1">
                Action required by: <span className="font-medium">{status.next_action_by}</span>
              </p>
            )}
          </div>
        )}

        {(status.contextual_actions?.length ?? 0) > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              Available Actions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {status.contextual_actions!.map(action => (
                <Button
                  key={action.id}
                  variant={action.type === 'primary' ? 'default' : 'outline'}
                  className={`justify-start text-left h-auto p-4 ${
                    action.type === 'danger' ? 'border-red-200 hover:bg-red-50' :
                    action.type === 'success' ? 'border-green-200 hover:bg-green-50' :
                    action.urgent ? 'ring-2 ring-blue-200 shadow-lg' : ''
                  }`}
                  onClick={() => { setSelectedAction(action); setShowActionDialog(true) }}
                  disabled={!!actionLoading}
                  aria-busy={actionLoading === action.id}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className={`p-2 rounded ${
                      action.type === 'primary' ? 'bg-blue-100 text-blue-600' :
                      action.type === 'danger' ? 'bg-red-100 text-red-600' :
                      action.type === 'success' ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {actionIcons[action.action as keyof typeof actionIcons] ?? <Target className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm flex items-center gap-2">
                        {action.label}
                        {action.urgent && <Badge className="bg-red-100 text-red-800 text-xs">Urgent</Badge>}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedAction && (actionIcons[selectedAction.action as keyof typeof actionIcons] ?? <Info className="h-4 w-4" />)}
                Confirm Action
              </DialogTitle>
            </DialogHeader>

            {selectedAction && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">{selectedAction.label}</h4>
                  <p className="text-sm text-gray-600">{selectedAction.description}</p>
                </div>

                {selectedAction.type === 'danger' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-800">
                      This action cannot be undone. Please confirm you want to proceed.
                    </p>
                  </div>
                )}

                {selectedAction.action === 'add_feedback' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your Rating (optional)</label>
                      <div className="flex gap-2 items-center">
                        {[1,2,3,4,5].map(n => (
                          <button
                            key={n}
                            type="button"
                            className={`h-8 w-8 rounded-full border text-sm ${
                              feedbackRating && feedbackRating >= n ? 'bg-yellow-400 border-yellow-500' : 'bg-white hover:bg-gray-50'
                            }`}
                            onClick={() => setFeedbackRating(n)}
                            aria-label={`Rate ${n}`}
                          >
                            {n}
                          </button>
                        ))}
                        {feedbackRating !== null && (
                          <button type="button" className="text-xs text-gray-500 underline" onClick={() => setFeedbackRating(null)}>Clear</button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        rows={4}
                        placeholder="Share feedback on the current progress..."
                        className="w-full rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowActionDialog(false)}>Cancel</Button>
                  <Button
                    className={
                      selectedAction.type === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                      selectedAction.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                      'bg-blue-600 hover:bg-blue-700'
                    }
                    onClick={async () => {
                      if (!selectedAction) return
                      if (selectedAction.action === 'add_feedback') {
                        if (!feedbackText.trim() && (feedbackRating === null)) return
                        await executeAction(selectedAction, { comment: feedbackText.trim(), rating: feedbackRating ?? undefined })
                        setFeedbackText('')
                        setFeedbackRating(null)
                        onStatusChangeAction?.()
                        return
                      }
                      await executeAction(selectedAction)
                    }}
                    aria-busy={actionLoading === selectedAction?.id}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === selectedAction?.id ? 'Processing...' : 'Confirm'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

interface Milestone {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed' | string
  progress_percentage?: number
}

export function CompactBookingStatus({
  bookingId,
  userRole,
  onStatusChangeAction
}: {
  bookingId: string
  userRole: 'client' | 'provider' | 'admin'
  onStatusChangeAction?: () => void
}) {
  const [progress, setProgress] = useState<number>(0)
  const [status, setStatus] = useState<StatusKey>('pending')
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  type Cached = { json: any; ts: number }
  const cache = (CompactBookingStatus as any)._cache || ((CompactBookingStatus as any)._cache = new Map<string, Cached>())
  const inflight = (CompactBookingStatus as any)._inflight || ((CompactBookingStatus as any)._inflight = new Map<string, Promise<any>>())
  const maxConcurrent = 4
  const counters = (CompactBookingStatus as any)._counter || ((CompactBookingStatus as any)._counter = { active: 0 })
  const STALE_MS = 5_000

  const backoff = async (attempt: number, baseMs = 300, capMs = 2000) => {
    const ms = Math.min(capMs, baseMs * 2 ** attempt)
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * Math.max(200, ms))))
  }

  const loadStatusAndProgress = async () => {
    try {
      setLoading(true)

      const cached = cache.get(bookingId) as Cached | undefined
      if (cached && Date.now() - cached.ts < STALE_MS) {
        await applyBooking(cached.json)
        setLoading(false)
        return
      }

      while (counters.active >= maxConcurrent) {
        await new Promise(r => setTimeout(r, 50))
      }

      if (inflight.has(bookingId)) {
        const json = await inflight.get(bookingId)!
        await applyBooking(json)
        setLoading(false)
        return
      }

      const fetchOnce = async () => {
        abortRef.current?.abort()
        const ctrl = new AbortController()
        abortRef.current = ctrl
        return fetch(`/api/bookings/${bookingId}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          cache: 'no-store'
        })
      }

      counters.active++
      let res: Response
      try {
        let attempt = 0
        while (true) {
          res = await fetchOnce()
          if (res.status !== 429 || attempt >= 3) break
          await backoff(attempt++)
        }
      } finally {
        counters.active = Math.max(0, counters.active - 1)
      }

      if (!res!.ok) {
        console.error('Error fetching booking:', res!.status)
        setStatus('pending')
        setProgress(0)
        return
      }

      const p = res!.json()
      inflight.set(bookingId, p)
      const json = await p.finally(() => inflight.delete(bookingId))
      cache.set(bookingId, { json, ts: Date.now() })
      await applyBooking(json)
    } catch (e) {
      console.error('Failed to load booking progress:', e)
      setStatus('pending')
      setProgress(0)
      setError('Failed to load status')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  const applyBooking = async (json: any) => {
    if (!mountedRef.current) return
    const booking = json?.booking ?? (Array.isArray(json?.bookings) ? json.bookings[0] : null)
    if (!booking) {
      setStatus('pending')
      setProgress(0)
      return
    }

    try {
      const fetchMilestonesOnce = () => fetch(`/api/milestones?bookingId=${bookingId}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      })

      let milestonesRes: Response
      {
        let attempt = 0
        while (true) {
          milestonesRes = await fetchMilestonesOnce()
          if (milestonesRes.status !== 429 || attempt >= 3) break
          await backoff(attempt++)
        }
      }

      if (milestonesRes.ok) {
        const milestonesData = await milestonesRes.json()
        const data: Milestone[] = milestonesData.milestones || []
        setMilestones(data)

        if (data.length === 0) {
          const defaultProgress =
            booking.status === 'completed' ? 100 :
            booking.status === 'in_progress' ? 50 :
            booking.status === 'approved' || booking.status === 'confirmed' ||
            ((booking.approval_status === 'approved' || booking.ui_approval_status === 'approved') && booking.status === 'pending') ? 10 : 0
          setProgress(clampPct(defaultProgress))
        } else {
          const completed = data.filter(m => m.status === 'completed').length
          const inProgress = data.filter(m => m.status === 'in_progress').length
          const total = data.length
          const pct = total > 0 ? ((completed + (inProgress * 0.5)) / total) * 100 : 0
          setProgress(clampPct(pct))
        }

        const completed = data.filter(m => m.status === 'completed').length

        let derived: StatusKey
        if (data.length > 0 && completed === data.length) derived = 'delivered'
        else if (booking.status === 'completed') derived = 'delivered'
        else if (booking.status === 'in_progress') derived = 'in_production'
        else if ((booking.approval_status === 'approved' || booking.ui_approval_status === 'approved') && booking.status === 'pending') derived = 'ready_to_launch'
        else if (booking.status === 'approved') derived = 'approved'
        else if (booking.status === 'pending') derived = 'pending_review'
        else derived = (booking.status as StatusKey) || 'pending_review'

        setStatus(derived || 'pending_review')
      } else {
        const defaultProgress =
          booking.status === 'completed' ? 100 :
          booking.status === 'in_progress' ? 50 :
          booking.status === 'approved' || booking.status === 'confirmed' ||
          ((booking.approval_status === 'approved' || booking.ui_approval_status === 'approved') && booking.status === 'pending') ? 10 : 0
        setProgress(clampPct(defaultProgress))
        setMilestones([])

        let fallback: StatusKey = (booking.status as StatusKey) || 'pending'
        if ((booking.approval_status === 'approved' || booking.ui_approval_status === 'approved') && booking.status === 'pending') {
          fallback = 'ready_to_launch'
        }
        setStatus(fallback)
      }
    } catch (err) {
      console.error('Error loading milestones:', err)
      setError('Failed to load milestones')

      const defaultProgress =
        booking.status === 'completed' ? 100 :
        booking.status === 'in_progress' ? 50 :
        booking.status === 'approved' || booking.status === 'confirmed' ||
        ((booking.approval_status === 'approved' || booking.ui_approval_status === 'approved') && booking.status === 'pending') ? 10 : 0
      setProgress(clampPct(defaultProgress))
      setMilestones([])

      let fallback: StatusKey = (booking.status as StatusKey) || 'pending'
      if ((booking.approval_status === 'approved' || booking.ui_approval_status === 'approved') && booking.status === 'pending') {
        fallback = 'ready_to_launch'
      }
      setStatus(fallback)
    }

    onStatusChangeAction?.()
  }

  useEffect(() => {
    mountedRef.current = true
    loadStatusAndProgress()
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [bookingId, userRole])

  if (loading) {
    return (
      <div className="space-y-1" aria-busy="true" aria-live="polite">
        <div className="animate-pulse bg-gray-200 h-5 w-20 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-2 w-16 rounded"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3 w-3 text-amber-500" />
          <span className="text-xs text-amber-600">Error loading status</span>
        </div>
        <button
          onClick={() => { setError(null); setLoading(true); loadStatusAndProgress() }}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  const tooltipLines = useMemo(() => {
    if (milestones.length === 0) return ['No milestones created yet']
    const completed = milestones.filter(m => m.status === 'completed')
    const inProgress = milestones.filter(m => m.status === 'in_progress')
    const pending = milestones.filter(m => m.status === 'pending')
    const lines: string[] = []
    lines.push(`${completed.length}/${milestones.length} milestones completed (${clampPct(progress)}%)`)
    if (completed.length > 0) {
      const t = completed.slice(0, 3).map(m => m.title).join(', ')
      lines.push(`Completed: ${t}${completed.length > 3 ? ` (+${completed.length - 3} more)` : ''}`)
    }
    if (inProgress.length > 0) {
      const t = inProgress.slice(0, 2).map(m => m.title).join(', ')
      lines.push(`In Progress: ${t}${inProgress.length > 2 ? ` (+${inProgress.length - 2} more)` : ''}`)
    }
    if (pending.length > 0) {
      const t = pending.slice(0, 2).map(m => m.title).join(', ')
      lines.push(`Pending: ${t}${pending.length > 2 ? ` (+${pending.length - 2} more)` : ''}`)
    }
    return lines
  }, [milestones, progress])

  const cfg = getStatusConfig(status)
  const isHigh = cfg.priority === 'high'
  const isCompleted = status === 'delivered' || status === 'completed'
  const isInProgress = status === 'in_production' || status === 'in_progress'
  const hasMilestones = milestones.length > 0

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-2 cursor-pointer group">
            <div className={`relative ${isHigh ? 'animate-pulse' : ''}`}>
              <Badge
                variant="outline"
                className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200 group-hover:scale-105 ${cfg.className} ${cfg.glow}`}
              >
                {cfg.icon}
                <span className="capitalize tracking-wide">{cfg.label}</span>
                {isHigh && <div className="w-2 h-2 bg-current rounded-full animate-ping opacity-75" />}
              </Badge>

              <div
                className={`absolute -bottom-1 left-0 right-0 h-0.5 rounded-full ${
                  status === 'delivered' ? 'bg-gradient-to-r from-emerald-400 to-green-400' :
                  status === 'in_production' ? 'bg-gradient-to-r from-orange-400 to-red-400' :
                  status === 'ready_to_launch' ? 'bg-gradient-to-r from-blue-400 to-cyan-400' :
                  status === 'approved' ? 'bg-gradient-to-r from-purple-400 to-violet-400' :
                  'bg-gradient-to-r from-amber-400 to-yellow-400'
                }`}
              />
            </div>

            {hasMilestones ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Progress
                      value={clampPct(progress)}
                      className="h-2.5 rounded-full"
                    />
                    <div className={`absolute inset-0 rounded-full blur-sm opacity-30 ${
                      progress === 100 ? 'bg-emerald-400' :
                      progress >= 75 ? 'bg-blue-400' :
                      progress >= 50 ? 'bg-yellow-400' :
                      progress >= 25 ? 'bg-orange-400' :
                      'bg-gray-400'
                    }`} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-gray-800">{clampPct(progress)}%</span>
                    {progress === 100 && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    {isInProgress && <Flame className="h-4 w-4 text-blue-600 animate-pulse" />}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-gray-500" />
                      <span className="text-gray-600 font-medium">
                        {milestones.filter(m => m.status === 'completed').length}/{milestones.length}
                      </span>
                      <span className="text-gray-500">milestones</span>
                      {milestones.some(m => m.status === 'in_progress') && (
                        <span className="text-blue-600 text-xs">
                          • {milestones.filter(m => m.status === 'in_progress').length} active
                        </span>
                      )}
                    </div>
                  </div>

                  {progress > 0 && (
                    <div className="flex items-center gap-1">
                      {progress === 100 ? (
                        <Star className="h-3 w-3" />
                      ) : progress >= 75 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <Timer className="h-3 w-3" />
                      )}
                    </div>
                  )}
                </div>

                {milestones.some(m => m.status === 'in_progress') && (
                  <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="font-medium">Active development in progress</span>
                    <Sparkles className="h-3 w-3" />
                  </div>
                )}

                {isCompleted && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                    <Award className="h-3 w-3 text-emerald-600" />
                    <span className="font-medium">Project successfully delivered</span>
                    <Crown className="h-3 w-3" />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic">
                {status === 'delivered' ? 'Project successfully delivered' :
                 status === 'in_production' ? 'Active development in progress' :
                 status === 'ready_to_launch' ? 'All prerequisites met • Ready to begin development' :
                 status === 'approved' ? 'Project approved • Waiting for team assignment' :
                 status === 'pending_review' ? 'Awaiting provider approval' :
                 'Project status being determined'}
              </div>
            )}
          </div>
        </TooltipTrigger>

        <TooltipContent className="max-w-xs whitespace-pre-line">
          {tooltipLines.map((l, i) => <div key={i}>{l}</div>)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
