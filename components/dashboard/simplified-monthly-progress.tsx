'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Clock, AlertCircle, Calendar, ToggleLeft, ToggleRight, ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Milestone } from '@/lib/progress-tracking'
import { isMilestoneOverdue } from '@/lib/progress-calculations'

interface SimplifiedMonthlyProgressProps {
  milestones: Milestone[]
  userRole: 'provider' | 'client'
}

export function SimplifiedMonthlyProgress({ milestones, userRole }: SimplifiedMonthlyProgressProps) {
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact')
  const [collapsedMilestones, setCollapsedMilestones] = useState<Set<string>>(new Set())
  
  // Sort milestones by order_index
  const sortedMilestones = [...milestones].sort((a, b) => a.order_index - b.order_index)
  const completedMilestones = sortedMilestones.filter(m => m.status === 'completed')
  const pendingMilestones = sortedMilestones.filter(m => m.status === 'pending' || m.status === 'in_progress')
  const overdueMilestones = sortedMilestones.filter(m => isMilestoneOverdue(m))

  // Auto-collapse completed milestones on component mount
  useEffect(() => {
    const completedIds = completedMilestones.map(m => m.id)
    setCollapsedMilestones(new Set(completedIds))
  }, [completedMilestones.length])

  const toggleMilestoneCollapse = (milestoneId: string) => {
    setCollapsedMilestones(prev => {
      const newSet = new Set(prev)
      if (newSet.has(milestoneId)) {
        newSet.delete(milestoneId)
      } else {
        newSet.add(milestoneId)
      }
      return newSet
    })
  }

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
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Milestones Summary</h3>
            <p className="text-sm text-gray-500 mt-1">
              {collapsedMilestones.size} collapsed, {sortedMilestones.length - collapsedMilestones.size} expanded
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const allIds = sortedMilestones.map(m => m.id)
                setCollapsedMilestones(new Set(allIds))
              }}
              className="text-xs"
            >
              Collapse All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCollapsedMilestones(new Set())}
              className="text-xs"
            >
              Expand All
            </Button>
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
        </div>
        
        <div className="divide-y divide-gray-200">
          {sortedMilestones.map((milestone) => {
            const icon = getMilestoneIcon(milestone.title)
            const isOverdue = isMilestoneOverdue(milestone)
            const isCollapsed = collapsedMilestones.has(milestone.id)
            const isCompleted = milestone.status === 'completed'
            
            return (
              <div key={milestone.id} className={`px-6 py-4 transition-colors ${
                isOverdue ? 'bg-red-50 border-l-4 border-red-500' : 
                isCompleted ? 'bg-green-50' : 
                'hover:bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Collapse/Expand Button */}
                    <button
                      onClick={() => toggleMilestoneCollapse(milestone.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium ${
                          isOverdue ? 'text-red-900' : 
                          isCompleted ? 'text-green-900' : 
                          'text-gray-900'
                        }`}>
                          {milestone.title}
                        </h4>
                        {isOverdue && (
                          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className={`text-sm line-clamp-1 ${
                        isOverdue ? 'text-red-700' : 
                        isCompleted ? 'text-green-700' : 
                        'text-gray-600'
                      }`}>
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${
                        isOverdue ? 'text-red-900' : 
                        isCompleted ? 'text-green-900' : 
                        'text-gray-900'
                      }`}>
                        {milestone.progress_percentage}%
                      </div>
                      <div className={`text-xs ${
                        isOverdue ? 'text-red-600' : 
                        isCompleted ? 'text-green-600' : 
                        'text-gray-500'
                      }`}>
                        {milestone.tasks?.filter(t => t.status === 'completed').length || 0} of {milestone.tasks?.length || 0} tasks
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`text-xs ${getStatusColor(milestone.status)}`}>
                        {milestone.status.replace('_', ' ')}
                      </Badge>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-xs flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Overdue
                        </Badge>
                      )}
                      {milestone.due_date && (
                        <div className={`text-xs ${
                          isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                        }`}>
                          Due: {new Date(milestone.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detailed View - Expanded Content */}
                {!isCollapsed && viewMode === 'detailed' && (
                  <div className="mt-4 pt-4 border-t border-gray-200 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">{milestone.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full milestone-progress-bar ${
                              isOverdue ? 'bg-red-500' : 
                              isCompleted ? 'bg-green-500' : 
                              'bg-blue-500'
                            }`}
                            style={{ width: `${milestone.progress_percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Tasks Summary */}
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Tasks</div>
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1">
                            {milestone.tasks?.slice(0, 3).map((task, index) => (
                              <div
                                key={task.id}
                                className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs ${
                                  task.status === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                                }`}
                                title={task.title}
                              >
                                {task.status === 'completed' ? '✓' : index + 1}
                              </div>
                            ))}
                            {milestone.tasks && milestone.tasks.length > 3 && (
                              <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 text-gray-600 flex items-center justify-center text-xs">
                                +{milestone.tasks.length - 3}
                              </div>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            {milestone.tasks?.filter(t => t.status === 'completed').length || 0} completed
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Last Updated */}
                    {milestone.updated_at && (
                      <div className="mt-3 text-xs text-gray-500">
                        Last updated: {new Date(milestone.updated_at).toLocaleDateString()} at {new Date(milestone.updated_at).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
