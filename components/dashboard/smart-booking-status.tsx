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
  XCircle,
  ThumbsUp,
  Calendar,
  BarChart3,
  Zap,
  Bell
} from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { getSupabaseClient } from '@/lib/supabase'
import { SmartBookingStatus, ContextualAction, smartBookingStatusService } from '@/lib/smart-booking-status'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

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
            <div className={`p-2 rounded-lg ${statusStyles[status.overall_status]?.tone ?? statusStyles.default.tone}`}>
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

// Structured styles for statuses
const statusStyles: Record<string, { badge: string; tone: string }> = {
  pending:   { badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', tone: 'bg-yellow-100 text-yellow-600' },
  approved:  { badge: 'bg-blue-100 text-blue-800 border-blue-200',      tone: 'bg-blue-100 text-blue-600' },
  in_progress:{ badge:'bg-purple-100 text-purple-800 border-purple-200', tone: 'bg-purple-100 text-purple-600' },
  completed: { badge: 'bg-green-100 text-green-800 border-green-200',   tone: 'bg-green-100 text-green-600' },
  cancelled: { badge: 'bg-red-100 text-red-800 border-red-200',         tone: 'bg-red-100 text-red-600' },
  on_hold:   { badge: 'bg-gray-100 text-gray-800 border-gray-200',      tone: 'bg-gray-100 text-gray-600' },
  default:   { badge: 'bg-gray-100 text-gray-800 border-gray-200',      tone: 'bg-gray-100 text-gray-600' }
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
  const abortRef = React.useRef<AbortController | null>(null)

  // Simple in-memory cache and dedupe per bookingId
  const cache = (CompactBookingStatus as any)._cache || ((CompactBookingStatus as any)._cache = new Map<string, any>())
  const inflight = (CompactBookingStatus as any)._inflight || ((CompactBookingStatus as any)._inflight = new Map<string, Promise<any>>())
  const maxConcurrent = 4
  const counters = (CompactBookingStatus as any)._counter || ((CompactBookingStatus as any)._counter = { active: 0 })

  useEffect(() => {
  const loadStatusAndProgress = async () => {
    try {
      setLoading(true)

      // Cached?
      const cached = cache.get(bookingId)
      if (cached) {
        applyBooking(cached)
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
        const res = await fetch(`/api/bookings?bookingId=${bookingId}`, {
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
        setStatus('unknown')
        setProgress(0)
        return
      }

      const p = res!.json()
      inflight.set(bookingId, p)
      const json = await p.finally(() => inflight.delete(bookingId))
      cache.set(bookingId, json)

      const { bookings } = json
      const booking = bookings?.[0]

      if (!booking) {
        console.error('Booking not found')
        setStatus('unknown')
        setProgress(0)
        return
      }

      // For now, skip milestones API call and use booking status directly
      // TODO: Create milestones API endpoint if needed
      const data: Milestone[] = []
      setMilestones(data)

      // Calculate weighted progress based on milestone completion and individual progress
      if (data.length === 0) {
        // No milestones yet: derive a sensible default progress from booking status
        const defaultProgress =
          booking.status === 'completed' ? 100 :
          booking.status === 'in_progress' ? 50 :
          booking.status === 'approved' || booking.status === 'confirmed' ? 10 : 0
        setProgress(defaultProgress)
      } else {
        let totalProgress = 0
        data.forEach(milestone => {
          if (milestone.status === 'completed') {
            totalProgress += 100
          } else if (milestone.status === 'in_progress') {
            totalProgress += (milestone.progress_percentage || 0)
          }
          // Pending milestones contribute 0
        })

        const calculatedProgress = Math.round(totalProgress / data.length)
        setProgress(Number.isFinite(calculatedProgress) ? calculatedProgress : 0)
      }

        // Derive intelligent booking status from milestones
        const completed = data.filter(m => m.status === 'completed').length
        const inProgress = data.filter(m => m.status === 'in_progress').length
        
        let derivedStatus = booking.status
        if (booking.status === 'approved' || booking.status === 'confirmed') {
          if (completed === data.length) {
            derivedStatus = 'completed'
          } else if (completed > 0 || inProgress > 0) {
            derivedStatus = 'in_progress'
          }
        }

        setStatus(derivedStatus)
        onStatusChangeAction?.()
      } catch (e) {
        console.error('Failed to load booking progress:', e)
        setStatus('unknown')
        setProgress(0)
      } finally {
        setLoading(false)
      }
    }

    const applyBooking = (json: any) => {
      const booking = json?.bookings?.[0]
      if (!booking) {
        setStatus('unknown')
        setProgress(0)
        return
      }
      const data: Milestone[] = []
      setMilestones(data)
      if (data.length === 0) {
        const defaultProgress =
          booking.status === 'completed' ? 100 :
          booking.status === 'in_progress' ? 50 :
          booking.status === 'approved' || booking.status === 'confirmed' ? 10 : 0
        setProgress(defaultProgress)
      } else {
        let totalProgress = 0
        data.forEach(milestone => {
          if (milestone.status === 'completed') totalProgress += 100
          else if (milestone.status === 'in_progress') totalProgress += (milestone.progress_percentage || 0)
        })
        const calculated = Math.round(totalProgress / data.length)
        setProgress(Number.isFinite(calculated) ? calculated : 0)
      }
      const completed = data.filter(m => m.status === 'completed').length
      const inProgress = data.filter(m => m.status === 'in_progress').length
      let derivedStatus = booking.status
      if (booking.status === 'approved' || booking.status === 'confirmed') {
        if (completed === data.length) derivedStatus = 'completed'
        else if (completed > 0 || inProgress > 0) derivedStatus = 'in_progress'
      }
      setStatus(derivedStatus)
      onStatusChangeAction?.()
    }

    loadStatusAndProgress()

    return () => {
      abortRef.current?.abort()
    }
  }, [bookingId])

  if (loading) {
    return (
      <div className="space-y-1">
        <div className="animate-pulse bg-gray-200 h-5 w-20 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-2 w-16 rounded"></div>
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
    lines.push(`${completed.length}/${milestones.length} milestones completed (${progress}%)`)
    
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

  return (
    <Tooltip content={<div className="max-w-xs whitespace-pre-line">{getTooltipContent()}</div>}>
      <div className="space-y-1 cursor-pointer">
            {/* Status Badge */}
            <Badge
              variant="outline"
              className={`flex items-center gap-1 text-xs ${
                status === 'completed'
                  ? 'text-green-600 border-green-200 bg-green-50'
                  : status === 'in_progress'
                  ? 'text-blue-600 border-blue-200 bg-blue-50'
                  : status === 'approved'
                  ? 'text-purple-600 border-purple-200 bg-purple-50'
                  : 'text-gray-600 border-gray-200 bg-gray-50'
              }`}
            >
              {getStatusIcon(status)}
              <span className="capitalize">{status.replace('_', ' ')}</span>
            </Badge>
            {/* Progress Bar and Details */}
            {milestones.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Progress 
                    value={progress} 
                    className={`h-2 w-20 ${
                      progress === 100 ? '[&>div]:bg-green-500' :
                      progress >= 75 ? '[&>div]:bg-blue-500' :
                      progress >= 50 ? '[&>div]:bg-yellow-500' :
                      progress >= 25 ? '[&>div]:bg-orange-500' :
                      '[&>div]:bg-gray-400'
                    }`}
                  />
                  <span className="text-xs font-medium text-gray-700">{progress}%</span>
                </div>
                {/* Milestone Summary */}
                <div className="text-xs text-gray-500">
                  {milestones.filter(m => m.status === 'completed').length}/{milestones.length} milestones
                  {milestones.some(m => m.status === 'in_progress') && (
                    <span className="text-purple-600 ml-1">
                      • {milestones.filter(m => m.status === 'in_progress').length} active
                    </span>
                  )}
                </div>
                {/* Current Activity Indicator */}
                {milestones.some(m => m.status === 'in_progress') && (
                  <div className="text-xs text-purple-600 flex items-center gap-1">
                    <div className="w-1 h-1 bg-purple-600 rounded-full animate-pulse"></div>
                    <span className="truncate max-w-32">
                      {milestones.find(m => m.status === 'in_progress')?.title}
                    </span>
                  </div>
                )}
              </div>
            )}
      </div>
    </Tooltip>
  )
}
