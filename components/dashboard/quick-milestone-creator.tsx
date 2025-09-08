'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, Plus, X, Sparkles } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { UnifiedTemplateSelector } from './unified-template-selector'

interface QuickMilestoneCreatorProps {
  bookingId: string
  onMilestoneCreated: () => void
  onCancel: () => void
}

export function QuickMilestoneCreator({ 
  bookingId, 
  onMilestoneCreated, 
  onCancel 
}: QuickMilestoneCreatorProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)

  const createFallbackMilestone = async () => {
    try {
      const milestone = {
        id: `milestone-${Date.now()}`,
        title: title.trim(),
        description: description.trim() || '',
        status: 'pending',
        progress_percentage: 0,
        tasks: [],
        created_at: new Date().toISOString()
      }

      // Get existing milestones from localStorage
      const existingMilestones = JSON.parse(localStorage.getItem(`milestones-${bookingId}`) || '[]')
      existingMilestones.push(milestone)
      
      // Save to localStorage
      localStorage.setItem(`milestones-${bookingId}`, JSON.stringify(existingMilestones))
      
      console.log('Milestone created in localStorage:', milestone)
      toast.success('Milestone created successfully! (Using local storage)')
      onMilestoneCreated()
    } catch (error) {
      console.error('Error creating fallback milestone:', error)
      toast.error('Failed to create milestone even in offline mode')
    }
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a milestone title')
      return
    }

    try {
      setIsCreating(true)
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()
      
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('Authentication error:', authError)
        toast.error('Please sign in to create milestones')
        return
      }

      console.log('Creating milestone for booking:', bookingId)
      console.log('User authenticated:', user.id)

      // Try to create milestone with proper error handling
      const { data: newMilestone, error } = await supabase
        .from('milestones')
        .insert({
          booking_id: bookingId,
          title: title.trim(),
          description: description.trim() || null,
          status: 'pending',
          progress_percentage: 0,
          order_index: 0,
          created_by: user.id
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating milestone:', error)
        
        // Handle specific error cases
        if (error.code === '42501') {
          toast.error('Database permission denied. Switching to offline mode...')
          // Try to create in localStorage as fallback
          await createFallbackMilestone()
          return
        } else if (error.code === '23503') {
          toast.error('Invalid booking ID. Please refresh the page and try again.')
        } else if (error.code === '23505') {
          toast.error('A milestone with this title already exists for this booking.')
        } else {
          toast.error('Database error. Switching to offline mode...')
          // Try to create in localStorage as fallback
          await createFallbackMilestone()
          return
        }
        return
      }

      console.log('Milestone created successfully:', newMilestone)
      toast.success('Milestone created successfully!')
      onMilestoneCreated()
    } catch (error) {
      console.error('Unexpected error:', error)
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const applyTemplateSteps = async () => {
    if (!selectedTemplate || !selectedTemplate.defaultSteps) return

    try {
      setIsCreating(true)
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('Authentication error:', authError)
        toast.error('Please sign in to create milestones')
        return
      }

      // Create milestone
      const { data: newMilestone, error: milestoneError } = await supabase
        .from('milestones')
        .insert({
          booking_id: bookingId,
          title: title.trim(),
          description: description.trim(),
          status: 'pending',
          progress_percentage: 0,
          order_index: 0,
          created_by: user.id
        })
        .select()
        .single()

      if (milestoneError) {
        console.error('Error creating milestone:', milestoneError)
        toast.error('Failed to create milestone')
        return
      }

      // Create tasks from template steps
      let createdTasks = 0
      for (let i = 0; i < selectedTemplate.defaultSteps.length; i++) {
        const step = selectedTemplate.defaultSteps[i]
        
        const { error: taskError } = await supabase
          .from('tasks')
          .insert({
            milestone_id: newMilestone.id,
            title: step.title,
            description: step.description,
            status: 'pending',
            progress: 0,
            priority: 'medium',
            order_index: i,
            created_by: user.id
          })
        
        if (taskError) {
          console.error('Error creating task:', taskError)
          continue
        }
        
        createdTasks++
      }

      console.log(`Milestone created with ${createdTasks} tasks from template`)
      toast.success(`Milestone created with ${createdTasks} tasks!`)
      onMilestoneCreated()
    } catch (error) {
      console.error('Error creating milestone with template:', error)
      toast.error('Failed to create milestone')
    } finally {
      setIsCreating(false)
    }
  }

  const handleTemplateSelect = (template: any) => {
    if (template.type === 'milestone') {
      // Apply milestone template
      setTitle(template.title)
      setDescription(template.description)
      setSelectedTemplate(template)
      setShowTemplates(false)
      toast.success(`Template "${template.title}" applied!`)
    } else {
      toast.error('Please select a milestone template')
    }
  }

  const handleTemplateSelectOld = async (template: any) => {
    try {
      setIsCreating(true)
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()
      
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('Authentication error:', authError)
        toast.error('Please sign in to apply templates')
        return
      }

      console.log('Applying template:', template.name)
      console.log('User authenticated:', user.id)

      let createdMilestones = 0
      let createdTasks = 0
      
      // Create milestones from template
      for (let i = 0; i < template.milestones.length; i++) {
        const milestone = template.milestones[i]
        
        const { data: newMilestone, error: milestoneError } = await supabase
          .from('milestones')
          .insert({
            booking_id: bookingId,
            title: milestone.title,
            description: milestone.description,
            status: 'pending',
            progress_percentage: 0,
            order_index: i,
            created_by: user.id
          })
          .select()
          .single()
        
        if (milestoneError) {
          console.error('Error creating milestone:', milestoneError)
          if (milestoneError.code === '42501') {
            toast.error('Permission denied. Please check your account permissions.')
            return
          }
          continue
        }

        createdMilestones++

        // Create tasks for this milestone
        for (let j = 0; j < milestone.tasks.length; j++) {
          const task = milestone.tasks[j]
          
          const { error: taskError } = await supabase
            .from('tasks')
            .insert({
              milestone_id: newMilestone.id,
              title: task,
              description: '',
              status: 'pending',
              progress_percentage: 0,
              order_index: j,
              created_by: user.id
            })
          
          if (taskError) {
            console.error('Error creating task:', taskError)
            continue
          }
          
          createdTasks++
        }
      }

      if (createdMilestones > 0) {
        toast.success(`Template applied! Created ${createdMilestones} milestones and ${createdTasks} tasks.`)
        onMilestoneCreated()
      } else {
        toast.error('Failed to create any milestones. Please check your permissions.')
      }
    } catch (error) {
      console.error('Unexpected error applying template:', error)
      toast.error('An unexpected error occurred while applying template.')
    } finally {
      setIsCreating(false)
    }
  }

  if (showTemplates) {
    return (
      <UnifiedTemplateSelector
        bookingId={bookingId}
        onSelectTemplate={handleTemplateSelect}
        onCancel={() => setShowTemplates(false)}
        userRole="provider"
      />
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-600" />
            <span>Create First Milestone</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Milestone Title *
            {selectedTemplate && (
              <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                From template: {selectedTemplate.title}
              </span>
            )}
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Project Kickoff"
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this milestone involves..."
            rows={3}
            className="w-full"
          />
        </div>

        <div className="space-y-3 pt-4">
          <div className="flex space-x-3">
            <Button
              onClick={selectedTemplate ? applyTemplateSteps : handleCreate}
              disabled={isCreating || !title.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {selectedTemplate ? 'Create with Template' : 'Create Milestone'}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isCreating}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={() => setShowTemplates(true)}
            disabled={isCreating}
            className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Use Smart Template
          </Button>
        </div>

        <div className="text-xs text-gray-500 text-center">
          You can add tasks to this milestone after creating it
        </div>
      </CardContent>
    </Card>
  )
}
