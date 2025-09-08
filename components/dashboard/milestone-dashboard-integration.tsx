'use client'

import React, { useState, useEffect } from 'react'
import { EnhancedMilestoneDashboard } from './enhanced-milestone-dashboard'
import { Milestone, Task, UserRole } from '@/types/progress'

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

        // Load milestones with tasks
        const milestonesResponse = await fetch(`/api/secure-milestones/${bookingId}`)
        if (!milestonesResponse.ok) {
          throw new Error('Failed to load milestones')
        }
        const milestonesData = await milestonesResponse.json()
        setMilestones(milestonesData || [])

        // Load comments (if you have this endpoint)
        try {
          const commentsResponse = await fetch(`/api/milestone-comments/${bookingId}`)
          if (commentsResponse.ok) {
            const commentsData = await commentsResponse.json()
            setCommentsByMilestone(commentsData || {})
          }
        } catch (err) {
          console.warn('Comments not available:', err)
        }

        // Load approvals (if you have this endpoint)
        try {
          const approvalsResponse = await fetch(`/api/milestone-approvals/${bookingId}`)
          if (approvalsResponse.ok) {
            const approvalsData = await approvalsResponse.json()
            setApprovalsByMilestone(approvalsData || {})
          }
        } catch (err) {
          console.warn('Approvals not available:', err)
        }

        // Load time entries (if you have this endpoint)
        try {
          const timeEntriesResponse = await fetch(`/api/time-entries/${bookingId}`)
          if (timeEntriesResponse.ok) {
            const timeEntriesData = await timeEntriesResponse.json()
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
