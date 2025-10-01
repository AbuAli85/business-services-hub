import { getSupabaseClient } from '@/lib/supabase'

export interface SmartBookingStatus {
  id: string
  overall_status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold' | 'pending_review' | 'ready_to_launch' | 'in_production' | 'delivered'
  current_phase: string | null
  current_milestone: string | null
  progress_percentage: number
  next_action: string | null
  next_action_by: 'client' | 'provider' | 'admin' | null
  estimated_completion: string | null
  milestones_completed: number
  milestones_total: number
  tasks_completed: number
  tasks_total: number
  last_activity: string | null
  last_activity_by: string | null
  status_description: string
  contextual_actions: ContextualAction[]
  risks: Risk[]
  notifications: StatusNotification[]
}

export interface ContextualAction {
  id: string
  label: string
  description: string
  type: 'primary' | 'secondary' | 'danger' | 'success'
  icon: string
  action: string
  params?: Record<string, any>
  permissions: string[]
  urgent?: boolean
}

export interface Risk {
  id: string
  type: 'deadline' | 'dependency' | 'resource' | 'quality'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact: string
  mitigation?: string
}

export interface StatusNotification {
  id: string
  type: 'info' | 'warning' | 'success' | 'error'
  title: string
  message: string
  timestamp: string
  read: boolean
}

export class SmartBookingStatusService {
  private supabase: any

  constructor() {
    this.init()
  }

  private async init() {
    this.supabase = await getSupabaseClient()
  }

  async getSmartStatus(bookingId: string, userRole: string): Promise<SmartBookingStatus> {
    const supabase = await getSupabaseClient()
    
    // Load booking with all related data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        approval_status,
        ui_approval_status,
        title,
        created_at,
        updated_at,
        scheduled_date,
        amount,
        currency,
        client_id,
        provider_id,
        services(id, title, estimated_duration)
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError) {
      throw new Error(`Failed to load booking: ${bookingError.message}`)
    }

    // Load milestones with tasks
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestones')
      .select(`
        id,
        title,
        status,
        progress_percentage,
        order_index,
        created_at,
        updated_at,
        due_date,
        phase_id,
        critical_path,
        risk_level,
        tasks(
          id,
          title,
          status,
          progress_percentage,
          created_at,
          updated_at,
          assigned_to,
          priority
        )
      `)
      .eq('booking_id', bookingId)
      .order('order_index', { ascending: true })

    // Load phases if they exist
    const { data: phases } = await supabase
      .from('project_phases')
      .select('*')
      .eq('booking_id', bookingId)
      .order('order_index', { ascending: true })

    // Calculate smart status
    const smartStatus = this.calculateSmartStatus(
      booking,
      milestones || [],
      phases || [],
      userRole
    )

