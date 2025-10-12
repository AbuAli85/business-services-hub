'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, Plus, X, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface FallbackMilestoneCreatorProps {
  bookingId: string
  onMilestoneCreated: () => void
  onCancel: () => void
}

interface Milestone {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  progress_percentage: number
  tasks: Task[]
  created_at: string
}

interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  progress_percentage: number
  created_at: string
}

export function FallbackMilestoneCreator({ 
  bookingId, 
  onMilestoneCreated, 
  onCancel 
}: FallbackMilestoneCreatorProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a milestone title')
      return
    }

    try {
      setIsCreating(true)
      
      // Create milestone in local storage as fallback
      const milestone: Milestone = {
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
      console.error('Error:', error)
      toast.error('Failed to create milestone')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-600" />
            <span>Create Milestone (Offline Mode)</span>
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
        <div className="flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
          <AlertTriangle className="h-4 w-4" />
          <span>Using offline mode - data will be stored locally</span>
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

        <div className="flex space-x-3 pt-4">
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

        <div className="text-xs text-gray-500 text-center">
          This milestone will be stored locally until database permissions are fixed
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to get milestones from localStorage
export function getFallbackMilestones(bookingId: string): Milestone[] {
  try {
    const stored = localStorage.getItem(`milestones-${bookingId}`)
    if (stored) {
      return JSON.parse(stored)
    }
    
    // Return empty array - no mock data, user must create milestones
    return []
  } catch (error) {
    console.error('Error loading fallback milestones:', error)
    return []
  }
}

// Helper function to update milestone status
export function updateFallbackMilestone(bookingId: string, milestoneId: string, updates: Partial<Milestone>) {
  try {
    const milestones = getFallbackMilestones(bookingId)
    const updatedMilestones = milestones.map(m => 
      m.id === milestoneId ? { ...m, ...updates } : m
    )
    localStorage.setItem(`milestones-${bookingId}`, JSON.stringify(updatedMilestones))
    return true
  } catch (error) {
    console.error('Error updating fallback milestone:', error)
    return false
  }
}

// Helper function to add task to milestone
export function addFallbackTask(bookingId: string, milestoneId: string, taskTitle: string) {
  try {
    const milestones = getFallbackMilestones(bookingId)
    const updatedMilestones = milestones.map(m => {
      if (m.id === milestoneId) {
        const newTask: Task = {
          id: `task-${Date.now()}`,
          title: taskTitle,
          description: '',
          status: 'pending',
          progress_percentage: 0,
          created_at: new Date().toISOString()
        }
        return { ...m, tasks: [...m.tasks, newTask] }
      }
      return m
    })
    localStorage.setItem(`milestones-${bookingId}`, JSON.stringify(updatedMilestones))
    return true
  } catch (error) {
    console.error('Error adding fallback task:', error)
    return false
  }
}
