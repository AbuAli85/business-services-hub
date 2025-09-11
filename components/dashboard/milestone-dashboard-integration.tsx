'use client'

import React, { useState, useEffect } from 'react'
import { EnhancedMilestoneDashboard } from './enhanced-milestone-dashboard'
import { Milestone, Task, UserRole } from '@/types/progress'
import { getSupabaseClient } from '@/lib/supabase'

interface MilestoneDashboardIntegrationProps {
  bookingId: string
  userRole: UserRole
  className?: string
}

export function MilestoneDashboardIntegration({
  bookingId,
  userRole,
  className = ""
}: MilestoneDashboardIntegrationProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [commentsByMilestone, setCommentsByMilestone] = useState<Record<string, any[]>>({})
  const [approvalsByMilestone, setApprovalsByMilestone] = useState<Record<string, any[]>>({})
  const [timeEntries, setTimeEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load data from your existing API endpoints
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Use Supabase client for authenticated requests
        const supabase = await getSupabaseClient()
        
        // Load milestones with tasks directly from Supabase
        const { data: milestonesData, error: milestonesError } = await supabase
          .from('milestones')
          .select(`
            *,
            tasks (* )
          `)
          .eq('booking_id', bookingId)
          .order('order_index', { ascending: true })

        if (milestonesError) {
          throw new Error(`Failed to load milestones: ${milestonesError.message}`)
        }
        
        // Ensure tasks are consistently sorted and present
        const normalized = (milestonesData || []).map(m => ({
          ...m,
          tasks: (m.tasks || []).sort((a: any, b: any) => {
            const ao = a.order_index ?? 0
            const bo = b.order_index ?? 0
            if (ao !== bo) return ao - bo
            const ad = a.created_at ? new Date(a.created_at).getTime() : 0
            const bd = b.created_at ? new Date(b.created_at).getTime() : 0
            return ad - bd
          })
        }))

        setMilestones(normalized)

        // Load comments from Supabase
        try {
          const { data: commentsData, error: commentsError } = await supabase
            .from('milestone_comments')
            .select('*')
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: false })
          
          if (!commentsError) {
            // Group comments by milestone
            const groupedComments = (commentsData || []).reduce((acc, comment) => {
              const milestoneId = comment.milestone_id
              if (!acc[milestoneId]) acc[milestoneId] = []
              acc[milestoneId].push(comment)
              return acc
            }, {} as Record<string, any[]>)
            setCommentsByMilestone(groupedComments)
          } else {
            console.warn('Comments loading error:', commentsError)
            setCommentsByMilestone({})
          }
        } catch (err) {
          console.warn('Comments not available:', err)
          setCommentsByMilestone({})
        }

        // Load approvals from Supabase
        try {
          const { data: approvalsData, error: approvalsError } = await supabase
            .from('milestone_approvals')
            .select('*')
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: false })
          
          if (!approvalsError) {
            // Group approvals by milestone
            const groupedApprovals = (approvalsData || []).reduce((acc, approval) => {
              const milestoneId = approval.milestone_id
              if (!acc[milestoneId]) acc[milestoneId] = []
              acc[milestoneId].push(approval)
              return acc
            }, {} as Record<string, any[]>)
            setApprovalsByMilestone(groupedApprovals)
          } else {
            console.warn('Approvals loading error:', approvalsError)
            setApprovalsByMilestone({})
          }
        } catch (err) {
          console.warn('Approvals not available:', err)
          setApprovalsByMilestone({})
        }

        // Load time entries from Supabase
        try {
          const { data: timeEntriesData, error: timeEntriesError } = await supabase
            .from('time_entries')
            .select('*')
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: false })
          
          if (!timeEntriesError) {
            setTimeEntries(timeEntriesData || [])
          }
        } catch (err) {
          console.warn('Time entries not available:', err)
        }

      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    if (bookingId) {
      loadData()
    }
  }, [bookingId])

  const handleMilestoneUpdate = async (milestoneId: string, updates: Partial<Milestone>) => {
    try {
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update milestone')
      }

      // Update local state
      setMilestones(prev => prev.map(m => 
        m.id === milestoneId ? { ...m, ...updates } : m
      ))
    } catch (err) {
      console.error('Error updating milestone:', err)
    }
  }

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      // Update local state
      setMilestones(prev => prev.map(milestone => ({
        ...milestone,
        tasks: milestone.tasks?.map(task => 
          task.id === taskId ? { ...task, ...updates } : task
        ) || []
      })))
    } catch (err) {
      console.error('Error updating task:', err)
    }
  }

  const handleTaskAdd = async (milestoneId: string, task: Partial<Task>) => {
    try {
      const response = await fetch(`/api/milestones/${milestoneId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      })

      if (!response.ok) {
        throw new Error('Failed to add task')
      }

      const newTask = await response.json()
      
      // Update local state
      setMilestones(prev => prev.map(milestone => 
        milestone.id === milestoneId 
          ? { ...milestone, tasks: [...(milestone.tasks || []), newTask] }
          : milestone
      ))
    } catch (err) {
      console.error('Error adding task:', err)
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      // Update local state
      setMilestones(prev => prev.map(milestone => ({
        ...milestone,
        tasks: milestone.tasks?.filter(task => task.id !== taskId) || []
      })))
    } catch (err) {
      console.error('Error deleting task:', err)
    }
  }

  const handleCommentAdd = async (milestoneId: string, comment: string) => {
    try {
      const response = await fetch(`/api/milestones/${milestoneId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: comment }),
      })

      if (!response.ok) {
        throw new Error('Failed to add comment')
      }

      const newComment = await response.json()
      
      // Update local state
      setCommentsByMilestone(prev => ({
        ...prev,
        [milestoneId]: [...(prev[milestoneId] || []), newComment]
      }))
    } catch (err) {
      console.error('Error adding comment:', err)
    }
  }

  const handleMilestoneApproval = async (milestoneId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const response = await fetch(`/api/milestones/${milestoneId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, notes }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit approval')
      }

      const newApproval = await response.json()
      
      // Update local state
      setApprovalsByMilestone(prev => ({
        ...prev,
        [milestoneId]: [...(prev[milestoneId] || []), newApproval]
      }))
    } catch (err) {
      console.error('Error submitting approval:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading milestone dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <EnhancedMilestoneDashboard
        milestones={milestones}
        userRole={userRole}
        onMilestoneUpdate={handleMilestoneUpdate}
        onTaskUpdate={handleTaskUpdate}
        onTaskAdd={handleTaskAdd}
        onTaskDelete={handleTaskDelete}
        onCommentAdd={handleCommentAdd}
        onMilestoneApproval={handleMilestoneApproval}
        commentsByMilestone={commentsByMilestone}
        approvalsByMilestone={approvalsByMilestone}
        timeEntries={timeEntries}
      />
    </div>
  )
}
