'use client'

import { useState, useEffect } from 'react'
import { CheckSquare, Square, Trash2, Edit, Clock, Tag, Filter, Download } from 'lucide-react'
import { ProgressTrackingService } from '@/lib/progress-tracking'

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

interface BulkOperationsProps {
  milestones: Milestone[]
  onUpdate: () => void
  userRole: 'provider' | 'client'
}

export function BulkOperations({ milestones, onUpdate, userRole }: BulkOperationsProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<string>('')
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  // Get all tasks from milestones
  const allTasks = milestones.flatMap(milestone => 
    (milestone.tasks || []).map(task => ({
      ...task,
      milestone_title: milestone.title,
      milestone_id: milestone.id
    }))
  )

  // Filter tasks based on current filters
  const filteredTasks = allTasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false
    // Priority filtering not available in current structure
    return true
  })

  const handleSelectAll = () => {
    if (selectedItems.size === filteredTasks.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredTasks.map(task => task.id)))
    }
  }

  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handleBulkAction = async () => {
    if (!bulkAction || selectedItems.size === 0) return

    try {
      setLoading(true)
      const selectedTasks = filteredTasks.filter(task => selectedItems.has(task.id))

      switch (bulkAction) {
        case 'delete':
          await Promise.all(selectedTasks.map(task => 
            ProgressTrackingService.deleteTask(task.id)
          ))
          break
        case 'status_pending':
          await Promise.all(selectedTasks.map(task => 
            ProgressTrackingService.updateTask(task.id, { status: 'pending' })
          ))
          break
        case 'status_in_progress':
          await Promise.all(selectedTasks.map(task => 
            ProgressTrackingService.updateTask(task.id, { status: 'in_progress' })
          ))
          break
        case 'status_completed':
          await Promise.all(selectedTasks.map(task => 
            ProgressTrackingService.updateTask(task.id, { status: 'completed' })
          ))
          break
        case 'priority_high':
          await Promise.all(selectedTasks.map(task => 
            ProgressTrackingService.updateTask(task.id, { priority: 'high' })
          ))
          break
        case 'priority_medium':
          await Promise.all(selectedTasks.map(task => 
            ProgressTrackingService.updateTask(task.id, { priority: 'medium' })
          ))
          break
        case 'priority_low':
          await Promise.all(selectedTasks.map(task => 
            ProgressTrackingService.updateTask(task.id, { priority: 'low' })
          ))
          break
      }

      setSelectedItems(new Set())
      setBulkAction('')
      setShowBulkModal(false)
      onUpdate()
    } catch (error) {
      console.error('Error performing bulk action:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportSelected = () => {
    const selectedTasks = filteredTasks.filter(task => selectedItems.has(task.id))
    const data = {
      tasks: selectedTasks,
      exportDate: new Date().toISOString(),
      totalTasks: selectedTasks.length
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tasks-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (userRole === 'client') {
    return null // Clients don't get bulk operations
  }

  return (
    <div className="space-y-4">
      {/* Filters and Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Select All */}
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            {selectedItems.size === filteredTasks.length ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            Select All ({selectedItems.size}/{filteredTasks.length})
          </button>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filter by status"
              title="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filter by priority"
              title="Filter by priority"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                <Edit className="h-4 w-4" />
                Bulk Actions ({selectedItems.size})
              </button>

              <button
                onClick={exportSelected}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      <input
                      type="checkbox"
                      checked={selectedItems.size === filteredTasks.length && filteredTasks.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      aria-label="Select all tasks"
                      title="Select all tasks"
                    />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Milestone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(task.id)}
                      onChange={() => handleSelectItem(task.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      aria-label={`Select task: ${task.title}`}
                      title={`Select task: ${task.title}`}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{task.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">Task</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.milestone_title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      normal
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${task.progress_percentage || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500">{task.progress_percentage || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    0h / 0h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Action Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Bulk Actions ({selectedItems.size} items selected)
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action
                  </label>
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Select bulk action"
                    title="Select bulk action"
                  >
                    <option value="">Select an action...</option>
                    <option value="status_pending">Set Status to Pending</option>
                    <option value="status_in_progress">Set Status to In Progress</option>
                    <option value="status_completed">Set Status to Completed</option>
                    <option value="priority_high">Set Priority to High</option>
                    <option value="priority_medium">Set Priority to Medium</option>
                    <option value="priority_low">Set Priority to Low</option>
                    <option value="delete">Delete Selected Tasks</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkAction || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Apply Action'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
