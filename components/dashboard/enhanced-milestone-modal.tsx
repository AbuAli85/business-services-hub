'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, Target, Users, AlertTriangle, CheckCircle, Plus, Copy, Save, Settings, Trash2 } from 'lucide-react'
import { ProgressTrackingService, Milestone } from '@/lib/progress-tracking'
import { getSupabaseClient } from '@/lib/supabase'

interface EnhancedMilestoneModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  bookingId: string
  editingMilestone?: Milestone | null
  userRole: 'provider' | 'client'
}

interface TaskTemplate {
  id: string
  title: string
  description: string
  estimated_hours: number
  priority: string
  tags: string[]
}

const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'research',
    title: 'Research & Analysis',
    description: 'Conduct thorough research and analysis',
    estimated_hours: 4,
    priority: 'high',
    tags: ['research', 'analysis']
  },
  {
    id: 'planning',
    title: 'Planning & Strategy',
    description: 'Develop detailed project plan and strategy',
    estimated_hours: 6,
    priority: 'high',
    tags: ['planning', 'strategy']
  },
  {
    id: 'design',
    title: 'Design & Prototyping',
    description: 'Create designs and prototypes',
    estimated_hours: 8,
    priority: 'medium',
    tags: ['design', 'prototype']
  },
  {
    id: 'development',
    title: 'Development & Implementation',
    description: 'Implement the solution',
    estimated_hours: 16,
    priority: 'high',
    tags: ['development', 'implementation']
  },
  {
    id: 'testing',
    title: 'Testing & Quality Assurance',
    description: 'Test and ensure quality',
    estimated_hours: 4,
    priority: 'high',
    tags: ['testing', 'qa']
  },
  {
    id: 'deployment',
    title: 'Deployment & Launch',
    description: 'Deploy and launch the solution',
    estimated_hours: 2,
    priority: 'medium',
    tags: ['deployment', 'launch']
  }
]

export function EnhancedMilestoneModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  bookingId, 
  editingMilestone,
  userRole 
}: EnhancedMilestoneModalProps) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'templates'>('basic')
  
  // Basic milestone data
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')
  const [weight, setWeight] = useState(1.0)
  
  // Advanced features
  const [assignedTo, setAssignedTo] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [estimatedHours, setEstimatedHours] = useState(0)
  const [dependencies, setDependencies] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  
  // Template tasks
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [customTasks, setCustomTasks] = useState<Array<{
    title: string
    description: string
    estimated_hours: number
    priority: string
  }>>([])

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (editingMilestone) {
      setTitle(editingMilestone.title)
      setDescription(editingMilestone.description || '')
      setDueDate(editingMilestone.due_date ? new Date(editingMilestone.due_date).toISOString().split('T')[0] : '')
      setPriority(editingMilestone.priority)
      setWeight(editingMilestone.weight || 1.0)
      setEstimatedHours(editingMilestone.estimated_hours || 0)
      setTags(editingMilestone.tags || [])
      setNotes(editingMilestone.notes || '')
    } else {
      resetForm()
    }
  }, [editingMilestone])

  const loadUser = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setDueDate('')
    setPriority('medium')
    setWeight(1.0)
    setAssignedTo('')
    setTags([])
    setNewTag('')
    setEstimatedHours(0)
    setDependencies([])
    setNotes('')
    setSelectedTemplates([])
    setCustomTasks([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setLoading(true)
      
      const milestoneData = {
        booking_id: bookingId,
        title,
        description,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        priority,
        weight,
        assigned_to: assignedTo || null,
        tags,
        estimated_hours: estimatedHours,
        notes,
        created_by: user.id
      }

      if (editingMilestone) {
        await ProgressTrackingService.updateMilestone(editingMilestone.id, milestoneData)
      } else {
        const milestone = await ProgressTrackingService.createMilestone(milestoneData)
        
        // Create tasks from templates
        for (const templateId of selectedTemplates) {
          const template = TASK_TEMPLATES.find(t => t.id === templateId)
          if (template) {
            await ProgressTrackingService.createTask({
              milestone_id: milestone.id,
              title: template.title,
              description: template.description,
              estimated_hours: template.estimated_hours,
              priority: template.priority,
              tags: template.tags,
              created_by: user.id
            })
          }
        }
        
        // Create custom tasks
        for (const task of customTasks) {
          await ProgressTrackingService.createTask({
            milestone_id: milestone.id,
            title: task.title,
            description: task.description,
            estimated_hours: task.estimated_hours,
            priority: task.priority,
            created_by: user.id
          })
        }
      }

      onSuccess()
      onClose()
      resetForm()
    } catch (error) {
      console.error('Error saving milestone:', error)
    } finally {
      setLoading(false)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    )
  }

  const addCustomTask = () => {
    setCustomTasks([...customTasks, {
      title: '',
      description: '',
      estimated_hours: 1,
      priority: 'medium'
    }])
  }

  const updateCustomTask = (index: number, field: string, value: any) => {
    setCustomTasks(prev => prev.map((task, i) => 
      i === index ? { ...task, [field]: value } : task
    ))
  }

  const removeCustomTask = (index: number) => {
    setCustomTasks(prev => prev.filter((_, i) => i !== index))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {editingMilestone ? 'Edit Milestone' : 'Create Milestone'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'basic', label: 'Basic Info', icon: Target },
              { id: 'advanced', label: 'Advanced', icon: Settings },
              { id: 'templates', label: 'Task Templates', icon: Copy }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6">
            {/* Basic Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter milestone title"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the milestone..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={weight}
                      onChange={(e) => setWeight(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-blue-600 hover:text-blue-800"
                          aria-label={`Remove ${tag} tag`}
                          title={`Remove ${tag} tag`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add a tag..."
                      aria-label="Add a new tag"
                      title="Add a new tag"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Task Templates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {TASK_TEMPLATES.map(template => (
                      <div
                        key={template.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedTemplates.includes(template.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => toggleTemplate(template.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{template.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>{template.estimated_hours}h</span>
                              <span className="capitalize">{template.priority}</span>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedTemplates.includes(template.id)
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedTemplates.includes(template.id) && (
                              <CheckCircle className="h-3 w-3 text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Custom Tasks</h3>
                    <button
                      type="button"
                      onClick={addCustomTask}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add Task
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {customTasks.map((task, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Task Title
                            </label>
                            <input
                              type="text"
                              value={task.title}
                              onChange={(e) => updateCustomTask(index, 'title', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter task title"
                              aria-label={`Task ${index + 1} title`}
                              title={`Task ${index + 1} title`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Priority
                            </label>
                            <select
                              value={task.priority}
                              onChange={(e) => updateCustomTask(index, 'priority', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label={`Task ${index + 1} priority`}
                              title={`Task ${index + 1} priority`}
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                                                      <textarea
                              value={task.description}
                              onChange={(e) => updateCustomTask(index, 'description', e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter task description"
                              aria-label={`Task ${index + 1} description`}
                              title={`Task ${index + 1} description`}
                            />
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Hours
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={task.estimated_hours}
                                onChange={(e) => updateCustomTask(index, 'estimated_hours', parseFloat(e.target.value))}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label={`Task ${index + 1} estimated hours`}
                                title={`Task ${index + 1} estimated hours`}
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCustomTask(index)}
                            className="text-red-600 hover:text-red-800"
                            aria-label={`Remove custom task ${index + 1}`}
                            title={`Remove custom task ${index + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editingMilestone ? 'Update Milestone' : 'Create Milestone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
