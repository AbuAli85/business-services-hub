'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, TrendingUp, Calendar, Clock } from 'lucide-react'
import { Milestone } from '@/types/progress'

interface EnhancedProgressChartsProps {
  milestones: Milestone[]
  timeEntries?: any[]
  userRole: 'provider' | 'client'
}

export function EnhancedProgressCharts({ 
  milestones, 
  timeEntries = [], 
  userRole 
}: EnhancedProgressChartsProps) {
  // Calculate progress statistics
  const totalMilestones = milestones.length
  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const inProgressMilestones = milestones.filter(m => m.status === 'in_progress').length
  const overallProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0

  // Calculate time statistics
  const totalEstimatedHours = milestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)
  const totalActualHours = timeEntries.reduce((sum, t) => sum + (t.duration || 0), 0) / 3600 // Convert seconds to hours
  const timeEfficiency = totalEstimatedHours > 0 ? Math.round((totalActualHours / totalEstimatedHours) * 100) : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overallProgress}%</div>
          <div className="text-xs text-gray-500">
            {completedMilestones} of {totalMilestones} milestones
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Milestone Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Milestone Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completed</span>
              <span className="font-medium text-green-600">{completedMilestones}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>In Progress</span>
              <span className="font-medium text-blue-600">{inProgressMilestones}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Pending</span>
              <span className="font-medium text-gray-600">
                {totalMilestones - completedMilestones - inProgressMilestones}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Tracking */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Estimated</span>
              <span className="font-medium">{totalEstimatedHours.toFixed(1)}h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Actual</span>
              <span className="font-medium">{totalActualHours.toFixed(1)}h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Efficiency</span>
              <span className={`font-medium ${timeEfficiency > 100 ? 'text-red-600' : 'text-green-600'}`}>
                {timeEfficiency}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}