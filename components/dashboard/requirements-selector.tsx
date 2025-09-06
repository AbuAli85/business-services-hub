'use client'

import { useState, useEffect } from 'react'
import { MultiSelectWithChips, SelectOption } from './multi-select-with-chips'
import { getSupabaseClient } from '@/lib/supabase'

interface RequirementsSelectorProps {
  categoryId: string | null
  selectedRequirements: string[]
  onChange: (requirements: string[]) => void
  error?: string
  disabled?: boolean
}

export function RequirementsSelector({
  categoryId,
  selectedRequirements,
  onChange,
  error,
  disabled = false
}: RequirementsSelectorProps) {
  const [options, setOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchRequirements = async () => {
      if (!categoryId) {
        setOptions([])
        return
      }

      try {
        setLoading(true)
        const supabase = await getSupabaseClient()
        
        const { data: requirements, error } = await supabase
          .from('requirements_master')
          .select('id, requirement, description, is_custom')
          .eq('category_id', categoryId)
          .eq('is_active', true)
          .order('sort_order')

        if (error) {
          console.error('Error fetching requirements:', error)
          return
        }

        const formattedOptions: SelectOption[] = requirements.map(item => ({
          id: item.id,
          value: item.requirement,
          label: item.requirement,
          description: item.description,
          isCustom: item.is_custom
        }))

        setOptions(formattedOptions)
      } catch (error) {
        console.error('Error fetching requirements:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRequirements()
  }, [categoryId])

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Client Requirements</h3>
        <p className="text-slate-600">
          Specify what information or materials clients need to provide
        </p>
      </div>

      <MultiSelectWithChips
        options={options}
        selectedValues={selectedRequirements}
        onChange={onChange}
        placeholder={loading ? "Loading requirements..." : "Select requirements..."}
        label="Requirements (Optional)"
        tooltip="Help clients understand what they need to prepare"
        allowCustom={true}
        customPlaceholder="Enter custom requirement"
        disabled={disabled || loading}
        error={error}
        maxSelections={15}
      />

      {selectedRequirements.length === 0 && !loading && (
        <div className="text-center py-6 text-slate-500">
          <div className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 rounded-full mb-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-sm">No requirements selected yet. This is optional but helpful for clients.</p>
        </div>
      )}
    </div>
  )
}
