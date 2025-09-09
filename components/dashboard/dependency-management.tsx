'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { 
  Link, 
  Unlink, 
  ArrowRight, 
  ArrowDown, 
  ArrowUp, 
  GitBranch, 
  GitCommit,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Settings,
  Workflow
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  Milestone, 
  Task, 
  MilestoneDependency, 
  TaskDependency 
} from '@/types/milestone-system'

interface DependencyManagementProps {
  bookingId: string
  milestones: Milestone[]
  tasks: Task[]
  onDependencyCreated?: (dependency: any) => void
  onDependencyUpdated?: (dependency: any) => void
  onDependencyDeleted?: (dependencyId: string) => void
}

export function DependencyManagement({ 
  bookingId, 
  milestones, 
  tasks, 
  onDependencyCreated,
  onDependencyUpdated,
  onDependencyDeleted
}: DependencyManagementProps) {
  const [activeTab, setActiveTab] = useState<'milestones' | 'tasks'>('milestones')
  const [showDependencyForm, setShowDependencyForm] = useState(false)
  const [editingDependency, setEditingDependency] = useState<MilestoneDependency | TaskDependency | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Dependency form state
  const [dependencyForm, setDependencyForm] = useState({
    source_id: '',
    depends_on_id: '',
    dependency_type: 'finish_to_start' as 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish',
    lag_days: 0
  })

  const resetForm = () => {
    setDependencyForm({
      source_id: '',
      depends_on_id: '',
      dependency_type: 'finish_to_start',
      lag_days: 0
    })
    setEditingDependency(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      
      if (activeTab === 'milestones') {
        // Create/update milestone dependency
        const dependencyData = {
          milestone_id: dependencyForm.source_id,
          depends_on_milestone_id: dependencyForm.depends_on_id,
          dependency_type: dependencyForm.dependency_type,
          lag_days: dependencyForm.lag_days
        }
        
        console.log('Creating milestone dependency:', dependencyData)
        toast.success('Milestone dependency created successfully')
        onDependencyCreated?.(dependencyData)
      } else {
        // Create/update task dependency
        const dependencyData = {
          task_id: dependencyForm.source_id,
          depends_on_task_id: dependencyForm.depends_on_id,
          dependency_type: dependencyForm.dependency_type,
          lag_days: dependencyForm.lag_days
        }
        
        console.log('Creating task dependency:', dependencyData)
        toast.success('Task dependency created successfully')
        onDependencyCreated?.(dependencyData)
      }
      
      setShowDependencyForm(false)
      resetForm()
    } catch (error) {
      console.error('Dependency creation error:', error)
      toast.error('Failed to create dependency')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (dependency: MilestoneDependency | TaskDependency) => {
    setEditingDependency(dependency)
    setDependencyForm({
      source_id: 'milestone_id' in dependency ? dependency.milestone_id : dependency.task_id,
      depends_on_id: 'depends_on_milestone_id' in dependency ? dependency.depends_on_milestone_id : dependency.depends_on_task_id,
      dependency_type: dependency.dependency_type,
      lag_days: dependency.lag_days
    })
    setShowDependencyForm(true)
  }

  const handleDelete = async (dependencyId: string) => {
    if (confirm('Are you sure you want to delete this dependency?')) {
      try {
        console.log('Deleting dependency:', dependencyId)
        toast.success('Dependency deleted successfully')
        onDependencyDeleted?.(dependencyId)
      } catch (error) {
        console.error('Dependency deletion error:', error)
        toast.error('Failed to delete dependency')
      }
    }
  }

  const getDependencyIcon = (type: string) => {
    switch (type) {
      case 'finish_to_start': return <ArrowRight className="h-4 w-4" />
      case 'start_to_start': return <ArrowUp className="h-4 w-4" />
      case 'finish_to_finish': return <ArrowDown className="h-4 w-4" />
      case 'start_to_finish': return <ArrowRight className="h-4 w-4 rotate-180" />
      default: return <ArrowRight className="h-4 w-4" />
    }
  }

  const getDependencyLabel = (type: string) => {
    switch (type) {
      case 'finish_to_start': return 'Finish to Start'
      case 'start_to_start': return 'Start to Start'
      case 'finish_to_finish': return 'Finish to Finish'
      case 'start_to_finish': return 'Start to Finish'
      default: return type
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Dependency Management</h2>
          <p className="text-gray-600">Manage milestone and task dependencies</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowDependencyForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Dependency
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('milestones')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'milestones'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <GitBranch className="h-4 w-4 mr-2 inline" />
          Milestone Dependencies
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'tasks'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <GitCommit className="h-4 w-4 mr-2 inline" />
          Task Dependencies
        </button>
      </div>

      {/* Milestone Dependencies */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          {milestones.map((milestone) => (
            <Card key={milestone.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{milestone.title}</h3>
                    <Badge className={getStatusColor(milestone.status)}>
                      {milestone.status.replace('_', ' ')}
                    </Badge>
                    {milestone.critical_path && (
                      <Badge className="bg-red-100 text-red-800">
                        Critical Path
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    {milestone.start_date} - {milestone.due_date}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {milestone.progress_percentage}% Complete
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Dependencies */}
                {milestone.dependencies && milestone.dependencies.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Depends On</h4>
                    <div className="space-y-2">
                      {milestone.dependencies.map((dep) => (
                        <div key={dep.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getDependencyIcon(dep.dependency_type)}
                            <div>
                              <p className="font-medium text-gray-900">{dep.depends_on_milestone.title}</p>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Badge variant="outline" className="text-xs">
                                  {getDependencyLabel(dep.dependency_type)}
                                </Badge>
                                {dep.lag_days > 0 && (
                                  <span>+{dep.lag_days} days</span>
                                )}
                                <Badge className={getStatusColor(dep.depends_on_milestone.status)}>
                                  {dep.depends_on_milestone.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(dep)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(dep.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dependents */}
                {milestone.dependents && milestone.dependents.length > 0 && (
                  <div className="space-y-3 mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium text-gray-700">Required By</h4>
                    <div className="space-y-2">
                      {milestone.dependents.map((dep) => (
                        <div key={dep.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getDependencyIcon(dep.dependency_type)}
                            <div>
                              <p className="font-medium text-gray-900">{dep.milestone_id}</p>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Badge variant="outline" className="text-xs">
                                  {getDependencyLabel(dep.dependency_type)}
                                </Badge>
                                {dep.lag_days > 0 && (
                                  <span>+{dep.lag_days} days</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!milestone.dependencies || milestone.dependencies.length === 0) && 
                 (!milestone.dependents || milestone.dependents.length === 0) && (
                  <div className="text-center py-6 text-gray-500">
                    <GitBranch className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No dependencies configured</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDependencyForm(prev => ({ ...prev, source_id: milestone.id }))
                        setShowDependencyForm(true)
                      }}
                      className="mt-2"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Dependency
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Task Dependencies */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    {task.start_date} - {task.due_date}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {task.progress_percentage}% Complete
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Dependencies */}
                {task.dependencies && task.dependencies.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Depends On</h4>
                    <div className="space-y-2">
                      {task.dependencies.map((dep) => (
                        <div key={dep.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getDependencyIcon(dep.dependency_type)}
                            <div>
                              <p className="font-medium text-gray-900">{dep.depends_on_task.title}</p>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Badge variant="outline" className="text-xs">
                                  {getDependencyLabel(dep.dependency_type)}
                                </Badge>
                                {dep.lag_days > 0 && (
                                  <span>+{dep.lag_days} days</span>
                                )}
                                <Badge className={getStatusColor(dep.depends_on_task.status)}>
                                  {dep.depends_on_task.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(dep)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(dep.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!task.dependencies || task.dependencies.length === 0) && (
                  <div className="text-center py-6 text-gray-500">
                    <GitCommit className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No dependencies configured</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDependencyForm(prev => ({ ...prev, source_id: task.id }))
                        setShowDependencyForm(true)
                      }}
                      className="mt-2"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Dependency
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dependency Form Dialog */}
      <Dialog open={showDependencyForm} onOpenChange={(open: boolean) => {
        if (!open) {
          setShowDependencyForm(false)
          setEditingDependency(null)
          setIsSubmitting(false)
          resetForm()
        }
      }}>
        <DialogContent 
          className="max-w-2xl"
          onClose={() => {
            setShowDependencyForm(false)
            setEditingDependency(null)
            setIsSubmitting(false)
            resetForm()
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingDependency ? 'Edit Dependency' : 'Add New Dependency'}
              {activeTab === 'milestones' ? ' (Milestone)' : ' (Task)'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {activeTab === 'milestones' ? 'Milestone' : 'Task'} *
                </label>
                <Select
                  value={dependencyForm.source_id}
                  onValueChange={(value) => setDependencyForm({...dependencyForm, source_id: value})}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${activeTab === 'milestones' ? 'milestone' : 'task'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {(activeTab === 'milestones' ? milestones : tasks).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Depends On *</label>
                <Select
                  value={dependencyForm.depends_on_id}
                  onValueChange={(value) => setDependencyForm({...dependencyForm, depends_on_id: value})}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${activeTab === 'milestones' ? 'milestone' : 'task'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {(activeTab === 'milestones' ? milestones : tasks)
                      .filter(item => item.id !== dependencyForm.source_id)
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Dependency Type *</label>
                <Select
                  value={dependencyForm.dependency_type}
                  onValueChange={(value) => setDependencyForm({...dependencyForm, dependency_type: value as any})}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="finish_to_start">Finish to Start</SelectItem>
                    <SelectItem value="start_to_start">Start to Start</SelectItem>
                    <SelectItem value="finish_to_finish">Finish to Finish</SelectItem>
                    <SelectItem value="start_to_finish">Start to Finish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Lag Days</label>
                <Input
                  type="number"
                  value={dependencyForm.lag_days}
                  onChange={(e) => setDependencyForm({...dependencyForm, lag_days: parseInt(e.target.value) || 0})}
                  disabled={isSubmitting}
                  min="0"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowDependencyForm(false)
                  setEditingDependency(null)
                  setIsSubmitting(false)
                  resetForm()
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (editingDependency ? 'Update' : 'Create') + ' Dependency'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
