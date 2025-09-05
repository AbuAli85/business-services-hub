import { Milestone, Task } from '@/types/progress'

export interface ProgressCalculationResult {
  milestoneProgress: number
  overallProgress: number
  completedTasks: number
  totalTasks: number
  completedMilestones: number
  totalMilestones: number
}

/**
 * Calculate milestone progress based on task completion
 */
export function calculateMilestoneProgress(milestone: Milestone): number {
  if (!milestone.tasks || milestone.tasks.length === 0) {
    return milestone.progress_percentage || 0
  }

  const completedTasks = milestone.tasks.filter(task => task.status === 'completed').length
  const totalTasks = milestone.tasks.length
  
  if (totalTasks === 0) return 0
  
  return Math.round((completedTasks / totalTasks) * 100)
}

/**
 * Calculate overall project progress based on milestone weights and progress
 */
export function calculateOverallProgress(milestones: Milestone[]): ProgressCalculationResult {
  if (!milestones || milestones.length === 0) {
    return {
      milestoneProgress: 0,
      overallProgress: 0,
      completedTasks: 0,
      totalTasks: 0,
      completedMilestones: 0,
      totalMilestones: 0
    }
  }

  let totalWeightedProgress = 0
  let totalWeight = 0
  let completedTasks = 0
  let totalTasks = 0
  let completedMilestones = 0

  milestones.forEach(milestone => {
    const milestoneProgress = calculateMilestoneProgress(milestone)
    const weight = milestone.weight || 1
    
    totalWeightedProgress += milestoneProgress * weight
    totalWeight += weight
    
    // Count tasks
    const milestoneTasks = milestone.tasks || []
    totalTasks += milestoneTasks.length
    completedTasks += milestoneTasks.filter(task => task.status === 'completed').length
    
    // Count completed milestones
    if (milestone.status === 'completed' || milestoneProgress === 100) {
      completedMilestones++
    }
  })

  const overallProgress = totalWeight > 0 ? Math.round(totalWeightedProgress / totalWeight) : 0

  return {
    milestoneProgress: overallProgress,
    overallProgress,
    completedTasks,
    totalTasks,
    completedMilestones,
    totalMilestones: milestones.length
  }
}

/**
 * Update milestone progress when tasks change
 */
export function updateMilestoneProgress(milestone: Milestone): Milestone {
  const newProgress = calculateMilestoneProgress(milestone)
  
  // Determine if milestone should be marked as completed
  let newStatus = milestone.status
  if (newProgress === 100 && milestone.status !== 'completed') {
    newStatus = 'completed'
  } else if (newProgress > 0 && milestone.status === 'pending') {
    newStatus = 'in_progress'
  } else if (newProgress === 0 && milestone.status === 'completed') {
    newStatus = 'pending'
  }

  return {
    ...milestone,
    progress_percentage: newProgress,
    status: newStatus,
    updated_at: new Date().toISOString()
  }
}

/**
 * Check if a task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
  if (!task.due_date || task.status === 'completed') {
    return false
  }
  
  return new Date(task.due_date) < new Date()
}

/**
 * Check if a milestone is overdue
 */
export function isMilestoneOverdue(milestone: Milestone): boolean {
  if (!milestone.due_date || milestone.status === 'completed') {
    return false
  }
  
  return new Date(milestone.due_date) < new Date()
}

/**
 * Get estimated completion date based on current progress and remaining work
 */
export function getEstimatedCompletionDate(milestones: Milestone[]): Date | null {
  const now = new Date()
  const completedMilestones = milestones.filter(m => m.status === 'completed')
  const remainingMilestones = milestones.filter(m => m.status !== 'completed')
  
  if (remainingMilestones.length === 0) {
    return null // Project is complete
  }

  // Calculate average duration per milestone based on completed ones
  let avgDuration = 7 * 24 * 60 * 60 * 1000 // Default 7 days per milestone
  
  if (completedMilestones.length > 0) {
    const totalDuration = completedMilestones.reduce((sum, milestone) => {
      if (milestone.created_at && milestone.updated_at) {
        const duration = new Date(milestone.updated_at).getTime() - new Date(milestone.created_at).getTime()
        return sum + duration
      }
      return sum
    }, 0)
    
    avgDuration = totalDuration / completedMilestones.length
  }

  // Estimate completion based on remaining milestones
  const estimatedTime = remainingMilestones.length * avgDuration
  return new Date(now.getTime() + estimatedTime)
}

/**
 * Get priority level for a milestone based on due date and progress
 */
export function getMilestonePriority(milestone: Milestone): 'high' | 'medium' | 'low' {
  const isOverdue = isMilestoneOverdue(milestone)
  const daysUntilDue = milestone.due_date ? 
    Math.ceil((new Date(milestone.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
    Infinity

  if (isOverdue) return 'high'
  if (daysUntilDue <= 3) return 'high'
  if (daysUntilDue <= 7) return 'medium'
  return 'low'
}

/**
 * Get priority level for a task based on due date and status
 */
export function getTaskPriority(task: Task): 'high' | 'medium' | 'low' {
  const isOverdue = isTaskOverdue(task)
  const daysUntilDue = task.due_date ? 
    Math.ceil((new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
    Infinity

  if (isOverdue) return 'high'
  if (daysUntilDue <= 1) return 'high'
  if (daysUntilDue <= 3) return 'medium'
  return 'low'
}
