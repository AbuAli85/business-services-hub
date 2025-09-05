'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Plus,
  MessageSquare,
  BarChart3,
  Target,
  TrendingUp,
  Users,
  Settings
} from 'lucide-react'
import { ProgressBar } from './progress-bar'
import { MilestoneCard } from './milestone-card'
import { getSupabaseClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'

interface Step {
  name: string
  status: 'pending' | 'in_progress' | 'completed' | 'delayed'
  tag?: string
}

interface Milestone {
  id: string
  title: string
  description: string
  progress_percentage: number
  status: string
  due_date?: string
  weight: number
  order_index: number
  editable: boolean
  tasks: Task[]
  created_at?: string
  updated_at?: string
}

interface Task {
  id: string
  title: string
  status: string
  progress_percentage: number
  due_date?: string
  editable: boolean
}

interface MonthlyProgressTrackingProps {
  bookingId: string
  userRole: 'provider' | 'client'
  className?: string
}

export function MonthlyProgressTracking({ 
  bookingId, 
  userRole, 
  className = "" 
}: MonthlyProgressTrackingProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  const [overallProgress, setOverallProgress] = useState(0)
  const [overdueCount, setOverdueCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProgressData()
  }, [bookingId])

  const loadProgressData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const supabase = await getSupabaseClient()
      
      // Load both milestones data and booking data
      const [milestonesResult, bookingResult] = await Promise.all([
        supabase
          .from('milestones')
          .select(`
            id,
            title,
            description,
            progress_percentage,
            status,
            due_date,
            weight,
            order_index,
            editable,
            tasks (
              id,
              title,
              status,
              progress_percentage,
              due_date,
              editable
            )
          `)
          .eq('booking_id', bookingId)
          .order('order_index', { ascending: true }),
        supabase
          .from('bookings')
          .select('project_progress')
          .eq('id', bookingId)
          .single()
      ])
      
      if (milestonesResult.error) {
        console.error('Error loading milestones data:', milestonesResult.error)
        
        // Check if it's a table not found error
        if (milestonesResult.error.message.includes('relation "public.milestones" does not exist') || 
            milestonesResult.error.message.includes('permission denied') ||
            milestonesResult.error.code === 'PGRST116') {
          console.warn('milestones table not available, using fallback')
          setMilestones([])
          setOverallProgress(0)
          setOverdueCount(0)
          setError('Progress tracking table not available. Please contact support.')
          return
        }
        
        throw new Error(milestonesResult.error.message)
      }
      
      if (bookingResult.error) {
        throw new Error(bookingResult.error.message)
      }
      
      setMilestones(milestonesResult.data || [])
      
      // Use synced project_progress from bookings table
      const syncedProgress = bookingResult.data?.project_progress || 0
      setOverallProgress(syncedProgress)
      
      // Calculate overdue milestones
      const currentDate = new Date()
      const overdue = milestonesResult.data?.filter((m: any) => 
        m.due_date && new Date(m.due_date) < currentDate && m.status !== 'completed'
      ).length || 0
      setOverdueCount(overdue)
      
    } catch (error) {
      console.error('Error loading progress data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load progress data')
      toast.error('Failed to load progress data')
    } finally {
      setLoading(false)
    }
  }

  const createDefaultMilestones = async () => {
    try {
      setCreating(true)
      
      const supabase = await getSupabaseClient()
      const { error } = await supabase.rpc('create_default_milestones', {
        booking_uuid: bookingId
      })
      
      if (error) {
        throw new Error(error.message)
      }
      
      toast.success('Default milestones created successfully!')
      await loadProgressData()
      
    } catch (error) {
      console.error('Error creating milestones:', error)
      toast.error('Failed to create milestones')
    } finally {
      setCreating(false)
    }
  }

  const updateStep = async (milestoneId: string, stepIndex: number, updatedStep: Step) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Get current milestone data with better error handling
      const { data: currentMilestone, error: fetchError } = await supabase
        .from('booking_progress')
        .select('*')
        .eq('id', milestoneId)
      
      if (fetchError) {
        console.error('Error fetching milestone:', fetchError)
        
        // Check if it's a table not found error
        if (fetchError.message.includes('relation "public.booking_progress" does not exist') || 
            fetchError.message.includes('permission denied') ||
            fetchError.code === 'PGRST116') {
          console.warn('booking_progress table not available, using fallback')
          toast.error('Progress tracking table not available. Please contact support.')
          return
        }
        
        throw new Error(`Failed to fetch milestone: ${fetchError.message}`)
      }
      
      if (!currentMilestone || currentMilestone.length === 0) {
        throw new Error('Milestone not found')
      }
      
      if (currentMilestone.length > 1) {
        console.warn('Multiple milestones found with same ID, using first one')
      }
      
      const milestone = currentMilestone[0]
      
      // Update the steps array
      const updatedSteps = [...milestone.steps]
      updatedSteps[stepIndex] = updatedStep
      
      // Calculate new progress
      const completedSteps = updatedSteps.filter(step => step.status === 'completed').length
      const newProgress = Math.round((completedSteps / updatedSteps.length) * 100)
      
      // Update the milestone
      const { error: updateError } = await supabase
        .from('booking_progress')
        .update({
          steps: updatedSteps,
          progress: newProgress,
          updated_at: new Date().toISOString()
        })
        .eq('id', milestoneId)
      
      if (updateError) {
        throw new Error(updateError.message)
      }
      
      // Try to trigger progress sync by calling the database function (if available)
      try {
        const { error: syncError } = await supabase.rpc('calculate_booking_progress', {
          booking_id: bookingId
        })
        
        if (syncError) {
          console.warn('Progress sync failed:', syncError)
          // Don't fail the operation if sync fails
        }
      } catch (rpcError) {
        console.warn('RPC function calculate_booking_progress not available:', rpcError)
        // Continue without failing - the UI will still update
      }
      
      // Reload data to get updated progress
      await loadProgressData()
      toast.success('Step updated successfully')
      
    } catch (error) {
      console.error('Error updating step:', error)
      toast.error('Failed to update step')
    }
  }

  const toggleMilestoneExpansion = (milestoneId: string) => {
    setExpandedMilestones(prev => {
      const newSet = new Set(prev)
      if (newSet.has(milestoneId)) {
        newSet.delete(milestoneId)
      } else {
        newSet.add(milestoneId)
      }
      return newSet
    })
  }

  const handleAddComment = (milestoneId: string) => {
    // This would open a comment modal or navigate to comments
    toast('Comment feature coming soon')
  }

  const completedMilestones = milestones.filter(m => m.progress_percentage >= 100).length
  const totalMilestones = milestones.length

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading progress data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
        <Button onClick={loadProgressData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (milestones.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="border-0 shadow-lg">
          <CardContent className="text-center py-12">
            <Target className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Progress Tracking Set Up
            </h3>
            <p className="text-gray-600 mb-6">
              {userRole === 'provider' 
                ? 'Create monthly milestones to track your service delivery progress.'
                : 'Progress tracking will be available once the provider sets up milestones.'
              }
            </p>
            {userRole === 'provider' && (
              <Button 
                onClick={createDefaultMilestones}
                disabled={creating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {creating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Monthly Milestones
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Overview */}
      <ProgressBar
        overallProgress={overallProgress}
        totalMilestones={totalMilestones}
        completedMilestones={completedMilestones}
        overdueCount={overdueCount}
        estimatedCompletion="End of Month"
      />

      {/* Milestones List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span>Monthly Milestones</span>
            <Badge variant="secondary" className="ml-2">
              {totalMilestones} Total
            </Badge>
          </h3>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={loadProgressData}
              className="text-gray-600 border-gray-200 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            
            {userRole === 'provider' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setExpandedMilestones(new Set(milestones.map(m => m.id)))}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Expand All
              </Button>
            )}
          </div>
        </div>

        {milestones.map((milestone) => (
          <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            userRole={userRole}
            isExpanded={expandedMilestones.has(milestone.id)}
            onToggleExpanded={() => toggleMilestoneExpansion(milestone.id)}
            onUpdateStep={(stepIndex, updatedStep) => 
              updateStep(milestone.id, stepIndex, updatedStep)
            }
            onAddComment={handleAddComment}
          />
        ))}
      </div>

      {/* Progress Summary */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-900">
            <TrendingUp className="h-5 w-5" />
            <span>Progress Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {overallProgress}%
              </div>
              <div className="text-sm text-blue-800">Overall Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {completedMilestones}
              </div>
              <div className="text-sm text-green-800">Completed Milestones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {totalMilestones - completedMilestones}
              </div>
              <div className="text-sm text-orange-800">Remaining Milestones</div>
            </div>
          </div>
          
          {overdueCount > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-sm font-medium text-red-800">
                  {overdueCount} milestone{overdueCount !== 1 ? 's' : ''} overdue
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
