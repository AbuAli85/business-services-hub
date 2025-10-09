'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronsUpDown, Plus, X, HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export interface SelectOption {
  id: string
  value: string
  label: string
  description?: string
  isCustom?: boolean
}

interface MultiSelectWithChipsProps {
  options: SelectOption[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  label?: string
  tooltip?: string
  allowCustom?: boolean
  customPlaceholder?: string
  disabled?: boolean
  error?: string
  maxSelections?: number
}

export function MultiSelectWithChips({
  options,
  selectedValues,
  onChange,
  placeholder = "Select items...",
  label,
  tooltip,
  allowCustom = true,
  customPlaceholder = "Enter custom item",
  disabled = false,
  error,
  maxSelections
}: MultiSelectWithChipsProps) {
  const [open, setOpen] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const customInputRef = useRef<HTMLInputElement>(null)

  // Debug logging
  useEffect(() => {
    console.log('🔍 MultiSelectWithChips: options =', options)
    console.log('🔍 MultiSelectWithChips: selectedValues =', selectedValues)
    console.log('🔍 MultiSelectWithChips: label =', label)
  }, [options, selectedValues, label])

  const selectedOptions = options.filter(option => 
    selectedValues.includes(option.value)
  )

  const handleSelect = (value: string) => {
    if (value === 'custom') {
      setShowCustomInput(true)
      setOpen(false)
      setTimeout(() => customInputRef.current?.focus(), 100)
      return
    }

    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value))
    } else {
      if (maxSelections && selectedValues.length >= maxSelections) {
        return
      }
      onChange([...selectedValues, value])
    }
  }

  const handleCustomAdd = () => {
    if (customValue.trim() && !selectedValues.includes(customValue.trim())) {
      if (maxSelections && selectedValues.length >= maxSelections) {
        return
      }
      onChange([...selectedValues, customValue.trim()])
      setCustomValue('')
      setShowCustomInput(false)
    }
  }

  const handleCustomKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCustomAdd()
    } else if (e.key === 'Escape') {
      setCustomValue('')
      setShowCustomInput(false)
    }
  }

  const handleRemove = (value: string) => {
    onChange(selectedValues.filter(v => v !== value))
  }

  // Filter options based on search query and selection status
  const availableOptions = options.filter(option => {
    const isNotSelected = !selectedValues.includes(option.value)
    const matchesSearch = searchQuery === '' || 
      option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (option.description && option.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return isNotSelected && matchesSearch
  })

  // Debug logging for availableOptions
  useEffect(() => {
    console.log('🔍 MultiSelectWithChips: availableOptions =', availableOptions.length, availableOptions)
    console.log('🔍 MultiSelectWithChips: selectedValues =', selectedValues)
    console.log('🔍 MultiSelectWithChips: all options =', options.length, options)
  }, [availableOptions, selectedValues, options])

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">
            {label}
          </label>
          {tooltip && (
            <TooltipProvider>
              <Tooltip content={tooltip}>
                <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      {/* Selected items as chips */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <Badge
              key={option.value}
              variant="secondary"
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 border-blue-200"
            >
              <span className="text-sm">{option.label}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(option.value)}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${option.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Multi-select dropdown */}
      <Popover open={open} onOpenChange={(newOpen) => {
        setOpen(newOpen)
        if (!newOpen) {
          setSearchQuery('')
        }
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between h-11 border-2 transition-all duration-200",
              error ? "border-red-500" : "border-slate-200 focus:border-blue-500"
            )}
            disabled={disabled || (maxSelections ? selectedValues.length >= maxSelections : false)}
          >
            <span className="truncate">
              {selectedValues.length > 0 
                ? `${selectedValues.length} item${selectedValues.length > 1 ? 's' : ''} selected`
                : placeholder
              }
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-50" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search items..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>No items found.</CommandEmpty>
              <CommandGroup>
                {availableOptions.map((option) => {
                  // Debug logging
                  console.log('🔍 Rendering option:', option.label, option.value)
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        console.log('🔍 Option selected:', option.label)
                        handleSelect(option.value)
                      }}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-100"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          selectedValues.includes(option.value) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{option.label}</div>
                        {option.description && (
                          <div className="text-xs text-slate-500">{option.description}</div>
                        )}
                      </div>
                    </CommandItem>
                  )
                })}
                {allowCustom && (
                  <CommandItem
                    value="custom"
                    onSelect={() => handleSelect('custom')}
                    className="flex items-center gap-2 text-blue-600 cursor-pointer hover:bg-slate-100"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add custom item</span>
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Custom input */}
      {showCustomInput && (
        <div className="flex gap-2">
          <Input
            ref={customInputRef}
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyPress={handleCustomKeyPress}
            placeholder={customPlaceholder}
            disabled={disabled}
            className="flex-1 h-11 border-2 border-slate-200 focus:border-blue-500 transition-all duration-200"
          />
          <Button
            type="button"
            onClick={handleCustomAdd}
            disabled={!customValue.trim() || disabled}
            size="sm"
            className="h-11 px-4 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCustomValue('')
              setShowCustomInput(false)
            }}
            size="sm"
            className="h-11 px-4"
          >
            Cancel
          </Button>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {maxSelections && (
        <p className="text-xs text-slate-500">
          {selectedValues.length}/{maxSelections} items selected
        </p>
      )}
    </div>
  )
}
