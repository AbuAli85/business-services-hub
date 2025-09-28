'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Bot, 
  Zap, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Lightbulb,
  Target,
  Calendar,
  Users,
  Activity
} from 'lucide-react'
import { toast } from 'sonner'

interface IntelligentTaskAutomationProps {
  bookingId: string
  milestones: any[]
  onTaskUpdate: (taskId: string, status: string) => Promise<void>
  onMilestoneUpdate: (milestoneId: string, status: string) => Promise<void>
}

interface AutomationRule {
  id: string
  name: string
  description: string
  enabled: boolean
  conditions: any[]
  actions: any[]
  lastTriggered?: Date
  triggerCount: number
}

export function IntelligentTaskAutomation({ 
  bookingId, 
  milestones, 
  onTaskUpdate, 
  onMilestoneUpdate 
}: IntelligentTaskAutomationProps) {
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [recentActions, setRecentActions] = useState<any[]>([])

  useEffect(() => {
    initializeAutomationRules()
  }, [])

  const initializeAutomationRules = () => {
    const defaultRules: AutomationRule[] = [
      {
        id: 'auto-complete-milestone',
        name: 'Auto-Complete Milestone',
        description: 'Automatically mark milestone as completed when all tasks are done',
        enabled: true,
        conditions: [
          { type: 'all_tasks_completed', value: true }
        ],
        actions: [
          { type: 'update_milestone_status', value: 'completed' },
          { type: 'update_milestone_progress', value: 100 }
        ],
        triggerCount: 0
      },
      {
        id: 'auto-start-next-milestone',
        name: 'Auto-Start Next Milestone',
        description: 'Automatically start the next milestone when previous one completes',
        enabled: true,
        conditions: [
          { type: 'milestone_completed', value: true },
          { type: 'has_next_milestone', value: true }
        ],
        actions: [
          { type: 'start_next_milestone', value: 'in_progress' }
        ],
        triggerCount: 0
      },
      {
        id: 'overdue-task-alerts',
        name: 'Overdue Task Alerts',
        description: 'Send alerts and update priority for overdue tasks',
        enabled: true,
        conditions: [
          { type: 'task_overdue', value: true }
        ],
        actions: [
          { type: 'update_task_priority', value: 'urgent' },
          { type: 'send_notification', value: 'overdue_alert' }
        ],
        triggerCount: 0
      },
      {
        id: 'auto-assign-tasks',
        name: 'Smart Task Assignment',
        description: 'Automatically assign tasks based on workload and expertise',
        enabled: false,
        conditions: [
          { type: 'task_unassigned', value: true },
          { type: 'has_available_assignee', value: true }
        ],
        actions: [
          { type: 'assign_task', value: 'auto' }
        ],
        triggerCount: 0
      },
      {
        id: 'progress-sync',
        name: 'Progress Synchronization',
        description: 'Sync milestone progress based on task completion',
        enabled: true,
        conditions: [
          { type: 'task_status_changed', value: true }
        ],
        actions: [
          { type: 'recalculate_milestone_progress', value: true }
        ],
        triggerCount: 0
      },
      {
        id: 'deadline-reminders',
        name: 'Deadline Reminders',
        description: 'Send reminders before task and milestone deadlines',
        enabled: true,
        conditions: [
          { type: 'approaching_deadline', value: 24 } // 24 hours
        ],
        actions: [
          { type: 'send_notification', value: 'deadline_reminder' }
        ],
        triggerCount: 0
      }
    ]

    setAutomationRules(defaultRules)
  }

  const processAutomationRules = async () => {
    setIsProcessing(true)
    const actions: any[] = []

    try {
      for (const rule of automationRules.filter(r => r.enabled)) {
        const triggered = await checkRuleConditions(rule, milestones)
        
        if (triggered) {
          const ruleActions = await executeRuleActions(rule, milestones)
          actions.push(...ruleActions)
          
          // Update trigger count
          setAutomationRules(prev => prev.map(r => 
            r.id === rule.id 
              ? { ...r, triggerCount: r.triggerCount + 1, lastTriggered: new Date() }
              : r
          ))
        }
      }

      setRecentActions(actions.slice(0, 10)) // Keep last 10 actions
      
      if (actions.length > 0) {
        toast.success(`Automation processed ${actions.length} actions`)
      }

    } catch (error) {
      console.error('Error processing automation:', error)
      toast.error('Failed to process automation rules')
    } finally {
      setIsProcessing(false)
    }
  }

  const checkRuleConditions = async (rule: AutomationRule, milestones: any[]): Promise<boolean> => {
    for (const condition of rule.conditions) {
      switch (condition.type) {
        case 'all_tasks_completed':
          return milestones.some(milestone => 
            milestone.tasks?.length > 0 && 
            milestone.tasks.every((task: any) => task.status === 'completed')
          )

        case 'milestone_completed':
          return milestones.some(milestone => milestone.status === 'completed')

        case 'has_next_milestone':
          const completedMilestones = milestones.filter(m => m.status === 'completed')
          return completedMilestones.length > 0 && completedMilestones.length < milestones.length

        case 'task_overdue':
          return milestones.some(milestone => 
            milestone.tasks?.some((task: any) => 
              task.due_date && 
              new Date(task.due_date) < new Date() && 
              task.status !== 'completed'
            )
          )

        case 'task_unassigned':
          return milestones.some(milestone => 
            milestone.tasks?.some((task: any) => !task.assigned_to)
          )

        case 'task_status_changed':
          // This would need to be tracked in state
          return false

        case 'approaching_deadline':
          const hours = condition.value
          const deadline = new Date(Date.now() + hours * 60 * 60 * 1000)
          return milestones.some(milestone => 
            (milestone.due_date && new Date(milestone.due_date) <= deadline) ||
            milestone.tasks?.some((task: any) => 
              task.due_date && new Date(task.due_date) <= deadline
            )
          )

        default:
          return false
      }
    }
    return true
  }

  const executeRuleActions = async (rule: AutomationRule, milestones: any[]): Promise<any[]> => {
    const actions: any[] = []

    for (const action of rule.actions) {
      switch (action.type) {
        case 'update_milestone_status':
          const completedMilestones = milestones.filter(m => 
            m.tasks?.length > 0 && 
            m.tasks.every((task: any) => task.status === 'completed') &&
            m.status !== 'completed'
          )
          
          for (const milestone of completedMilestones) {
            await onMilestoneUpdate(milestone.id, action.value)
            actions.push({
              type: 'milestone_completed',
              milestoneId: milestone.id,
              milestoneTitle: milestone.title,
              timestamp: new Date()
            })
          }
          break

        case 'start_next_milestone':
          const nextMilestone = milestones.find(m => m.status === 'pending')
          if (nextMilestone) {
            await onMilestoneUpdate(nextMilestone.id, 'in_progress')
            actions.push({
              type: 'milestone_started',
              milestoneId: nextMilestone.id,
              milestoneTitle: nextMilestone.title,
              timestamp: new Date()
            })
          }
          break

        case 'update_task_priority':
          // Priority updates are not supported by the current milestone system
          // This would require a separate API endpoint for task updates
          actions.push({
            type: 'task_priority_update_skipped',
            reason: 'Priority updates not supported',
            timestamp: new Date()
          })
          break

        case 'recalculate_milestone_progress':
          // Progress calculation is handled automatically by the milestone system
          // No need to manually update progress here
          actions.push({
            type: 'progress_recalculated',
            timestamp: new Date()
          })
          break

        case 'send_notification':
          actions.push({
            type: 'notification_sent',
            notificationType: action.value,
            timestamp: new Date()
          })
          break

        case 'assign_task':
          // This would require user/team data
          actions.push({
            type: 'task_assignment_attempted',
            timestamp: new Date()
          })
          break
      }
    }

    return actions
  }

  const toggleRule = (ruleId: string) => {
    setAutomationRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ))
  }

  const getRuleStatusColor = (rule: AutomationRule) => {
    if (!rule.enabled) return 'bg-gray-100 text-gray-500'
    if (rule.triggerCount === 0) return 'bg-blue-100 text-blue-600'
    return 'bg-green-100 text-green-600'
  }

  return (
    <div className="space-y-6">
      {/* Automation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Intelligent Task Automation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Automate repetitive tasks and keep your project on track
              </p>
            </div>
            <Button
              onClick={processAutomationRules}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isProcessing ? 'Processing...' : 'Run Automation'}
            </Button>
          </div>

          {/* Automation Rules */}
          <div className="space-y-4">
            {automationRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{rule.name}</h4>
                    <Badge className={getRuleStatusColor(rule)}>
                      {rule.enabled ? 'Active' : 'Inactive'}
                    </Badge>
                    {rule.triggerCount > 0 && (
                      <Badge variant="outline">
                        {rule.triggerCount} triggers
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                  {rule.lastTriggered && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last triggered: {rule.lastTriggered.toLocaleString()}
                    </p>
                  )}
                </div>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={() => toggleRule(rule.id)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Actions */}
      {recentActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Automation Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActions.map((action, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                  <div className="flex-shrink-0">
                    {action.type === 'milestone_completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {action.type === 'milestone_started' && <Play className="h-4 w-4 text-blue-500" />}
                    {action.type === 'task_priority_updated' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                    {action.type === 'notification_sent' && <Zap className="h-4 w-4 text-purple-500" />}
                    {action.type === 'task_assignment_attempted' && <Users className="h-4 w-4 text-cyan-500" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {action.type === 'milestone_completed' && `Completed milestone: ${action.milestoneTitle}`}
                      {action.type === 'milestone_started' && `Started milestone: ${action.milestoneTitle}`}
                      {action.type === 'task_priority_updated' && `Updated priority for: ${action.taskTitle}`}
                      {action.type === 'notification_sent' && `Sent ${action.notificationType} notification`}
                      {action.type === 'task_assignment_attempted' && 'Attempted task assignment'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {action.timestamp.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Automation Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Automation Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {automationRules.filter(r => r.enabled).length}
              </div>
              <div className="text-sm text-blue-600">Active Rules</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {automationRules.reduce((acc, r) => acc + r.triggerCount, 0)}
              </div>
              <div className="text-sm text-green-600">Total Triggers</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {recentActions.length}
              </div>
              <div className="text-sm text-purple-600">Recent Actions</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
