'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateServicePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new unified Create Service page
    router.replace('/dashboard/provider/create-service')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Redirecting to the new Create Service page...</p>
      </div>
    </div>
  )
}