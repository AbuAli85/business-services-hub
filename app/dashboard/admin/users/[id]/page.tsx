'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getSupabaseClient } from '@/lib/supabase'

export default function AdminUserDetailsPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id])

  async function load() {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
      const res = await fetch('/api/admin/users', { headers, cache: 'no-store' })
      const data = await res.json()
      const u = (data.users||[]).find((x:any)=>x.id===params.id)
      setUser(u||null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!user) return <div className="p-6">User not found</div>

  return (
    <div className="p-4 space-y-4">
      <Button variant="outline" onClick={()=>router.push('/dashboard/admin/users')}>Back</Button>
      <Card>
        <CardHeader>
          <CardTitle>{user.full_name} ({user.email})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>Role: {user.role}</div>
          <div>Status: {user.status}</div>
          <div>Created: {new Date(user.created_at).toLocaleString()}</div>
          {user.last_sign_in && <div>Last sign in: {new Date(user.last_sign_in).toLocaleString()}</div>}
        </CardContent>
      </Card>
    </div>
  )
}


