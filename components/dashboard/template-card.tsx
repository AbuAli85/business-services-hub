'use client'

import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface TemplateCardProps {
  id: string
  title: string
  description: string
  category?: string
  icon: LucideIcon
  type: 'milestone' | 'task'
  isCustom?: boolean
  isSelected?: boolean
  onSelect: () => void
  onPreview?: () => void
  userRole?: 'provider' | 'client'
}

export function TemplateCard({
  id,
  title,
  description,
  category,
  icon: Icon,
  type,
  isCustom = false,
  isSelected = false,
  onSelect,
  onPreview,
  userRole = 'provider'
}: TemplateCardProps) {
  return (
    <div
      className={`rounded-xl shadow-sm border bg-white p-4 flex flex-col justify-between hover:shadow-md transition cursor-pointer ${
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-gray-200 hover:border-gray-300"
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-gray-100 rounded-lg w-10 h-10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-900 line-clamp-1">{title}</h3>
            {isCustom && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                Custom
              </Badge>
            )}
          </div>
          {category && (
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              {category}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">
        {description}
      </p>

      {/* Type Badge */}
      <div className="flex items-center justify-between mb-4">
        <Badge 
          variant="outline" 
          className={`text-xs px-2 py-1 ${
            type === 'milestone' 
              ? 'border-blue-200 text-blue-700 bg-blue-50' 
              : 'border-green-200 text-green-700 bg-green-50'
          }`}
        >
          {type === 'milestone' ? 'Milestone' : 'Task'}
        </Badge>
        
        {isSelected && (
          <div className="w-2 h-2 bg-primary rounded-full"></div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
          className="text-sm text-primary hover:underline font-medium p-0 h-auto"
        >
          Use Template
        </Button>
        
        {onPreview && userRole === 'provider' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onPreview()
            }}
            className="text-xs text-gray-500 hover:text-gray-700 p-0 h-auto"
          >
            Preview
          </Button>
        )}
      </div>
    </div>
  )
}
