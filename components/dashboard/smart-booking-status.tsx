'use client'

import React, { useState, useEffect } from 'react'
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
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { getSupabaseClient } from '@/lib/supabase-client'
import { SmartBookingStatus, ContextualAction, smartBookingStatusService } from '@/lib/smart-booking-status'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface SmartBookingStatusProps {
  bookingId: string
  userRole: 'client' | 'provider' | 'admin'
  compact?: boolean
  onStatusChangeAction?: () => void
}

// Helper function to convert strings to Title Case
const toTitle = (str: string) => {
  return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Helper function to clamp percentage values
const clampPct = (value: number) => Math.min(100, Math.max(0, value))

// Status styles map - moved to top to avoid TDZ issues
const statusStyles = {
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

// Action icons map
const actionIcons = {
  approve: <ThumbsUp className="h-3 w-3" />,
  decline: <X className="h-3 w-3" />,
  manage: <Settings className="h-3 w-3" />,
  view: <Info className="h-3 w-3" />,
  invoice: <Receipt className="h-3 w-3" />,
  message: <MessageSquare className="h-3 w-3" />
}

export function SmartBookingStatusComponent({
  bookingId,
  userRole,
  compact = false,
  onStatusChangeAction
}: SmartBookingStatusProps) {
  const router = useRouter()
  const [status, setStatus] = useState<SmartBookingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [selectedAction, setSelectedAction] = useState<ContextualAction | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null)

  useEffect(() => {
    loadSmartStatus()
  }, [bookingId])

  const loadSmartStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const smartStatus = await smartBookingStatusService.getSmartStatus(bookingId, userRole)
      setStatus(smartStatus)
    } catch (err) {
      console.error('Failed to load smart status:', err)
      setError(err instanceof Error ? err.message : 'Failed to load status')
    } finally {
      setLoading(false)
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
        await loadSmartStatus() // Reload status
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'in_progress': return <Play className="h-4 w-4" />
      case 'completed': return <Award className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      case 'on_hold': return <Pause className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      case 'on_hold': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getActionIcon = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      CheckCircle: <CheckCircle className="h-4 w-4" />,
      XCircle: <XCircle className="h-4 w-4" />,
      Target: <Target className="h-4 w-4" />,
      Play: <Play className="h-4 w-4" />,
      Award: <Award className="h-4 w-4" />,
      Receipt: <Receipt className="h-4 w-4" />,
      ThumbsUp: <ThumbsUp className="h-4 w-4" />,
      MessageSquare: <MessageSquare className="h-4 w-4" />,
      Settings: <Settings className="h-4 w-4" />,
      Shield: <Shield className="h-4 w-4" />
    }
    return iconMap[iconName] || <Target className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="animate-pulse">
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
    return (
      <div className="space-y-2">
        {/* Compact Status */}
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(status.overall_status)} variant="outline">
            {getStatusIcon(status.overall_status)}
            <span className="ml-1 capitalize">{status.overall_status.replace('_', ' ')}</span>
          </Badge>
          {status.current_milestone && (
            <Badge variant="outline" className="text-xs">
              {status.current_milestone}
            </Badge>
          )}
        </div>
        
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{status.progress_percentage}%</span>
          </div>
          <Progress 
            value={status.progress_percentage} 
            className={`h-2 ${
              status.progress_percentage === 100 ? 'bg-green-100' :
              status.progress_percentage >= 75 ? 'bg-blue-100' :
              status.progress_percentage >= 50 ? 'bg-yellow-100' :
              'bg-gray-100'
            }`}
          />
          {status.milestones_total > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {status.milestones_completed}/{status.milestones_total} milestones • {status.tasks_completed}/{status.tasks_total} tasks
            </div>
          )}
        </div>

        {/* Next Action */}
        {status.next_action && (
          <div className="text-xs text-gray-600">
            <Clock className="h-3 w-3 inline mr-1" />
            {status.next_action}
          </div>
        )}

        {/* Urgent Actions */}
        {status.contextual_actions.filter(a => a.urgent).slice(0, 1).map(action => (
          <Button
            key={action.id}
            size="sm"
            className={`text-xs ${action.type === 'primary' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            onClick={() => executeAction(action)}
            disabled={!!actionLoading}
          >
            {getActionIcon(action.icon)}
            <span className="ml-1">{action.label}</span>
          </Button>
        ))}
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${statusStyles[status.overall_status]?.className ?? statusStyles.unknown.className}`}>
              {getStatusIcon(status.overall_status)}
            </div>
            <div>
              <h3 className="text-lg font-semibold capitalize">
                {status.overall_status.replace('_', ' ')} Project
              </h3>
              <p className="text-sm text-gray-600">{status.status_description}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadSmartStatus}>
            <Zap className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </div>

        {/* Progress Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-bold">{status.progress_percentage}%</span>
          </div>
          <Progress value={status.progress_percentage} className="h-3 mb-3" />
          
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
                <span>ETA: {new Date(status.estimated_completion).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Current Activity */}
        {status.current_milestone && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Play className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Currently Working On</span>
            </div>
            <p className="text-blue-800">{status.current_milestone}</p>
          </div>
        )}

        {/* Next Action */}
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

        {/* Risks intentionally hidden for simplified Smart Status Overview in Manage Bookings */}

        {/* Contextual Actions */}
        {(status.contextual_actions?.length ?? 0) > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              Available Actions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {status.contextual_actions?.map(action => (
                <Button
                  key={action.id}
                  variant={action.type === 'primary' ? 'default' : 'outline'}
                  className={`justify-start text-left h-auto p-4 ${
                    action.type === 'danger' ? 'border-red-200 hover:bg-red-50' :
                    action.type === 'success' ? 'border-green-200 hover:bg-green-50' :
                    action.urgent ? 'ring-2 ring-blue-200 shadow-lg' : ''
                  }`}
                  onClick={() => {
                    setSelectedAction(action)
                    setShowActionDialog(true)
                  }}
                  disabled={!!actionLoading}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className={`p-2 rounded ${
                      action.type === 'primary' ? 'bg-blue-100 text-blue-600' :
                      action.type === 'danger' ? 'bg-red-100 text-red-600' :
                      action.type === 'success' ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {getActionIcon(action.icon)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm flex items-center gap-2">
                        {action.label}
                        {action.urgent && (
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Navigation removed per requirements */}

        {/* Action Confirmation Dialog */}
        <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedAction && getActionIcon(selectedAction.icon)}
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
                      ⚠️ This action cannot be undone. Please confirm you want to proceed.
                    </p>
                  </div>
                )}

                {/* Feedback fields for add_feedback action */}
                {selectedAction.action === 'add_feedback' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your Rating (optional)</label>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(n => (
                          <button
                            key={n}
                            type="button"
                            className={`h-8 w-8 rounded-full border ${feedbackRating && feedbackRating >= n ? 'bg-yellow-400 border-yellow-500' : 'bg-white hover:bg-gray-50'}`}
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
                  <Button
                    variant="outline"
                    onClick={() => setShowActionDialog(false)}
                  >
                    Cancel
                  </Button>
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
                      setShowActionDialog(false)
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
                    {actionLoading === selectedAction.id ? 'Processing...' : 'Confirm'}
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
  status: string
  progress_percentage?: number
}


// Enhanced Compact status for table cells with milestone-based progress
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
  const [status, setStatus] = useState<string>('pending')
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)

  // Simple in-memory cache and dedupe per bookingId
  type Cached = { json: any; ts: number }
  const cache = (CompactBookingStatus as any)._cache || ((CompactBookingStatus as any)._cache = new Map<string, Cached>())
  const inflight = (CompactBookingStatus as any)._inflight || ((CompactBookingStatus as any)._inflight = new Map<string, Promise<any>>())
  const maxConcurrent = 4
  const counters = (CompactBookingStatus as any)._counter || ((CompactBookingStatus as any)._counter = { active: 0 })
  const STALE_MS = 5_000

  const loadStatusAndProgress = async () => {
    try {
      setLoading(true)

      // Cached?
      const cached = cache.get(bookingId) as Cached | undefined
      if (cached && Date.now() - cached.ts < STALE_MS) {
        applyBooking(cached.json)
        setLoading(false)
        return
      }

      // Concurrency gating
      while (counters.active >= maxConcurrent) {
        await new Promise(r => setTimeout(r, 50))
      }

      // Dedupe identical requests
      if (inflight.has(bookingId)) {
        const json = await inflight.get(bookingId)!
        applyBooking(json)
        setLoading(false)
        return
      }

      const fetchOnce = async () => {
        abortRef.current?.abort()
        const ctrl = new AbortController()
        abortRef.current = ctrl
        const res = await fetch(`/api/bookings/${bookingId}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          cache: 'no-store'
        })
        return res
      }

      // Backoff on 429
      let attempt = 0
      const maxRetries = 3
      const base = 300
      const cap = 2000

      counters.active++
      let res: Response
      try {
        while (true) {
          res = await fetchOnce()
          if (res.status !== 429) break
          const ra = res.headers.get('retry-after')
          const delay = ra ? Number(ra) * 1000 : Math.min(cap, base * 2 ** attempt)
          await new Promise(r => setTimeout(r, Math.floor(Math.random() * Math.max(200, delay))))
          if (attempt++ >= maxRetries) break
        }
      } finally {
        counters.active = Math.max(0, counters.active - 1)
      }

      if (!res!.ok) {
        console.error('Error fetching booking:', res!.status)
        // Don't set to unknown, try to use a fallback status
        setStatus('pending')
        setProgress(0)
        return
      }

      const p = res!.json()
      inflight.set(bookingId, p)
      const json = await p.finally(() => inflight.delete(bookingId))
      cache.set(bookingId, { json, ts: Date.now() })

      const { booking } = json

      if (!booking) {
        console.error('Booking not found')
        setStatus('pending')
        setProgress(0)
        return
      }

      // Debug logging to see what data we're receiving
      console.log('Smart Status Component - Booking Data:', {
        bookingId: booking.id,
        status: booking.status,
        approval_status: booking.approval_status,
        ui_approval_status: booking.ui_approval_status
      })

      // Use the applyBooking function which has the correct approval status logic
      await applyBooking(json)
      } catch (e) {
        console.error('Failed to load booking progress:', e)
        setStatus('pending')
        setProgress(0)
        setError('Failed to load status')
      } finally {
        setLoading(false)
      }
    }

    const applyBooking = async (json: any) => {
      const booking = json?.bookings?.[0]
      if (!booking) {
        setStatus('pending')
        setProgress(0)
        return
      }

      // Load actual milestones for this booking
      try {
        const milestonesRes = await fetch(`/api/milestones?bookingId=${bookingId}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        })
        
        if (milestonesRes.ok) {
          const milestonesData = await milestonesRes.json()
          const data: Milestone[] = milestonesData.milestones || []
          setMilestones(data)
          
          if (data.length === 0) {
            // No milestones - use simple progress based on status
            const defaultProgress =
              booking.status === 'completed' ? 100 :
              booking.status === 'in_progress' ? 50 :
              booking.status === 'approved' || booking.status === 'confirmed' || ((booking.approval_status === 'approved' || booking.ui_approval_status === 'approved') && booking.status === 'pending') ? 10 : 0
            setProgress(defaultProgress)
          } else {
            // Calculate progress based on completed and in-progress milestones
            const completed = data.filter(m => m.status === 'completed').length
            const inProgress = data.filter(m => m.status === 'in_progress').length
            const total = data.length
            
            // Progress calculation: completed milestones + 50% of in-progress milestones
            const milestoneProgress = total > 0 ? Math.round(((completed + (inProgress * 0.5)) / total) * 100) : 0
            
            // Use milestone progress, not weighted progress
            setProgress(Number.isFinite(milestoneProgress) ? milestoneProgress : 0)
          }
          
          const completed = data.filter(m => m.status === 'completed').length
          const inProgress = data.filter(m => m.status === 'in_progress').length
          
          // Canonical status ladder: Pending Review → Approved → Ready to Launch → In Production → Delivered
          let derivedStatus: string
          
          // Auto-advance: If all milestones are completed, auto-advance to delivered
          if (data.length > 0 && completed === data.length && data.length > 0) {
            derivedStatus = 'delivered'
          }
          // If completed, always show as delivered
          else if (booking.status === 'completed') {
            derivedStatus = 'delivered'
          }
          // If in progress, show as in production
          else if (booking.status === 'in_progress') {
            derivedStatus = 'in_production'
          }
          // If approved but still pending, show as ready to launch
          else if ((booking.approval_status === 'approved' || booking.ui_approval_status === 'approved') && booking.status === 'pending') {
            derivedStatus = 'ready_to_launch'
          }
          // If approved, show as approved
          else if (booking.status === 'approved') {
            derivedStatus = 'approved'
          }
          // If pending without approval, show as pending review
          else if (booking.status === 'pending') {
            derivedStatus = 'pending_review'
          }
          // Default fallback
          else {
            derivedStatus = booking.status || 'pending_review'
          }
          
          // Debug logging to identify status derivation issues
          console.log('Smart Status Debug:', {
            bookingId: booking.id,
            bookingStatus: booking.status,
            approvalStatus: booking.approval_status,
            uiApprovalStatus: booking.ui_approval_status,
            derivedStatus,
            milestones: data.length,
            completed,
            inProgress,
            isInProgress: booking.status === 'in_progress',
            isApproved: booking.status === 'approved',
            isApprovedPending: (booking.approval_status === 'approved' || booking.ui_approval_status === 'approved') && booking.status === 'pending'
          })
          
          // Handle case where status might be undefined or null
          if (!derivedStatus || derivedStatus === 'unknown') {
            derivedStatus = 'pending_review'
          }
          
          setStatus(derivedStatus)
        } else {
          // Fallback to default progress if milestones API fails
          const defaultProgress =
            booking.status === 'completed' ? 100 :
            booking.status === 'in_progress' ? 50 :
            booking.status === 'approved' || booking.status === 'confirmed' || ((booking.approval_status === 'approved' || booking.ui_approval_status === 'approved') && booking.status === 'pending') ? 10 : 0
          setProgress(defaultProgress)
          setMilestones([])
          // Handle case where booking.status might be undefined or null
          let fallbackStatus = booking.status || 'pending'
          if ((booking.approval_status === 'approved' || booking.ui_approval_status === 'approved') && booking.status === 'pending') {
            fallbackStatus = 'ready_to_launch'
          }
          setStatus(fallbackStatus)
        }
      } catch (error) {
        console.error('Error loading milestones:', error)
        setError('Failed to load milestones')
        // Fallback to default progress
        const defaultProgress =
          booking.status === 'completed' ? 100 :
          booking.status === 'in_progress' ? 50 :
          booking.status === 'approved' || booking.status === 'confirmed' || ((booking.approval_status === 'approved' || booking.ui_approval_status === 'approved') && booking.status === 'pending') ? 10 : 0
        setProgress(defaultProgress)
        setMilestones([])
        // Handle case where booking.status might be undefined or null
        let fallbackStatus = booking.status || 'pending'
        if ((booking.approval_status === 'approved' || booking.ui_approval_status === 'approved') && booking.status === 'pending') {
          fallbackStatus = 'ready_to_launch'
        }
        setStatus(fallbackStatus)
      }
      
      onStatusChangeAction?.()
    }

  useEffect(() => {
    loadStatusAndProgress()

    return () => {
      abortRef.current?.abort()
    }
  }, [bookingId, userRole])

  if (loading) {
    return (
      <div className="space-y-1">
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
          onClick={() => {
            setError(null)
            setLoading(true)
            loadStatusAndProgress()
          }}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3" />
      case 'approved': return <CheckCircle className="h-3 w-3" />
      case 'in_progress': return <Play className="h-3 w-3" />
      case 'completed': return <Award className="h-3 w-3" />
      case 'cancelled': return <XCircle className="h-3 w-3" />
      case 'on_hold': return <Pause className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
    }
  }

  // Generate comprehensive tooltip content
  const getTooltipContent = () => {
    if (milestones.length === 0) {
      return 'No milestones created yet'
    }

    const completed = milestones.filter(m => m.status === 'completed')
    const inProgress = milestones.filter(m => m.status === 'in_progress')
    const pending = milestones.filter(m => m.status === 'pending')

    const lines = []
    lines.push(`${completed.length}/${milestones.length} milestones completed (${clampPct(progress)}%)`)
    
    if (completed.length > 0) {
      const completedTitles = completed.slice(0, 3).map(m => m.title).join(', ')
      lines.push(`✅ Completed: ${completedTitles}${completed.length > 3 ? ` (+${completed.length - 3} more)` : ''}`)
    }
    
    if (inProgress.length > 0) {
      const inProgressTitles = inProgress.slice(0, 2).map(m => m.title).join(', ')
      lines.push(`🔄 In Progress: ${inProgressTitles}${inProgress.length > 2 ? ` (+${inProgress.length - 2} more)` : ''}`)
    }
    
    if (pending.length > 0) {
      const pendingTitles = pending.slice(0, 2).map(m => m.title).join(', ')
      lines.push(`⏳ Pending: ${pendingTitles}${pending.length > 2 ? ` (+${pending.length - 2} more)` : ''}`)
    }

    return lines.join('\n')
  }

  // Use the global statusStyles
  const getStatusConfig = (status: string) => {
    return statusStyles[status as keyof typeof statusStyles] || statusStyles.unknown
  }

  const statusConfig = getStatusConfig(status)
  const isHighPriority = statusConfig.priority === 'high'
  const isCompleted = status === 'delivered' || status === 'completed'
  const isInProgress = status === 'in_production' || status === 'in_progress'
  const hasMilestones = milestones.length > 0

  return (
    <Tooltip content={<div className="max-w-xs whitespace-pre-line">{getTooltipContent()}</div>}>
      <div className="space-y-2 cursor-pointer group">
        {/* Enhanced Status Badge */}
        <div className={`relative ${isHighPriority ? 'animate-pulse' : ''}`}>
          <Badge
            variant="outline"
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200 group-hover:scale-105 ${statusConfig.className} ${statusConfig.glow}`}
          >
            {statusConfig.icon}
            <span className="capitalize tracking-wide">{statusConfig.label}</span>
            {isHighPriority && (
              <div className="w-2 h-2 bg-current rounded-full animate-ping opacity-75"></div>
            )}
          </Badge>
          
          {/* Status Indicator Line */}
          <div className={`absolute -bottom-1 left-0 right-0 h-0.5 rounded-full ${
            status === 'delivered' ? 'bg-gradient-to-r from-emerald-400 to-green-400' :
            status === 'in_production' ? 'bg-gradient-to-r from-orange-400 to-red-400' :
            status === 'ready_to_launch' ? 'bg-gradient-to-r from-blue-400 to-cyan-400' :
            status === 'approved' ? 'bg-gradient-to-r from-purple-400 to-violet-400' :
            'bg-gradient-to-r from-amber-400 to-yellow-400'
          }`}></div>
        </div>

        {/* Enhanced Progress Section */}
        {hasMilestones && (
          <div className="space-y-2">
            {/* Progress Bar with Enhanced Styling */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Progress 
                  value={clampPct(progress)} 
                  className={`h-2.5 rounded-full ${
                    status === 'delivered' || progress === 100 ? '[&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-green-500' :
                    status === 'in_production' || progress >= 75 ? '[&>div]:bg-gradient-to-r [&>div]:from-orange-500 [&>div]:to-red-500' :
                    status === 'ready_to_launch' || progress >= 50 ? '[&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-cyan-500' :
                    status === 'approved' || progress >= 25 ? '[&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-violet-500' :
                    '[&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-yellow-500'
                  }`}
                />
                {/* Progress Glow Effect */}
                <div className={`absolute inset-0 rounded-full blur-sm opacity-30 ${
                  progress === 100 ? 'bg-emerald-400' :
                  progress >= 75 ? 'bg-blue-400' :
                  progress >= 50 ? 'bg-yellow-400' :
                  progress >= 25 ? 'bg-orange-400' :
                  'bg-gray-400'
                }`}></div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-gray-800">{clampPct(progress)}%</span>
                {progress === 100 && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                {isInProgress && <Flame className="h-4 w-4 text-blue-600 animate-pulse" />}
              </div>
            </div>

            {/* Enhanced Milestone Summary */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {milestones.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-600 font-medium">
                      {milestones.filter(m => m.status === 'completed').length}/{milestones.length}
                    </span>
                    <span className="text-gray-500">milestones</span>
                    {milestones.filter(m => m.status === 'in_progress').length > 0 && (
                      <span className="text-blue-600 text-xs">
                        • {milestones.filter(m => m.status === 'in_progress').length} active
                      </span>
                    )}
                  </div>
                )}
                
                {milestones.length > 0 && milestones.some(m => m.status === 'in_progress') && (
                  <div className="flex items-center gap-1 text-blue-600">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="font-medium">
                      {milestones.filter(m => m.status === 'in_progress').length} active
                    </span>
                  </div>
                )}
              </div>
              
              {/* Performance Indicator */}
              {progress > 0 && (
                <div className="flex items-center gap-1">
                  {progress === 100 ? (
                    <Star className="h-3 w-3 text-yellow-500" />
                  ) : progress >= 75 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <Timer className="h-3 w-3 text-amber-500" />
                  )}
                </div>
              )}
            </div>

            {/* Current Activity Status */}
            {milestones.some(m => m.status === 'in_progress') && (
              <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Active development in progress</span>
                <Sparkles className="h-3 w-3 text-blue-500" />
              </div>
            )}

            {/* Completion Celebration */}
            {isCompleted && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                <Award className="h-3 w-3 text-emerald-600" />
                <span className="font-medium">Project successfully delivered</span>
                <Crown className="h-3 w-3 text-yellow-500" />
              </div>
            )}
          </div>
        )}

        {/* No Milestones State */}
        {!hasMilestones && (
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
    </Tooltip>
  )
}
