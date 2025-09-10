'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getSupabaseClient } from '@/lib/supabase'

export default function AdminUserDetailsPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id])

  async function authHeaders() {
    const supabase = await getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const headers: Record<string,string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
    return headers
  }

  async function load() {
    try {
      setLoading(true)
      const headers = await authHeaders()
      const res = await fetch('/api/admin/users', { headers, cache: 'no-store' })
      const data = await res.json()
      const u = (data.users||[]).find((x:any)=>x.id===params.id)
      setUser(u||null)
    } finally {
      setLoading(false)
    }
  }

  async function update(payload: any) {
    try {
      setSaving(true)
      const headers = await authHeaders()
      const res = await fetch('/api/admin/user-update', { method: 'POST', headers, body: JSON.stringify({ user_id: params.id, ...payload }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Update failed')
      await load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const badges = useMemo(() => {
    if (!user) return null
    const roleColor = user.role==='admin' ? 'bg-red-100 text-red-800' : user.role==='provider' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
    const statusColor = user.status==='active' ? 'bg-green-100 text-green-800' : user.status==='suspended' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
    return (
      <div className="flex gap-2">
        <Badge className={roleColor}>{user.role}</Badge>
        <Badge className={statusColor}>{user.status}</Badge>
        {user.is_verified && <Badge className="bg-green-100 text-green-800">verified</Badge>}
        {user.two_factor_enabled && <Badge className="bg-blue-100 text-blue-800">2FA</Badge>}
      </div>
    )
  }, [user])

  if (loading) return <div className="p-6">Loading...</div>
  if (!user) return <div className="p-6">User not found</div>

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={()=>router.push('/dashboard/admin/users')}>Back</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={()=>update({ status: user.status==='active' ? 'suspended' : 'approved' })} disabled={saving}>
            {user.status==='active' ? 'Suspend' : 'Activate'}
          </Button>
          <Button variant="outline" onClick={()=>update({ role: 'admin' })} disabled={saving}>Make Admin</Button>
          <Button variant="outline" onClick={()=>update({ role: 'provider' })} disabled={saving}>Make Provider</Button>
          <Button variant="outline" onClick={()=>update({ role: 'client' })} disabled={saving}>Make Client</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{user.full_name} ({user.email})</span>
            {badges}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div><span className="text-gray-500 text-sm">User ID</span><div className="text-sm">{user.id}</div></div>
              <div><span className="text-gray-500 text-sm">Created</span><div className="text-sm">{new Date(user.created_at).toLocaleString()}</div></div>
              {user.last_sign_in && (<div><span className="text-gray-500 text-sm">Last sign in</span><div className="text-sm">{new Date(user.last_sign_in).toLocaleString()}</div></div>)}
            </div>
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <span className="text-gray-500 text-sm">Role</span>
                <select className="border rounded px-2 py-1 text-sm" value={user.role} onChange={(e)=>update({ role: e.target.value })} disabled={saving}>
                  <option value="admin">admin</option>
                  <option value="manager">manager</option>
                  <option value="provider">provider</option>
                  <option value="client">client</option>
                </select>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-gray-500 text-sm">Status</span>
                <select className="border rounded px-2 py-1 text-sm" value={user.status}
                  onChange={(e)=>{
                    const s = e.target.value
                    const backend = s==='active'?'approved':(s==='suspended'?'suspended':'pending')
                    update({ status: backend })
                  }} disabled={saving}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="suspended">suspended</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Account Security</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Email verified: {user.is_verified ? 'Yes' : 'No'}</div>
            <div>Two-factor: {user.two_factor_enabled ? 'Enabled' : 'Disabled'}</div>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={()=>alert('Password reset link will be sent via your provider setup.')}>Send reset password</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Quick Links</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><a className="text-blue-600 underline" href={`/dashboard/messages?userId=${encodeURIComponent(user.id)}`}>Open messages with this user</a></div>
            <div><a className="text-blue-600 underline" href={`/dashboard/bookings?userId=${encodeURIComponent(user.id)}`}>View user's bookings</a></div>
            <div><a className="text-blue-600 underline" href={`/dashboard/admin/permissions?userId=${encodeURIComponent(user.id)}`}>Manage permissions</a></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


