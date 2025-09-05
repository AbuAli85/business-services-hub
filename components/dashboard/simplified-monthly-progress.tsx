'use client'

import { useState } from 'react'
import { CheckCircle, Clock, AlertCircle, Calendar, ToggleLeft, ToggleRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Milestone } from '@/types/progress'
import { isMilestoneOverdue } from '@/lib/progress-calculations'

interface SimplifiedMonthlyProgressProps {
  milestones: Milestone[]
  userRole: 'provider' | 'client'
}

export function SimplifiedMonthlyProgress({ milestones, userRole }: SimplifiedMonthlyProgressProps) {
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact')
  
  // Sort milestones by order_index
  const sortedMilestones = [...milestones].sort((a, b) => a.order_index - b.order_index)
  const completedMilestones = sortedMilestones.filter(m => m.status === 'completed')
  const pendingMilestones = sortedMilestones.filter(m => m.status === 'pending' || m.status === 'in_progress')
  const overdueMilestones = sortedMilestones.filter(m => isMilestoneOverdue(m))

  const getMilestoneIcon = (title: string) => {
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes('planning') || lowerTitle.includes('plan')) return '📋'
    if (lowerTitle.includes('development') || lowerTitle.includes('dev')) return '⚙️'
    if (lowerTitle.includes('testing') || lowerTitle.includes('test')) return '🧪'
    if (lowerTitle.includes('delivery') || lowerTitle.includes('deploy')) return '🚀'
    return '📌'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'on_hold': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-600">{completedMilestones.length}</div>
              <div className="text-sm text-green-700">Completed Milestones</div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div>
              <div className="text-2xl font-bold text-yellow-600">{pendingMilestones.length}</div>
              <div className="text-sm text-yellow-700">Pending Milestones</div>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <div>
              <div className="text-2xl font-bold text-red-600">{overdueMilestones.length}</div>
              <div className="text-sm text-red-700">Overdue Milestones</div>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones Summary Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Milestones Summary</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'compact' ? 'detailed' : 'compact')}
            className="flex items-center gap-2"
          >
            {viewMode === 'compact' ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
            {viewMode === 'compact' ? 'Detailed View' : 'Compact View'}
          </Button>
        </div>
        
        <div className="divide-y divide-gray-200">
          {sortedMilestones.map((milestone) => {
            const icon = getMilestoneIcon(milestone.title)
            const isOverdue = isMilestoneOverdue(milestone)
            
            return (
              <div key={milestone.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                      <p className="text-sm text-gray-600 line-clamp-1">{milestone.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">{milestone.progress_percentage}%</div>
                      <div className="text-xs text-gray-500">
                        {milestone.tasks?.filter(t => t.status === 'completed').length || 0} of {milestone.tasks?.length || 0} tasks
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`text-xs ${getStatusColor(milestone.status)}`}>
                        {milestone.status.replace('_', ' ')}
                      </Badge>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-xs">
                          Overdue
                        </Badge>
                      )}
                      {milestone.due_date && (
                        <div className="text-xs text-gray-500">
                          Due: {new Date(milestone.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
