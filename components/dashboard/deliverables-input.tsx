'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, X, HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface DeliverablesInputProps {
  deliverables: string[]
  onChange: (deliverables: string[]) => void
  error?: string
  disabled?: boolean
}

export function DeliverablesInput({ 
  deliverables, 
  onChange, 
  error, 
  disabled = false 
}: DeliverablesInputProps) {
  const [newDeliverable, setNewDeliverable] = useState('')

  const addDeliverable = () => {
    if (newDeliverable.trim() && !deliverables.includes(newDeliverable.trim())) {
      onChange([...deliverables, newDeliverable.trim()])
      setNewDeliverable('')
    }
  }

  const removeDeliverable = (index: number) => {
    const updated = deliverables.filter((_, i) => i !== index)
    onChange(updated)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addDeliverable()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-700">
          Deliverables *
        </label>
        <TooltipProvider>
          <Tooltip content="List what clients will receive upon completion">
            <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Add new deliverable */}
      <div className="flex gap-2">
        <Input
          value={newDeliverable}
          onChange={(e) => setNewDeliverable(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="e.g., Marketing strategy document"
          disabled={disabled}
          className={`flex-1 h-11 border-2 transition-all duration-200 ${
            error ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
          }`}
        />
        <Button
          type="button"
          onClick={addDeliverable}
          disabled={!newDeliverable.trim() || disabled}
          size="sm"
          className="h-11 px-4 bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Display deliverables as chips */}
      {deliverables.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {deliverables.map((deliverable, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 border-blue-200"
            >
              <span className="text-sm">{deliverable}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeDeliverable(index)}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${deliverable} deliverable`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {deliverables.length === 0 && (
        <p className="text-slate-500 text-sm italic">
          No deliverables added yet. Add at least one deliverable.
        </p>
      )}
    </div>
  )
}