    return smartStatus
  }

  private calculateSmartStatus(
    booking: any,
    milestones: any[],
    phases: any[],
    userRole: string
  ): SmartBookingStatus {
    const totalMilestones = milestones.length
    const completedMilestones = milestones.filter(m => m.status === 'completed').length
    const inProgressMilestones = milestones.filter(m => m.status === 'in_progress').length
    
    const allTasks = milestones.flatMap(m => m.tasks || [])
    const totalTasks = allTasks.length
    const completedTasks = allTasks.filter(t => t.status === 'completed').length
    
    // Calculate overall progress
    const milestoneProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0
    const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    const overallProgress = Math.round((milestoneProgress + taskProgress) / 2)

    // Determine current phase and milestone
    const currentMilestone = milestones.find(m => m.status === 'in_progress') || 
                            milestones.find(m => m.status === 'pending')
    
    const currentPhase = phases.find(p => p.status === 'in_progress') ||
                        phases.find(p => p.status === 'pending')

    // Determine enhanced overall status based on booking + milestones
    const isApproved = booking.status === 'approved' || booking.approval_status === 'approved' || booking.ui_approval_status === 'approved'
    const allCompleted = totalMilestones > 0 && completedMilestones === totalMilestones
    let overallStatus: SmartBookingStatus['overall_status']
    if (allCompleted || booking.status === 'completed') {
      overallStatus = 'delivered'
    } else if (booking.status === 'in_progress' || inProgressMilestones > 0) {
      overallStatus = 'in_production'
    } else if (isApproved) {
      overallStatus = totalMilestones === 0 ? 'ready_to_launch' : 'approved'
    } else if (booking.status === 'pending') {
      overallStatus = 'pending_review'
    } else if (['cancelled', 'on_hold'].includes(booking.status)) {
      overallStatus = booking.status
    } else {
      // fallback to original status if none matched
      overallStatus = (booking.status as SmartBookingStatus['overall_status']) || 'pending_review'
    }

    // Generate contextual actions
    const contextualActions = this.generateContextualActions(
      booking,
      milestones,
      currentMilestone,
      overallProgress,
      userRole
    )

    // Generate risks
    const risks = this.generateRisks(booking, milestones, currentMilestone)

    // Generate status description
    const statusDescription = this.generateStatusDescription(
      overallStatus,
      currentMilestone,
      currentPhase,
      overallProgress
    )

    // Determine next action
    const nextAction = this.determineNextAction(
      booking,
      milestones,
      currentMilestone,
      userRole
    )

    // Calculate estimated completion
    const estimatedCompletion = this.calculateEstimatedCompletion(
      milestones,
      booking.scheduled_date
    )

    return {
      id: booking.id,
      overall_status: overallStatus,
      current_phase: currentPhase?.name || null,
      current_milestone: currentMilestone?.title || null,
      progress_percentage: overallProgress,
      next_action: nextAction.action,
      next_action_by: nextAction.by,
      estimated_completion: estimatedCompletion,
      milestones_completed: completedMilestones,
      milestones_total: totalMilestones,
      tasks_completed: completedTasks,
      tasks_total: totalTasks,
      last_activity: this.getLastActivity(milestones),
      last_activity_by: null, // TODO: Track activity user
      status_description: statusDescription,
      contextual_actions: contextualActions,
      risks: risks,
      notifications: [] // TODO: Generate notifications
    }
  }

  private generateContextualActions(
    booking: any,
    milestones: any[],
    currentMilestone: any,
    progress: number,
    userRole: string
  ): ContextualAction[] {
    const actions: ContextualAction[] = []

    if (userRole === 'provider') {
      // Provider actions
      if (booking.status === 'pending') {
        actions.push({
          id: 'approve_booking',
          label: 'Approve Booking',
          description: 'Approve this booking to start the project',
          type: 'primary',
          icon: 'CheckCircle',
          action: 'approve',
          permissions: ['provider'],
          urgent: true
        })
        actions.push({
          id: 'decline_booking',
          label: 'Decline Booking',
          description: 'Decline this booking request',
          type: 'danger',
          icon: 'XCircle',
          action: 'decline',
          permissions: ['provider']
        })
      }

      if (booking.status === 'approved' && milestones.length === 0) {
        actions.push({
          id: 'create_milestones',
          label: 'Create Project Plan',
          description: 'Set up milestones and tasks for this project',
          type: 'primary',
          icon: 'Target',
          action: 'create_milestones',
          permissions: ['provider'],
          urgent: true
        })
      }

      if (currentMilestone && currentMilestone.status === 'pending') {
        actions.push({
          id: 'start_milestone',
          label: `Start ${currentMilestone.title}`,
          description: 'Begin work on the current milestone',
          type: 'primary',
          icon: 'Play',
          action: 'start_milestone',
          params: { milestoneId: currentMilestone.id },
          permissions: ['provider']
        })
      }

      if (progress >= 100) {
        actions.push({
          id: 'complete_project',
          label: 'Mark Project Complete',
          description: 'Mark the entire project as completed',
          type: 'success',
          icon: 'Award',
          action: 'complete_project',
          permissions: ['provider']
        })
      }

      if (booking.status === 'approved') {
        actions.push({
          id: 'create_invoice',
          label: 'Generate Invoice',
          description: 'Create an invoice for this booking',
          type: 'secondary',
          icon: 'Receipt',
          action: 'create_invoice',
          permissions: ['provider']
        })
      }
    }

    if (userRole === 'client') {
      // Client actions
      if (currentMilestone && currentMilestone.status === 'completed') {
        actions.push({
          id: 'approve_milestone',
          label: `Approve ${currentMilestone.title}`,
          description: 'Approve the completed milestone',
          type: 'primary',
          icon: 'ThumbsUp',
          action: 'approve_milestone',
          params: { milestoneId: currentMilestone.id },
          permissions: ['client']
        })
      }

      if (booking.status === 'in_progress') {
        actions.push({
          id: 'add_feedback',
          label: 'Provide Feedback',
          description: 'Share feedback on the current progress',
          type: 'secondary',
          icon: 'MessageSquare',
          action: 'add_feedback',
          permissions: ['client']
        })
      }

      if (progress >= 100) {
        actions.push({
          id: 'final_approval',
          label: 'Final Project Approval',
          description: 'Give final approval for project completion',
          type: 'success',
          icon: 'Award',
          action: 'final_approval',
          permissions: ['client'],
          urgent: true
        })
      }
    }

    if (userRole === 'admin') {
      // Admin actions
      actions.push({
        id: 'manage_project',
        label: 'Manage Project',
        description: 'Access full project management tools',
        type: 'primary',
        icon: 'Settings',
        action: 'manage_project',
        permissions: ['admin']
      })

      if (booking.status === 'pending') {
        actions.push({
          id: 'force_approve',
          label: 'Force Approve',
          description: 'Override and approve this booking',
          type: 'secondary',
          icon: 'Shield',
          action: 'force_approve',
          permissions: ['admin']
        })
      }
    }

    return actions
  }

  private generateRisks(booking: any, milestones: any[], currentMilestone: any): Risk[] {
    const risks: Risk[] = []

    // Check for overdue milestones
    const overdueMilestones = milestones.filter(m => {
      if (!m.due_date) return false
      return new Date(m.due_date) < new Date() && m.status !== 'completed'
    })

    if (overdueMilestones.length > 0) {
      risks.push({
        id: 'overdue_milestones',
        type: 'deadline',
        severity: 'high',
        description: `${overdueMilestones.length} milestone(s) overdue`,
        impact: 'Project timeline at risk',
        mitigation: 'Review and adjust milestone deadlines'
      })
    }

    // Check for high-risk milestones
    const highRiskMilestones = milestones.filter(m => m.risk_level === 'high' || m.risk_level === 'critical')
    if (highRiskMilestones.length > 0) {
      risks.push({
        id: 'high_risk_milestones',
        type: 'quality',
        severity: 'medium',
        description: `${highRiskMilestones.length} high-risk milestone(s)`,
        impact: 'Quality and delivery may be affected',
        mitigation: 'Monitor progress closely and provide additional support'
      })
    }

    // Check for blocked dependencies
    const blockedMilestones = milestones.filter(m => 
      m.status === 'pending' && 
      milestones.some(dep => dep.order_index < m.order_index && dep.status !== 'completed')
    )

    if (blockedMilestones.length > 0) {
      risks.push({
        id: 'blocked_dependencies',
        type: 'dependency',
        severity: 'medium',
        description: `${blockedMilestones.length} milestone(s) waiting on dependencies`,
        impact: 'Progress may be delayed',
        mitigation: 'Complete prerequisite milestones first'
      })
    }

    return risks
  }

  private generateStatusDescription(
    status: string,
    currentMilestone: any,
    currentPhase: any,
    progress: number
  ): string {
    switch (status) {
      case 'pending':
      case 'pending_review':
        return 'Waiting for provider approval to begin project'
      case 'approved':
        if (!currentMilestone) {
          return 'Approved - Project planning in progress'
        }
        return 'Approved - Ready to begin project execution'
      case 'ready_to_launch':
        return 'All prerequisites met - Ready to begin development'
      case 'in_progress':
      case 'in_production':
        if (currentMilestone) {
          return `Active - Working on "${currentMilestone.title}" (${progress}% complete)`
        }
        if (currentPhase) {
          return `Active - In "${currentPhase.name}" phase (${progress}% complete)`
        }
        return `In Progress - ${progress}% complete`
      case 'completed':
      case 'delivered':
        return `Completed successfully - All milestones achieved`
      case 'cancelled':
        return 'Project cancelled'
      case 'on_hold':
        return 'Project temporarily on hold'
      default:
        return 'Status unknown'
    }
  }

  private determineNextAction(
    booking: any,
    milestones: any[],
    currentMilestone: any,
    userRole: string
  ): { action: string | null; by: 'client' | 'provider' | 'admin' | null } {
    if (booking.status === 'pending') {
      return { action: 'Provider needs to approve booking', by: 'provider' }
    }

    if (booking.status === 'approved' && milestones.length === 0) {
      return { action: 'Provider needs to create project milestones', by: 'provider' }
    }

    if (currentMilestone) {
      if (currentMilestone.status === 'pending') {
        return { action: `Start working on "${currentMilestone.title}"`, by: 'provider' }
      }
      if (currentMilestone.status === 'in_progress') {
        const incompleteTasks = (currentMilestone.tasks || []).filter((t: any) => t.status !== 'completed')
        if (incompleteTasks.length > 0) {
          return { action: `Complete ${incompleteTasks.length} remaining task(s)`, by: 'provider' }
        }
        return { action: `Mark "${currentMilestone.title}" as complete`, by: 'provider' }
      }
      if (currentMilestone.status === 'completed') {
        return { action: `Review and approve "${currentMilestone.title}"`, by: 'client' }
      }
    }

    const nextPendingMilestone = milestones.find(m => m.status === 'pending')
    if (nextPendingMilestone) {
      return { action: `Begin "${nextPendingMilestone.title}" milestone`, by: 'provider' }
    }

    if (milestones.every(m => m.status === 'completed')) {
      return { action: 'Provide final project approval', by: 'client' }
    }

    return { action: null, by: null }
  }

  private calculateEstimatedCompletion(milestones: any[], scheduledDate: string): string | null {
    if (!milestones.length) return null

    const incompleteMilestones = milestones.filter(m => m.status !== 'completed')
    if (incompleteMilestones.length === 0) return null

    // Simple estimation based on remaining milestones and average completion time
    const avgDaysPerMilestone = 7 // Assume 1 week per milestone on average
    const estimatedDays = incompleteMilestones.length * avgDaysPerMilestone
    
    const estimatedDate = new Date()
    estimatedDate.setDate(estimatedDate.getDate() + estimatedDays)
    
    return estimatedDate.toISOString()
  }

  private getLastActivity(milestones: any[]): string | null {
    let latestActivity: string | null = null
    let latestDate = new Date(0)

    milestones.forEach(milestone => {
      const milestoneDate = new Date(milestone.updated_at)
      if (milestoneDate > latestDate) {
        latestDate = milestoneDate
        latestActivity = milestone.updated_at
      }

      if (milestone.tasks) {
        milestone.tasks.forEach((task: any) => {
          const taskDate = new Date(task.updated_at)
          if (taskDate > latestDate) {
            latestDate = taskDate
            latestActivity = task.updated_at
          }
        })
      }
    })

    return latestActivity
  }

  async updateBookingStatus(bookingId: string, newStatus: string, userRole: string): Promise<void> {
    const supabase = await getSupabaseClient()
    
    const { error } = await supabase
      .from('bookings')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)

    if (error) {
      throw new Error(`Failed to update booking status: ${error.message}`)
    }

    // Log the status change for audit trail
    try {
      await supabase
        .from('booking_activity_log')
        .insert({
          booking_id: bookingId,
          action: `status_changed_to_${newStatus}`,
          performed_by: userRole,
          timestamp: new Date().toISOString(),
          details: { old_status: 'unknown', new_status: newStatus }
        })
    } catch (err) {
      console.warn('Failed to log activity:', err)
    }
  }

  async executeAction(
    bookingId: string,
    actionId: string,
    params: Record<string, any> = {},
    userRole: string
  ): Promise<{ success: boolean; message: string }> {
    const supabase = await getSupabaseClient()

    try {
      switch (actionId) {
        case 'approve': {
          // Use API endpoint to bypass RLS and run all side-effects (notifications/invoice)
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) {
              return { success: false, message: 'Not authenticated' }
            }

            const res = await fetch('/api/bookings', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                booking_id: bookingId,
                action: 'approve'
              })
            })

            if (!res.ok) {
              const data = await res.json().catch(() => ({}))
              console.warn('Approve booking API failed:', res.status, data)
              return { success: false, message: 'Failed to update booking' }
            }

            return { success: true, message: 'Booking approved successfully' }
          } catch (err) {
            console.error('Approve booking request error:', err)
            return { success: false, message: 'Failed to update booking' }
          }
        }

        case 'decline':
          await this.updateBookingStatus(bookingId, 'cancelled', userRole)
          return { success: true, message: 'Booking declined' }

        case 'start_milestone':
          if (params.milestoneId) {
            await supabase
              .from('milestones')
              .update({ status: 'in_progress', updated_at: new Date().toISOString() })
              .eq('id', params.milestoneId)
            return { success: true, message: 'Milestone started' }
          }
          break

        case 'complete_milestone':
          if (params.milestoneId) {
            await supabase
              .from('milestones')
              .update({ 
                status: 'completed', 
                progress_percentage: 100,
                updated_at: new Date().toISOString() 
              })
              .eq('id', params.milestoneId)
            return { success: true, message: 'Milestone completed' }
          }
          break

        case 'complete_project':
          await this.updateBookingStatus(bookingId, 'completed', userRole)
          return { success: true, message: 'Project marked as complete' }

        case 'add_feedback': {
          // Send feedback as a message to the other party and return success
          try {
            // Get session token for authenticated API call
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
              return { success: false, message: 'Not authenticated' }
            }

            // Lookup booking to find receiver
            const { data: booking, error: bookingErr } = await supabase
              .from('bookings')
              .select('id, client_id, provider_id, service_id')
              .eq('id', bookingId)
              .single()

            if (bookingErr || !booking) {
              return { success: false, message: 'Could not find booking' }
            }

            // Receiver is the opposite party
            const currentUser = (await supabase.auth.getUser()).data.user
            const receiverId = currentUser?.id === booking.client_id ? booking.provider_id : booking.client_id

            if (!receiverId) {
              return { success: false, message: 'Receiver not found' }
            }

            const feedbackParts: string[] = []
            if (params.rating) feedbackParts.push(`Rating: ${params.rating}/5`)
            if (params.comment) feedbackParts.push(params.comment)
            const content = feedbackParts.join('\n\n') || 'Feedback submitted.'

            const res = await fetch('/api/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                receiver_id: receiverId,
                subject: 'Booking Feedback',
                content,
                booking_id: bookingId
              })
            })

            if (!res.ok) {
              const data = await res.json().catch(() => ({}))
              console.warn('Feedback message failed:', res.status, data)
              // Still return success for UX, since feedback is optional
              return { success: true, message: 'Feedback submitted' }
            }

            return { success: true, message: 'Feedback submitted' }
          } catch (fbErr) {
            console.warn('Feedback submission error:', fbErr)
            return { success: false, message: 'Failed to submit feedback' }
          }
        }

        default:
          return { success: false, message: 'Unknown action' }
      }
    } catch (error) {
      console.error('Action execution failed:', error)
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Action failed' 
      }
    }

    return { success: false, message: 'Action not implemented' }
  }
}

export const smartBookingStatusService = new SmartBookingStatusService()
