'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Brain, 
  Zap, 
  Target, 
  Clock, 
  Star, 
  Plus,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Lightbulb
} from 'lucide-react'

interface SmartTaskGeneratorProps {
  milestoneTitle: string
  milestoneDescription?: string
  existingTasks: any[]
  onTasksGenerated: (tasks: any[]) => void
  onCancel: () => void
}

interface TaskTemplate {
  title: string
  description: string
  estimated_hours: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  dependencies?: string[]
}

export function SmartTaskGenerator({
  milestoneTitle,
  milestoneDescription,
  existingTasks,
  onTasksGenerated,
  onCancel
}: SmartTaskGeneratorProps) {
  const [generatedTasks, setGeneratedTasks] = useState<TaskTemplate[]>([])
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set())
  const [customTask, setCustomTask] = useState({
    title: '',
    description: '',
    estimated_hours: 4,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  })
  const [showCustomForm, setShowCustomForm] = useState(false)

  // Smart task generation based on milestone context
  const generateSmartTasks = () => {
    const tasks: TaskTemplate[] = []
    const title = milestoneTitle.toLowerCase()
    const description = milestoneDescription?.toLowerCase() || ''

    // Development-related tasks
    if (title.includes('development') || title.includes('coding') || title.includes('programming')) {
      tasks.push(
        { title: 'Code review and quality check', description: 'Review code for best practices and quality', estimated_hours: 4, priority: 'high', category: 'development' },
        { title: 'Unit testing implementation', description: 'Write and execute unit tests', estimated_hours: 6, priority: 'medium', category: 'development' },
        { title: 'Documentation update', description: 'Update technical documentation', estimated_hours: 3, priority: 'low', category: 'development' },
        { title: 'Performance optimization', description: 'Optimize code performance and efficiency', estimated_hours: 5, priority: 'medium', category: 'development' }
      )
    }

    // Design-related tasks
    if (title.includes('design') || title.includes('ui') || title.includes('ux')) {
      tasks.push(
        { title: 'User research analysis', description: 'Analyze user feedback and requirements', estimated_hours: 4, priority: 'high', category: 'design' },
        { title: 'Wireframe creation', description: 'Create detailed wireframes', estimated_hours: 8, priority: 'high', category: 'design' },
        { title: 'Prototype development', description: 'Build interactive prototype', estimated_hours: 12, priority: 'medium', category: 'design' },
        { title: 'Design system documentation', description: 'Document design patterns and components', estimated_hours: 4, priority: 'low', category: 'design' }
      )
    }

    // Marketing-related tasks
    if (title.includes('marketing') || title.includes('promotion') || title.includes('campaign')) {
      tasks.push(
        { title: 'Market research', description: 'Research target audience and competitors', estimated_hours: 6, priority: 'high', category: 'marketing' },
        { title: 'Content strategy', description: 'Develop content marketing strategy', estimated_hours: 4, priority: 'high', category: 'marketing' },
        { title: 'Social media planning', description: 'Plan social media campaigns', estimated_hours: 5, priority: 'medium', category: 'marketing' },
        { title: 'Analytics setup', description: 'Set up tracking and analytics', estimated_hours: 3, priority: 'medium', category: 'marketing' }
      )
    }

    // Testing-related tasks
    if (title.includes('testing') || title.includes('qa') || title.includes('quality')) {
      tasks.push(
        { title: 'Test plan creation', description: 'Create comprehensive test plan', estimated_hours: 4, priority: 'high', category: 'testing' },
        { title: 'Automated testing setup', description: 'Set up automated testing pipeline', estimated_hours: 8, priority: 'medium', category: 'testing' },
        { title: 'Manual testing execution', description: 'Execute manual test cases', estimated_hours: 12, priority: 'high', category: 'testing' },
        { title: 'Bug tracking and resolution', description: 'Track and resolve identified issues', estimated_hours: 10, priority: 'high', category: 'testing' }
      )
    }

    // Planning-related tasks
    if (title.includes('planning') || title.includes('setup') || title.includes('initial')) {
      tasks.push(
        { title: 'Requirements gathering', description: 'Collect and document all requirements', estimated_hours: 6, priority: 'high', category: 'planning' },
        { title: 'Resource allocation', description: 'Plan and allocate necessary resources', estimated_hours: 3, priority: 'medium', category: 'planning' },
        { title: 'Timeline creation', description: 'Create detailed project timeline', estimated_hours: 4, priority: 'medium', category: 'planning' },
        { title: 'Risk assessment', description: 'Identify and plan for potential risks', estimated_hours: 3, priority: 'medium', category: 'planning' }
      )
    }

    // Generic tasks for any milestone
    tasks.push(
      { title: 'Progress review meeting', description: 'Review progress with stakeholders', estimated_hours: 2, priority: 'low', category: 'general' },
      { title: 'Status update communication', description: 'Communicate status to team and clients', estimated_hours: 1, priority: 'low', category: 'general' },
      { title: 'Milestone completion review', description: 'Review and validate milestone completion', estimated_hours: 2, priority: 'medium', category: 'general' }
    )

    // Filter out tasks that are similar to existing ones
    const filteredTasks = tasks.filter(task => 
      !existingTasks.some(existing => 
        existing.title.toLowerCase().includes(task.title.toLowerCase().split(' ')[0])
      )
    )

    setGeneratedTasks(filteredTasks)
    // Auto-select high priority tasks
    const highPriorityIndices = filteredTasks
      .map((task, index) => ({ task, index }))
      .filter(({ task }) => task.priority === 'high')
      .map(({ index }) => index)
    
    setSelectedTasks(new Set(highPriorityIndices))
  }

  const handleTaskToggle = (index: number) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedTasks(newSelected)
  }

  const handleAddCustomTask = () => {
    if (!customTask.title.trim()) return

    const newTask: TaskTemplate = {
      ...customTask,
      category: 'custom'
    }

    setGeneratedTasks(prev => [...prev, newTask])
    setSelectedTasks(prev => {
      const newSet = new Set(prev)
      newSet.add(generatedTasks.length)
      return newSet
    })
    setCustomTask({
      title: '',
      description: '',
      estimated_hours: 4,
      priority: 'medium'
    })
    setShowCustomForm(false)
  }

  const handleGenerateTasks = () => {
    const selectedTaskList: TaskTemplate[] = []
    selectedTasks.forEach(index => {
      if (generatedTasks[index]) {
        selectedTaskList.push(generatedTasks[index])
      }
    })
    onTasksGenerated(selectedTaskList)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'development': return 'bg-blue-100 text-blue-800'
      case 'design': return 'bg-purple-100 text-purple-800'
      case 'marketing': return 'bg-pink-100 text-pink-800'
      case 'testing': return 'bg-orange-100 text-orange-800'
      case 'planning': return 'bg-indigo-100 text-indigo-800'
      case 'custom': return 'bg-teal-100 text-teal-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Auto-generate tasks on component mount
  useEffect(() => {
    generateSmartTasks()
  }, [milestoneTitle, milestoneDescription])

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-blue-500" />
          Smart Task Generator
        </CardTitle>
        <p className="text-sm text-gray-600">
          AI-powered task suggestions for "<strong>{milestoneTitle}</strong>"
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Generated Tasks */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Suggested Tasks ({generatedTasks.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={generateSmartTasks}
            >
              <Zap className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {generatedTasks.map((task, index) => (
              <Card 
                key={index}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedTasks.has(index) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => handleTaskToggle(index)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {selectedTasks.has(index) ? (
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className={getCategoryColor(task.category)}>
                          {task.category}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.estimated_hours}h
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {task.priority} priority
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {generatedTasks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No tasks generated yet</p>
              <Button
                onClick={generateSmartTasks}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                Generate Smart Tasks
              </Button>
            </div>
          )}
        </div>

        {/* Custom Task Form */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-500" />
              Add Custom Task
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomForm(!showCustomForm)}
            >
              {showCustomForm ? 'Hide Form' : 'Add Custom'}
            </Button>
          </div>

          {showCustomForm && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Task Title</label>
                  <Input
                    value={customTask.title}
                    onChange={(e) => setCustomTask(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter task title..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Estimated Hours</label>
                  <Input
                    type="number"
                    value={customTask.estimated_hours}
                    onChange={(e) => setCustomTask(prev => ({ ...prev, estimated_hours: parseInt(e.target.value) || 4 }))}
                    min="1"
                    max="40"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={customTask.description}
                  onChange={(e) => setCustomTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what needs to be done..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <Select
                  value={customTask.priority}
                  onValueChange={(value: any) => setCustomTask(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="urgent">Urgent Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleAddCustomTask}
                disabled={!customTask.title.trim()}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Task
              </Button>
            </div>
          )}
        </div>

        {/* Summary and Actions */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              {selectedTasks.size} of {generatedTasks.length} tasks selected
              {selectedTasks.size > 0 && (
                <span className="ml-2">
                  (Est. {(() => {
                    let total = 0
                    selectedTasks.forEach(index => {
                      if (generatedTasks[index]) {
                        total += generatedTasks[index].estimated_hours
                      }
                    })
                    return total
                  })()}h total)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerateTasks}
                disabled={selectedTasks.size === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Target className="h-4 w-4 mr-2" />
                Add Selected Tasks ({selectedTasks.size})
              </Button>
            </div>
          </div>

          {selectedTasks.size > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Smart Insights</span>
              </div>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Tasks are automatically prioritized based on impact</li>
                <li>• Estimated hours help with timeline planning</li>
                <li>• Categories help organize work efficiently</li>
                {selectedTasks.size > 5 && (
                  <li className="text-orange-600">• Consider breaking down into smaller milestones</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
