'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import UnifiedInvoiceManagement from '@/components/dashboard/unified-invoice-management'

import { logger } from '@/lib/logger'
export default function ClientInvoicesPage() {
  const router = useRouter()
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
        router.push('/auth/sign-in')
        return
      }

      setUser(user)
    } catch (error) {
      logger.error('Error checking user:', error)
      router.push('/auth/sign-in')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoices...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to view your invoices.</p>
        </div>
      </div>
    )
  }

  return (
    <UnifiedInvoiceManagement 
      userRole="client" 
      userId={user.id} 
    />
  )
}
