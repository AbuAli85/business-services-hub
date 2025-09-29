'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Check, ChevronDown } from 'lucide-react'

export interface FilterOption {
  label: string
  value: string
}

export interface FilterDropdownProps {
  label: string
  options: FilterOption[]
  value: string | string[] | null
  onChange: (value: string | string[] | null) => void
  multi?: boolean
  className?: string
}

export function FilterDropdown(props: FilterDropdownProps) {
  const { label, options, value, onChange, multi = false, className } = props
  const [open, setOpen] = React.useState(false)

  const isSelected = (v: string) => {
    return Array.isArray(value) ? value.includes(v) : value === v
  }

  const toggle = (v: string) => {
    if (multi) {
      const arr = Array.isArray(value) ? [...value] : []
      const idx = arr.indexOf(v)
      if (idx >= 0) arr.splice(idx, 1); else arr.push(v)
      onChange(arr.length ? arr : null)
    } else {
      onChange(value === v ? null : v)
      setOpen(false)
    }
  }

  const summary = React.useMemo(() => {
    if (!value || (Array.isArray(value) && value.length === 0)) return label
    if (Array.isArray(value)) return `${label}: ${value.length}`
    const found = options.find(o => o.value === value)
    return found ? `${label}: ${found.label}` : label
  }, [value, label, options])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          {summary}
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-2">
        <div className="space-y-1">
          {options.map(opt => (
            <button key={opt.value} type="button" onClick={() => toggle(opt.value)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50">
              {multi ? (
                <Checkbox checked={isSelected(opt.value)} />
              ) : (
                <span className={`inline-flex h-4 w-4 items-center justify-center rounded border ${isSelected(opt.value) ? 'bg-slate-900 text-white' : 'bg-white text-transparent'}`}>
                  <Check className="h-3 w-3" />
                </span>
              )}
              <span className="text-sm">{opt.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default FilterDropdown


