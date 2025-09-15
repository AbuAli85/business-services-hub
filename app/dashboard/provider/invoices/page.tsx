'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import UnifiedInvoiceManagement from '@/components/dashboard/unified-invoice-management'

export default function ProviderInvoicesPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        setLoading(false)
        return
      }

      setUser(user)
    } catch (e) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to view your invoices.</p>
        </div>
      </div>
    )
  }

  return (
    <UnifiedInvoiceManagement 
      userRole="provider" 
      userId={user.id} 
    />
  )
}
