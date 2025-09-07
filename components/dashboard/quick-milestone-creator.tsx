'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, Plus, X, Sparkles } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { SmartMilestoneTemplates } from './smart-milestone-templates'

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

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a milestone title')
      return
    }

    try {
      setIsCreating(true)
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()
      
      const { data: newMilestone, error } = await supabase
        .from('milestones')
        .insert({
          booking_id: bookingId,
          title: title.trim(),
          description: description.trim() || null,
          status: 'pending',
          progress_percentage: 0,
          order_index: 0
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating milestone:', error)
        toast.error('Failed to create milestone: ' + error.message)
        return
      }

      toast.success('Milestone created successfully!')
      onMilestoneCreated()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to create milestone')
    } finally {
      setIsCreating(false)
    }
  }

  const handleTemplateSelect = async (template: any) => {
    try {
      setIsCreating(true)
      const { getSupabaseClient } = await import('@/lib/supabase')
      const supabase = await getSupabaseClient()
      
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
            order_index: i
          })
          .select()
          .single()
        
        if (milestoneError) {
          console.error('Error creating milestone:', milestoneError)
          continue
        }

        // Create tasks for this milestone
        for (let j = 0; j < milestone.tasks.length; j++) {
          const task = milestone.tasks[j]
          
          await supabase
            .from('tasks')
            .insert({
              milestone_id: newMilestone.id,
              title: task,
              description: '',
              status: 'pending',
              progress_percentage: 0,
              order_index: j
            })
        }
      }

      toast.success(`Template "${template.name}" applied successfully!`)
      onMilestoneCreated()
    } catch (error) {
      console.error('Error applying template:', error)
      toast.error('Failed to apply template')
    } finally {
      setIsCreating(false)
    }
  }

  if (showTemplates) {
    return (
      <SmartMilestoneTemplates
        bookingId={bookingId}
        onTemplateSelect={handleTemplateSelect}
        onCancel={() => setShowTemplates(false)}
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
              onClick={handleCreate}
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
                  Create Milestone
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
