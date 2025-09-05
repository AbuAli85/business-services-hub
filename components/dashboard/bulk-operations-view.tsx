'use client'

import { useState } from 'react'
import './progress-styles.css'
import { Filter, MoreHorizontal, Edit, Trash2, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Milestone, Task } from '@/types/progress'
import { isTaskOverdue } from '@/lib/progress-calculations'

interface BulkOperationsViewProps {
  milestones: Milestone[]
  userRole: 'provider' | 'client'
  onUpdate: () => void
}

export function BulkOperationsView({ milestones, userRole, onUpdate }: BulkOperationsViewProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Sort milestones by order_index and get all tasks
  const sortedMilestones = [...milestones].sort((a, b) => a.order_index - b.order_index)
  const allTasks = sortedMilestones.flatMap(milestone => 
    (milestone.tasks || []).map(task => ({
      ...task,
      milestone_title: milestone.title,
      milestone_id: milestone.id
    }))
  )

  // Filter tasks based on status, priority, and search term
  const filteredTasks = allTasks.filter(task => {
    const statusMatch = statusFilter === 'all' || task.status === statusFilter
    const priorityMatch = priorityFilter === 'all' || 'normal' === priorityFilter // Assuming normal priority for now
    const searchMatch = searchTerm === '' || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.milestone_title.toLowerCase().includes(searchTerm.toLowerCase())
    return statusMatch && priorityMatch && searchMatch
  })

  const handleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(filteredTasks.map(task => task.id)))
    }
  }

  const handleSelectTask = (taskId: string) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId)
    } else {
      newSelected.add(taskId)
    }
    setSelectedTasks(newSelected)
  }

  const handleBulkAction = async (action: string) => {
    if (selectedTasks.size === 0) return
    
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Here you would make actual API calls based on the action
      console.log(`Performing ${action} on ${selectedTasks.size} tasks:`, Array.from(selectedTasks))
      
      // Call the parent update function
      onUpdate()
      
      // Clear selection after action
      setSelectedTasks(new Set())
    } catch (error) {
      console.error('Bulk action failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-gray-600">
              Select All ({selectedTasks.size}/{filteredTasks.length})
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Search Box */}
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filter by priority"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedTasks.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm text-blue-700">
              {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkAction('mark_complete')}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Mark Complete'}
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkAction('change_priority')}
                disabled={isLoading}
              >
                Change Priority
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkAction('assign')}
                disabled={isLoading}
              >
                Assign
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => handleBulkAction('delete')}
                disabled={isLoading}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tasks Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Milestone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.map((task) => {
                const isOverdue = task.due_date && isTaskOverdue(task)
                
                return (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Checkbox
                          checked={selectedTasks.has(task.id)}
                          onCheckedChange={() => handleSelectTask(task.id)}
                          className="mr-3"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{task.title}</div>
                          {isOverdue && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertCircle className="h-3 w-3 text-red-500" />
                              <span className="text-xs text-red-600">Overdue</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{task.milestone_title}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Badge className={`text-xs ${getPriorityColor('normal')}`}>
                        normal
                      </Badge>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`bg-blue-600 h-2 rounded-full transition-all duration-300 ${
                              task.progress_percentage >= 100 ? 'progress-bar-100' :
                              task.progress_percentage >= 95 ? 'progress-bar-95' :
                              task.progress_percentage >= 90 ? 'progress-bar-90' :
                              task.progress_percentage >= 85 ? 'progress-bar-85' :
                              task.progress_percentage >= 80 ? 'progress-bar-80' :
                              task.progress_percentage >= 75 ? 'progress-bar-75' :
                              task.progress_percentage >= 70 ? 'progress-bar-70' :
                              task.progress_percentage >= 65 ? 'progress-bar-65' :
                              task.progress_percentage >= 60 ? 'progress-bar-60' :
                              task.progress_percentage >= 55 ? 'progress-bar-55' :
                              task.progress_percentage >= 50 ? 'progress-bar-50' :
                              task.progress_percentage >= 45 ? 'progress-bar-45' :
                              task.progress_percentage >= 40 ? 'progress-bar-40' :
                              task.progress_percentage >= 35 ? 'progress-bar-35' :
                              task.progress_percentage >= 30 ? 'progress-bar-30' :
                              task.progress_percentage >= 25 ? 'progress-bar-25' :
                              task.progress_percentage >= 20 ? 'progress-bar-20' :
                              task.progress_percentage >= 15 ? 'progress-bar-15' :
                              task.progress_percentage >= 10 ? 'progress-bar-10' :
                              task.progress_percentage >= 5 ? 'progress-bar-5' : 'progress-bar-0'
                            }`}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{task.progress_percentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">0h / 0h</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
