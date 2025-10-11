'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  Edit,
  MoreHorizontal,
  CheckSquare,
  X
} from 'lucide-react'
import { Milestone, Task } from '@/types/progress'
import { isBefore } from 'date-fns'
import { safeFormatDate } from '@/lib/date-utils'
import { toast } from 'sonner'

interface BulkOperationsViewProps {
  milestones: Milestone[]
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
  onTaskDelete: (taskId: string) => Promise<void>
  onMilestoneUpdate: (milestoneId: string, updates: Partial<Milestone>) => Promise<void>
}

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
type BulkAction = 'mark_complete' | 'mark_pending' | 'change_priority' | 'delete' | 'export'

export function BulkOperationsView({
  milestones,
  onTaskUpdate,
  onTaskDelete,
  onMilestoneUpdate
}: BulkOperationsViewProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<BulkAction | ''>('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('normal')
  const [showFilters, setShowFilters] = useState(false)

  // Get all tasks from milestones
  const allTasks = useMemo(() => {
    return milestones.flatMap(milestone => 
      (milestone.tasks || []).map(task => ({
        ...task,
        milestoneTitle: milestone.title,
        milestoneId: milestone.id
      }))
    )
  }, [milestones])

  // Filter tasks based on search and filters
  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      const matchesSearch = (task.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (task.milestoneTitle || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
      
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [allTasks, searchTerm, statusFilter, priorityFilter])

  // Handle select all
  const handleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(filteredTasks.map(task => task.id)))
    }
  }

  // Handle individual task selection
  const handleTaskSelect = (taskId: string) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId)
    } else {
      newSelected.add(taskId)
    }
    setSelectedTasks(newSelected)
  }

  // Handle bulk actions
  const handleBulkAction = async () => {
    if (selectedTasks.size === 0) {
      toast.error('Please select tasks to perform bulk actions')
      return
    }

    try {
      const selectedTasksArray = Array.from(selectedTasks)
      
      switch (bulkAction) {
        case 'mark_complete':
          for (const taskId of selectedTasksArray) {
            await onTaskUpdate(taskId, { 
              status: 'completed',
              completed_at: new Date().toISOString()
            })
          }
          toast.success(`${selectedTasksArray.length} tasks marked as completed`)
          break

        case 'mark_pending':
          for (const taskId of selectedTasksArray) {
            await onTaskUpdate(taskId, { status: 'pending' })
          }
          toast.success(`${selectedTasksArray.length} tasks marked as pending`)
          break

        case 'change_priority':
          for (const taskId of selectedTasksArray) {
            await onTaskUpdate(taskId, { priority: newPriority })
          }
          toast.success(`${selectedTasksArray.length} tasks priority updated`)
          break

        case 'delete':
          for (const taskId of selectedTasksArray) {
            await onTaskDelete(taskId)
          }
          toast.success(`${selectedTasksArray.length} tasks deleted`)
          break

        case 'export':
          exportSelectedTasks()
          break

        default:
          toast.error('Please select a bulk action')
          return
      }

      setSelectedTasks(new Set())
      setBulkAction('')
    } catch (error) {
      console.error('Error performing bulk action:', error)
      toast.error('Failed to perform bulk action')
    }
  }

  // Export selected tasks to CSV
  const exportSelectedTasks = () => {
    const selectedTasksData = filteredTasks.filter(task => selectedTasks.has(task.id))
    
    const csvContent = [
      ['Task Title', 'Milestone', 'Status', 'Priority', 'Progress %', 'Due Date', 'Estimated Hours', 'Actual Hours'],
      ...selectedTasksData.map(task => [
        task.title,
        task.milestoneTitle,
        task.status,
        task.priority,
        (task.progress_percentage || 0).toString(), // ✅ Fixed: Use progress_percentage
        task.due_date || '',
        (task.estimated_hours || 0).toString(),
        (task.actual_hours || 0).toString()
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tasks-export-${safeFormatDate(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('Tasks exported successfully')
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'on_hold':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'normal':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Check if task is overdue
  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') {
      return false
    }
    return isBefore(new Date(task.due_date), new Date())
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center space-x-2">
            <MoreHorizontal className="h-5 w-5" />
            <span>Bulk Operations</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Priority</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter('all')
                    setPriorityFilter('all')
                    setSearchTerm('')
                  }}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          )}

          {/* Bulk Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handleSelectAll}
                className="flex items-center space-x-2"
              >
                <CheckSquare className="h-4 w-4" />
                <span>
                  {selectedTasks.size === filteredTasks.length ? 'Deselect All' : 'Select All'}
                </span>
              </Button>
              
              <span className="text-sm text-gray-600">
                {selectedTasks.size} of {filteredTasks.length} selected
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Select value={bulkAction} onValueChange={(value) => setBulkAction(value as BulkAction)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select action..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mark_complete">Mark as Complete</SelectItem>
                  <SelectItem value="mark_pending">Mark as Pending</SelectItem>
                  <SelectItem value="change_priority">Change Priority</SelectItem>
                  <SelectItem value="delete">Delete Tasks</SelectItem>
                  <SelectItem value="export">Export to CSV</SelectItem>
                </SelectContent>
              </Select>

              {bulkAction === 'change_priority' && (
                <Select value={newPriority} onValueChange={(value) => setNewPriority(value as TaskPriority)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Button
                onClick={handleBulkAction}
                disabled={selectedTasks.size === 0 || !bulkAction}
                className="flex items-center space-x-2"
              >
                {bulkAction === 'export' ? (
                  <Download className="h-4 w-4" />
                ) : bulkAction === 'delete' ? (
                  <Trash2 className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <span>Execute</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardContent className="p-0">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No tasks found</p>
              <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <Checkbox
                        checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Task</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Milestone</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Priority</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Progress</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Due Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTasks.map((task) => {
                    const overdue = isOverdue(task)
                    
                    return (
                      <tr
                        key={task.id}
                        className={`hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedTasks.has(task.id)}
                            onCheckedChange={() => handleTaskSelect(task.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{task.title}</span>
                            {overdue && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-900">{task.milestoneTitle}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={getStatusColor(task.status)}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={getPriorityColor(task.priority || 'normal')}>
                            {task.priority || 'normal'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${task.progress_percentage || 0}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">{task.progress_percentage || 0}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-900">
                            {task.due_date ? safeFormatDate(task.due_date, 'MMM dd, yyyy') : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            <div>Est: {task.estimated_hours || 0}h</div>
                            <div>Act: {task.actual_hours || 0}h</div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}