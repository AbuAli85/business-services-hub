'use client'

import { useState, useEffect } from 'react'
import { MultiSelectWithChips, SelectOption } from './multi-select-with-chips'
import { getSupabaseClient } from '@/lib/supabase'

interface DeliverablesSelectorProps {
  categoryId: string | null
  selectedDeliverables: string[]
  onChange: (deliverables: string[]) => void
  error?: string
  disabled?: boolean
}

export function DeliverablesSelector({
  categoryId,
  selectedDeliverables,
  onChange,
  error,
  disabled = false
}: DeliverablesSelectorProps) {
  const [options, setOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchDeliverables = async () => {
      console.log('🔍 DeliverablesSelector: categoryId =', categoryId)
      console.log('🔍 DeliverablesSelector: categoryId type =', typeof categoryId)
      console.log('🔍 DeliverablesSelector: categoryId length =', categoryId?.length)
      
      if (!categoryId) {
        console.log('❌ DeliverablesSelector: No categoryId, clearing options')
        setOptions([])
        return
      }

      try {
        setLoading(true)
        console.log('🔄 DeliverablesSelector: Fetching deliverables for category:', categoryId)
        const supabase = await getSupabaseClient()
        
        const { data: deliverables, error } = await supabase
          .from('deliverables_master')
          .select('id, deliverable, description, is_custom')
          .eq('category_id', categoryId)
          .eq('is_active', true)
          .order('sort_order')

        if (error) {
          console.error('❌ DeliverablesSelector: Error fetching deliverables:', error)
          return
        }

        console.log('✅ DeliverablesSelector: Fetched deliverables:', deliverables?.length || 0)
        console.log('📋 DeliverablesSelector: Deliverables data:', deliverables)

        const formattedOptions: SelectOption[] = deliverables.map(item => ({
          id: item.id,
          value: item.deliverable,
          label: item.deliverable,
          description: item.description,
          isCustom: item.is_custom
        }))

        console.log('🎯 DeliverablesSelector: Formatted options:', formattedOptions)
        console.log('🎯 DeliverablesSelector: Options length:', formattedOptions.length)
        console.log('🎯 DeliverablesSelector: First option:', formattedOptions[0])
        setOptions(formattedOptions)
      } catch (error) {
        console.error('❌ DeliverablesSelector: Error fetching deliverables:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDeliverables()
  }, [categoryId])

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Service Deliverables</h3>
        <p className="text-slate-600">
          Select what clients will receive upon completion of your service
        </p>
      </div>

      <MultiSelectWithChips
        options={options}
        selectedValues={selectedDeliverables}
        onChange={onChange}
        placeholder={loading ? "Loading deliverables..." : "Select deliverables..."}
        label="Deliverables *"
        tooltip="Choose from predefined deliverables or add custom ones"
        allowCustom={true}
        customPlaceholder="Enter custom deliverable"
        disabled={disabled || loading}
        error={error}
        maxSelections={10}
      />

      {selectedDeliverables.length === 0 && !loading && (
        <div className="text-center py-6 text-slate-500">
          <div className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 rounded-full mb-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-sm">No deliverables selected yet. Choose from the list above.</p>
        </div>
      )}
    </div>
  )
}
