'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { 
  Plus, 
  Trash2, 
  HelpCircle, 
  Calendar, 
  Target,
  GripVertical,
  Clock
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getSupabaseClient } from '@/lib/supabase'

export interface MilestoneTemplate {
  id: string
  title: string
  description: string
  estimated_duration: number
  order_index: number
  isCustom?: boolean
}

interface EnhancedMilestonesEditorProps {
  categoryId: string | null
  milestones: MilestoneTemplate[]
  onChange: (milestones: MilestoneTemplate[]) => void
  error?: string
  disabled?: boolean
}

export function EnhancedMilestonesEditor({ 
  categoryId,
  milestones, 
  onChange, 
  error, 
  disabled = false
}: EnhancedMilestonesEditorProps) {
  const [masterMilestones, setMasterMilestones] = useState<MilestoneTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  useEffect(() => {
    const fetchMasterMilestones = async () => {
      if (!categoryId) {
        setMasterMilestones([])
        return
      }

      try {
        setLoading(true)
        const supabase = await getSupabaseClient()
        
        const { data: masterData, error } = await supabase
          .from('milestones_master')
          .select('id, title, description, estimated_duration, is_custom')
          .eq('category_id', categoryId)
          .eq('is_active', true)
          .order('sort_order')

        if (error) {
          console.error('Error fetching master milestones:', error)
          return
        }

        const formattedMilestones: MilestoneTemplate[] = masterData.map((item, index) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          estimated_duration: item.estimated_duration,
          order_index: index + 1,
          isCustom: item.is_custom
        }))

        setMasterMilestones(formattedMilestones)

        // If no milestones are set yet, load the master milestones
        if (milestones.length === 0) {
          onChange(formattedMilestones)
        }
      } catch (error) {
        console.error('Error fetching master milestones:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMasterMilestones()
  }, [categoryId, milestones.length, onChange])

  const addMilestone = () => {
    const newMilestone: MilestoneTemplate = {
      id: Date.now().toString(),
      title: '',
      description: '',
      estimated_duration: 7,
      order_index: milestones.length + 1,
      isCustom: true
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

  const loadMasterMilestones = () => {
    onChange(masterMilestones)
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

  const totalDuration = milestones.reduce((sum, milestone) => sum + milestone.estimated_duration, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">
            Project Milestones *
          </label>
          <TooltipProvider>
            <Tooltip content="Define the project phases and their estimated durations">
              <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {categoryId && masterMilestones.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadMasterMilestones}
            disabled={disabled || loading}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Target className="h-4 w-4 mr-1" />
            Load {categoryId ? 'Category' : 'Default'} Milestones
          </Button>
        )}
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading milestones...</p>
        </div>
      )}

      {!loading && milestones.length > 0 && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Total Duration:</span>
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                {totalDuration} days
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Milestones:</span>
              <Badge variant="outline" className="text-green-600 border-green-200">
                {milestones.length}
              </Badge>
            </div>
          </div>

          {/* Milestones Accordion */}
          <Accordion type="multiple" className="space-y-2">
            {milestones.map((milestone, index) => (
              <AccordionItem 
                key={milestone.id}
                value={`milestone-${index}`}
                className="border-2 border-slate-200 rounded-lg"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <GripVertical className="h-4 w-4 text-slate-400 cursor-move" />
                    <Badge variant="outline" className="text-xs">
                      Step {milestone.order_index}
                    </Badge>
                    <span className="font-medium">{milestone.title || 'Untitled Milestone'}</span>
                    <Badge variant="secondary" className="text-xs">
                      {milestone.estimated_duration} days
                    </Badge>
                    {milestone.isCustom && (
                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                        Custom
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Milestone Title *
                        </label>
                        <Input
                          value={milestone.title}
                          onChange={(e) => updateMilestone(index, 'title', e.target.value)}
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
                        rows={3}
                        disabled={disabled}
                        className="border-2 border-slate-200 focus:border-blue-500 transition-all duration-200 resize-none"
                      />
                    </div>

                    {!disabled && milestones.length > 1 && (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeMilestone(index)}
                          className="h-8 px-3 border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove Milestone
                        </Button>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
      
      <Button
        type="button"
        variant="outline"
        onClick={addMilestone}
        disabled={disabled || loading}
        className="w-full h-12 border-dashed border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Custom Milestone
      </Button>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {!loading && milestones.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <Target className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="text-sm">No milestones added yet. Add at least one milestone.</p>
        </div>
      )}
    </div>
  )
}
