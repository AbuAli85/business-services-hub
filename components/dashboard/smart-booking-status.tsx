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
  TrendingUp,
  Award,
  MessageSquare,
  Receipt,
  Settings,
  Shield,
  XCircle,
  ThumbsUp,
  Eye,
  Calendar,
  Users,
  BarChart3,
  Zap,
  Bell,
  ExternalLink
} from 'lucide-react'
import { SmartBookingStatus, ContextualAction, Risk, smartBookingStatusService } from '@/lib/smart-booking-status'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface SmartBookingStatusProps {
  bookingId: string
  userRole: 'client' | 'provider' | 'admin'
  compact?: boolean
  onStatusChange?: () => void
}

export function SmartBookingStatusComponent({
  bookingId,
  userRole,
  compact = false,
  onStatusChange
}: SmartBookingStatusProps) {
  const router = useRouter()
  const [status, setStatus] = useState<SmartBookingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [selectedAction, setSelectedAction] = useState<ContextualAction | null>(null)

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
        onStatusChange?.()
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
            <div className={`p-2 rounded-lg ${getStatusColor(status.overall_status).replace('text-', 'bg-').replace('-800', '-600')}`}>
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

        {/* Risks */}
        {status.risks.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Risks & Alerts
            </h4>
            <div className="space-y-2">
              {status.risks.map(risk => (
                <div key={risk.id} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-orange-900">{risk.description}</span>
                      <Badge className={getRiskColor(risk.severity)} variant="outline">
                        {risk.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-orange-800">{risk.impact}</p>
                    {risk.mitigation && (
                      <p className="text-xs text-orange-700 mt-1">
                        <strong>Mitigation:</strong> {risk.mitigation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contextual Actions */}
        {status.contextual_actions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              Available Actions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {status.contextual_actions.map(action => (
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

        {/* Quick Navigation */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/bookings/${bookingId}`)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/bookings/${bookingId}/milestones`)}
            >
              <Target className="h-4 w-4 mr-2" />
              Manage Milestones
            </Button>
            {userRole === 'provider' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/provider/invoices`)}
              >
                <Receipt className="h-4 w-4 mr-2" />
                Invoices
              </Button>
            )}
            {userRole === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/admin/services`)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Admin Tools
              </Button>
            )}
          </div>
        </div>

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
                    onClick={() => executeAction(selectedAction)}
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

// Compact status for table cells
export function CompactBookingStatus({
  bookingId,
  userRole,
  onStatusChange
}: {
  bookingId: string
  userRole: 'client' | 'provider' | 'admin'
  onStatusChange?: () => void
}) {
  return (
    <SmartBookingStatusComponent
      bookingId={bookingId}
      userRole={userRole}
      compact={true}
      onStatusChange={onStatusChange}
    />
  )
}
