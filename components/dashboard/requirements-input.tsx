'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, HelpCircle, ListChecks } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface RequirementsInputProps {
  requirements: string[]
  onChange: (requirements: string[]) => void
  error?: string
  disabled?: boolean
}

export function RequirementsInput({ 
  requirements, 
  onChange, 
  error, 
  disabled = false 
}: RequirementsInputProps) {
  const [newRequirement, setNewRequirement] = useState('')

  const addRequirement = () => {
    if (newRequirement.trim()) {
      onChange([...requirements, newRequirement.trim()])
      setNewRequirement('')
    }
  }

  const removeRequirement = (index: number) => {
    const updated = requirements.filter((_, i) => i !== index)
    onChange(updated)
  }

  const updateRequirement = (index: number, value: string) => {
    const updated = requirements.map((req, i) => i === index ? value : req)
    onChange(updated)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      addRequirement()
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <ListChecks className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Client Requirements</h3>
        <p className="text-slate-600">
          What information or materials do clients need to provide for a successful project?
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm font-medium text-slate-700">
          Requirements (Optional)
        </label>
        <TooltipProvider>
          <Tooltip content="Help clients understand what they need to prepare">
            <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Add new requirement */}
      <div className="space-y-2">
        <Textarea
          value={newRequirement}
          onChange={(e) => setNewRequirement(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="e.g., Brand guidelines, target audience information, project timeline..."
          rows={3}
          disabled={disabled}
          className={`border-2 transition-all duration-200 resize-none ${
            error ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
          }`}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Press Ctrl+Enter to add requirement
          </p>
          <Button
            type="button"
            onClick={addRequirement}
            disabled={!newRequirement.trim() || disabled}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Requirement
          </Button>
        </div>
      </div>

      {/* Display requirements */}
      {Array.isArray(requirements) && requirements.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-700">
            Added Requirements ({requirements.length})
          </h4>
          {requirements.map((requirement, index) => (
            <div key={index} className="flex gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex-1">
                <Textarea
                  value={requirement}
                  onChange={(e) => updateRequirement(index, e.target.value)}
                  rows={2}
                  disabled={disabled}
                  className="border-0 bg-transparent resize-none focus:ring-0 p-0"
                />
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeRequirement(index)}
                  className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50 self-start"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {requirements.length === 0 && (
        <div className="text-center py-6 text-slate-500">
          <ListChecks className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No requirements added yet. This is optional but helpful for clients.</p>
        </div>
      )}
    </div>
  )
}
