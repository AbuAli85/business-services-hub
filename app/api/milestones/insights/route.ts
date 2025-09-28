import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
}

// GET /api/milestones/insights - Get AI insights for milestones
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json(
        { 
          error: 'MISSING_BOOKING_ID', 
          message: 'Booking ID is required',
          code: 'MISSING_BOOKING_ID'
        },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { 
          error: 'UNAUTHORIZED', 
          message: 'Authentication required',
          code: 'UNAUTHORIZED'
        },
        { status: 401, headers: corsHeaders }
      )
    }

    // Load milestones with tasks
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestones')
      .select(`
        *,
        tasks (
          id,
          title,
          status,
          priority,
          due_date,
          progress_percentage,
          estimated_hours,
          actual_hours,
          created_at,
          updated_at
        )
      `)
      .eq('booking_id', bookingId)
      .order('order_index', { ascending: true })

    if (milestonesError) {
      console.error('Error fetching milestones:', milestonesError)
      return NextResponse.json(
        { 
          error: 'FETCH_FAILED', 
          message: 'Failed to fetch milestones',
          details: milestonesError.message,
          code: 'FETCH_FAILED'
        },
        { status: 500, headers: corsHeaders }
      )
    }

    // Calculate insights
    const insights = calculateInsights(milestones || [])
    const recommendations = generateRecommendations(milestones || [])
    const predictions = calculatePredictions(milestones || [])

    return NextResponse.json(
      { 
        success: true,
        insights,
        recommendations,
        predictions,
        milestones: milestones || []
      },
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Insights error:', error)
    return NextResponse.json(
      { 
        error: 'INTERNAL_ERROR', 
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

function calculateInsights(milestones: any[]) {
  const totalMilestones = milestones.length
  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const inProgressMilestones = milestones.filter(m => m.status === 'in_progress').length
  const overdueMilestones = milestones.filter(m => 
    m.due_date && new Date(m.due_date) < new Date() && m.status !== 'completed'
  ).length

  const totalTasks = milestones.reduce((acc, m) => acc + (m.tasks?.length || 0), 0)
  const completedTasks = milestones.reduce((acc, m) => 
    acc + (m.tasks?.filter((t: any) => t.status === 'completed').length || 0), 0
  )
  const overdueTasks = milestones.reduce((acc, m) => 
    acc + (m.tasks?.filter((t: any) => 
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
    ).length || 0), 0
  )

  // Calculate health score
  let healthScore = 100
  healthScore -= (overdueMilestones * 15)
  healthScore -= (overdueTasks * 5)
  
  const completionRate = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0
  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  
  if (completionRate < 50) healthScore -= 20
  if (taskCompletionRate < 30) healthScore -= 15
  if (completionRate > 80) healthScore += 10
  if (taskCompletionRate > 70) healthScore += 10

  healthScore = Math.max(0, Math.min(100, healthScore))

  return {
    healthScore,
    totalMilestones,
    completedMilestones,
    inProgressMilestones,
    overdueMilestones,
    totalTasks,
    completedTasks,
    overdueTasks,
    completionRate,
    taskCompletionRate
  }
}

function generateRecommendations(milestones: any[]) {
  const recommendations = []
  const insights = calculateInsights(milestones)

  // Overdue items
  if (insights.overdueMilestones > 0) {
    recommendations.push({
      type: 'urgent',
      title: 'Overdue Milestones',
      description: `${insights.overdueMilestones} milestone(s) are overdue`,
      action: 'Review and update due dates or reassign resources',
      priority: 'high'
    })
  }

  if (insights.overdueTasks > 0) {
    recommendations.push({
      type: 'warning',
      title: 'Overdue Tasks',
      description: `${insights.overdueTasks} task(s) are overdue`,
      action: 'Prioritize and complete overdue tasks',
      priority: 'medium'
    })
  }

  // Low completion rates
  if (insights.healthScore < 60) {
    recommendations.push({
      type: 'info',
      title: 'Project Health Low',
      description: 'Project health score is below optimal',
      action: 'Focus on completing in-progress items and reducing bottlenecks',
      priority: 'high'
    })
  }

  // Resource optimization
  const inProgressCount = milestones.filter(m => m.status === 'in_progress').length
  if (inProgressCount > 3) {
    recommendations.push({
      type: 'info',
      title: 'Resource Spread',
      description: 'Many milestones in progress simultaneously',
      action: 'Consider focusing on fewer milestones at once for better efficiency',
      priority: 'medium'
    })
  }

  return recommendations
}

function calculatePredictions(milestones: any[]) {
  const now = new Date()
  const totalEstimatedHours = milestones.reduce((acc, m) => acc + (m.estimated_hours || 0), 0)
  const completedHours = milestones.reduce((acc, m) => {
    if (m.status === 'completed') return acc + (m.estimated_hours || 0)
    if (m.status === 'in_progress') return acc + ((m.estimated_hours || 0) * (m.progress_percentage || 0) / 100)
    return acc
  }, 0)

  const remainingHours = totalEstimatedHours - completedHours
  const completionRate = totalEstimatedHours > 0 ? completedHours / totalEstimatedHours : 0

  // Estimate completion date based on current velocity
  const avgDailyHours = completionRate > 0 ? completedHours / Math.max(1, getDaysSinceStart(milestones)) : 8
  const estimatedDaysToComplete = avgDailyHours > 0 ? remainingHours / avgDailyHours : 30
  const estimatedCompletion = new Date(now.getTime() + estimatedDaysToComplete * 24 * 60 * 60 * 1000)

  // Calculate risk level
  let riskLevel = 'low'
  const overdueCount = milestones.filter(m => 
    m.due_date && new Date(m.due_date) < now && m.status !== 'completed'
  ).length

  if (overdueCount > 2 || completionRate < 0.3) riskLevel = 'high'
  else if (overdueCount > 0 || completionRate < 0.6) riskLevel = 'medium'

  return {
    estimatedCompletion,
    estimatedDaysToComplete,
    completionRate,
    riskLevel,
    totalEstimatedHours,
    completedHours,
    remainingHours
  }
}

function getDaysSinceStart(milestones: any[]) {
  const startDates = milestones
    .map(m => m.start_date ? new Date(m.start_date) : null)
    .filter(Boolean)
    .sort((a, b) => a!.getTime() - b!.getTime())
  
  if (startDates.length === 0) return 1
  const startDate = startDates[0]!
  return Math.max(1, Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
}
