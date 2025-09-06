'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Trash2, 
  HelpCircle, 
  Calendar, 
  Target,
  GripVertical
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface MilestoneTemplate {
  id: string
  milestone_title: string
  description: string
  estimated_duration: number
  order_index: number
}

interface MilestonesEditorProps {
  milestones: MilestoneTemplate[]
  onChange: (milestones: MilestoneTemplate[]) => void
  error?: string
  disabled?: boolean
  category?: string
}

const getDefaultMilestones = (category: string): MilestoneTemplate[] => {
  const defaults: Record<string, MilestoneTemplate[]> = {
    'PRO Services': [
      {
        id: '1',
        milestone_title: 'Document Collection',
        description: 'Gather all required documents and information from client',
        estimated_duration: 2,
        order_index: 1
      },
      {
        id: '2',
        milestone_title: 'Application Submission',
        description: 'Submit application to relevant government authority',
        estimated_duration: 1,
        order_index: 2
      },
      {
        id: '3',
        milestone_title: 'Follow-up & Approval',
        description: 'Monitor application status and handle any additional requirements',
        estimated_duration: 5,
        order_index: 3
      }
    ],
    'Digital Marketing': [
      {
        id: '1',
        milestone_title: 'Strategy Development',
        description: 'Create comprehensive digital marketing strategy',
        estimated_duration: 3,
        order_index: 1
      },
      {
        id: '2',
        milestone_title: 'Content Creation',
        description: 'Develop marketing content and materials',
        estimated_duration: 5,
        order_index: 2
      },
      {
        id: '3',
        milestone_title: 'Campaign Launch',
        description: 'Launch and monitor marketing campaigns',
        estimated_duration: 7,
        order_index: 3
      }
    ],
    'Legal Services': [
      {
        id: '1',
        milestone_title: 'Initial Consultation',
        description: 'Review case details and provide initial legal advice',
        estimated_duration: 1,
        order_index: 1
      },
      {
        id: '2',
        milestone_title: 'Document Preparation',
        description: 'Prepare legal documents and filings',
        estimated_duration: 3,
        order_index: 2
      },
      {
        id: '3',
        milestone_title: 'Filing & Follow-up',
        description: 'File documents and monitor case progress',
        estimated_duration: 5,
        order_index: 3
      }
    ],
    'Web Development': [
      {
        id: '1',
        milestone_title: 'Planning & Design',
        description: 'Create wireframes and design mockups',
        estimated_duration: 3,
        order_index: 1
      },
      {
        id: '2',
        milestone_title: 'Development',
        description: 'Build and code the website/application',
        estimated_duration: 10,
        order_index: 2
      },
      {
        id: '3',
        milestone_title: 'Testing & Launch',
        description: 'Test functionality and deploy to production',
        estimated_duration: 2,
        order_index: 3
      }
    ]
  }

  return defaults[category] || [
    {
      id: '1',
      milestone_title: 'Project Kickoff',
      description: 'Initial consultation and project planning',
      estimated_duration: 2,
      order_index: 1
    }
  ]
}

export function MilestonesEditor({ 
  milestones, 
  onChange, 
  error, 
  disabled = false,
  category = ''
}: MilestonesEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const addMilestone = () => {
    const newMilestone: MilestoneTemplate = {
      id: Date.now().toString(),
      milestone_title: '',
      description: '',
      estimated_duration: 7,
      order_index: milestones.length + 1
    }
    onChange([...milestones, newMilestone])
  }

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      const updated = milestones.filter((_, i) => i !== index)
        .map((milestone, i) => ({ ...milestone, order_index: i + 1 }))
      onChange(updated)
    }
  }

  const updateMilestone = (index: number, field: keyof MilestoneTemplate, value: string | number) => {
    const updated = milestones.map((milestone, i) => 
      i === index ? { ...milestone, [field]: value } : milestone
    )
    onChange(updated)
  }

  const loadDefaultMilestones = () => {
    const defaults = getDefaultMilestones(category)
    onChange(defaults)
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === dropIndex) return

    const draggedMilestone = milestones[draggedIndex]
    const updated = [...milestones]
    updated.splice(draggedIndex, 1)
    updated.splice(dropIndex, 0, draggedMilestone)
    
    // Update order indices
    const reordered = updated.map((milestone, index) => ({
      ...milestone,
      order_index: index + 1
    }))
    
    onChange(reordered)
    setDraggedIndex(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">
            Project Milestones *
          </label>
          <TooltipProvider>
            <Tooltip content="Define default milestones that will be automatically created for each booking">
              <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {category && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadDefaultMilestones}
            disabled={disabled}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Target className="h-4 w-4 mr-1" />
            Load {category} Defaults
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {milestones.map((milestone, index) => (
          <Card 
            key={milestone.id}
            className={`border-2 transition-all duration-200 ${
              error ? 'border-red-200' : 'border-slate-200 hover:border-slate-300'
            } ${draggedIndex === index ? 'opacity-50' : ''}`}
            draggable={!disabled}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-slate-400 cursor-move" />
                  <Badge variant="outline" className="text-xs">
                    Milestone {milestone.order_index}
                  </Badge>
                </div>
                {!disabled && milestones.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeMilestone(index)}
                    className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Milestone Title *
                  </label>
                  <Input
                    value={milestone.milestone_title}
                    onChange={(e) => updateMilestone(index, 'milestone_title', e.target.value)}
                    placeholder="e.g., Project Kickoff"
                    disabled={disabled}
                    className="h-10 border-2 border-slate-200 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    <div className="flex items-center gap-1">
                      Estimated Duration (days)
                      <TooltipProvider>
                        <Tooltip content="How many days this milestone typically takes">
                          <HelpCircle className="h-3 w-3 text-slate-400 cursor-help" />
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={milestone.estimated_duration}
                    onChange={(e) => updateMilestone(index, 'estimated_duration', parseInt(e.target.value) || 1)}
                    disabled={disabled}
                    className="h-10 border-2 border-slate-200 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Description
                </label>
                <Textarea
                  value={milestone.description}
                  onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                  placeholder="Describe what happens in this milestone..."
                  rows={2}
                  disabled={disabled}
                  className="border-2 border-slate-200 focus:border-blue-500 transition-all duration-200 resize-none"
                />
              </div>
            </CardContent>
          </Card>
        ))}
        
        <Button
          type="button"
          variant="outline"
          onClick={addMilestone}
          disabled={disabled}
          className="w-full h-12 border-dashed border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Milestone
        </Button>
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {milestones.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <Target className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="text-sm">No milestones added yet. Add at least one milestone.</p>
        </div>
      )}
    </div>
  )
}
