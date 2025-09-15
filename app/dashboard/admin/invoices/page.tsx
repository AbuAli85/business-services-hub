'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import UnifiedInvoiceManagement from '@/components/dashboard/unified-invoice-management'

import { logger } from '@/lib/logger'
import { InvoicesErrorBoundary } from '@/components/dashboard/dashboard-error-boundary'
export default function AdminInvoicesPage() {
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
        logger.error('Error getting user:', error)
        setLoading(false)
        return
      }

      setUser(user)
    } catch (error) {
      logger.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to view invoices.</p>
        </div>
      </div>
    )
  }

  return (
    <InvoicesErrorBoundary>
      <UnifiedInvoiceManagement 
        userRole="admin" 
        userId={user.id} 
      />
    </InvoicesErrorBoundary>
  )
}
