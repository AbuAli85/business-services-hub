'use client'

import React, { useMemo, useState } from 'react'
import { RoleGuard } from '@/components/role-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export default function AdminToolsPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [userStatus, setUserStatus] = useState<string>('approved')
  const [userRole, setUserRole] = useState<string>('client')

  const [bookingId, setBookingId] = useState('')
  const [bookingAction, setBookingAction] = useState<'approve'|'decline'|'reschedule'|'complete'|'cancel'>('approve')
  const [rescheduleAt, setRescheduleAt] = useState('')
  const [reason, setReason] = useState('')

  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('Test email')
  const [emailHtml, setEmailHtml] = useState('<b>Hello from Admin Tools</b>')

  async function loadUsers() {
    try {
      setLoadingUsers(true)
      const token = (await (await import('@supabase/supabase-js')).createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!).auth.getSession()).data.session?.access_token
      const res = await fetch('/api/admin/users', { cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load users')
      setUsers(data.users || [])
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoadingUsers(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      (u.email || '').toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    )
  }, [users, query])

  async function updateUser() {
    if (!selectedUser) return toast.error('Select a user')
    try {
      const token = (await (await import('@supabase/supabase-js')).createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!).auth.getSession()).data.session?.access_token
      const res = await fetch('/api/admin/user-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedUser.id, status: userStatus, role: userRole, token })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed')
      toast.success('User updated')
      loadUsers()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function updateBooking() {
    if (!bookingId) return toast.error('Enter booking id')
    try {
      const payload: any = { booking_id: bookingId, action: bookingAction }
      if (bookingAction === 'reschedule') payload.scheduled_date = rescheduleAt
      if (bookingAction === 'decline' || bookingAction === 'cancel') payload.reason = reason

      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed')
      toast.success('Booking updated')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function sendTestEmail() {
    if (!emailTo) return toast.error('Enter recipient email')
    try {
      const res = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo, subject: emailSubject, html: emailHtml, text: emailHtml.replace(/<[^>]+>/g,'') })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to send email')
      toast.success('Email sent')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <RoleGuard allow={['admin']} redirect="/dashboard">
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Search email/name/role" value={query} onChange={(e)=>setQuery(e.target.value)} />
            <Button onClick={loadUsers} disabled={loadingUsers}>{loadingUsers ? 'Loading...' : 'Refresh'}</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="border rounded p-2 h-64 overflow-auto">
                {filtered.map(u => (
                  <div key={u.id} className={`p-2 rounded cursor-pointer ${selectedUser?.id===u.id?'bg-blue-50':'hover:bg-gray-50'}`} onClick={()=>{setSelectedUser(u); setUserStatus(u.status||'approved'); setUserRole(u.role||'client')}}>
                    <div className="text-sm font-medium">{u.full_name} <span className="text-gray-500">({u.email})</span></div>
                    <div className="text-xs text-gray-500">role: {u.role} • status: {u.status}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  <Select value={userStatus} onValueChange={setUserStatus}>
                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">approved</SelectItem>
                      <SelectItem value="pending">pending</SelectItem>
                      <SelectItem value="suspended">suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Role</div>
                  <Select value={userRole} onValueChange={setUserRole}>
                    <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">admin</SelectItem>
                      <SelectItem value="manager">manager</SelectItem>
                      <SelectItem value="provider">provider</SelectItem>
                      <SelectItem value="client">client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={updateUser} disabled={!selectedUser}>Update User</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booking Override</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input placeholder="Booking ID" value={bookingId} onChange={(e)=>setBookingId(e.target.value)} />
            <Select value={bookingAction} onValueChange={(v:any)=>setBookingAction(v)}>
              <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="approve">approve</SelectItem>
                <SelectItem value="decline">decline</SelectItem>
                <SelectItem value="reschedule">reschedule</SelectItem>
                <SelectItem value="complete">complete</SelectItem>
                <SelectItem value="cancel">cancel</SelectItem>
              </SelectContent>
            </Select>
            <Input type="datetime-local" value={rescheduleAt} onChange={(e)=>setRescheduleAt(e.target.value)} disabled={bookingAction!=='reschedule'} />
          </div>
          {(bookingAction==='decline' || bookingAction==='cancel') && (
            <Textarea placeholder="Reason" value={reason} onChange={(e)=>setReason(e.target.value)} />
          )}
          <Button onClick={updateBooking}>Apply</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send Test Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input placeholder="Recipient" value={emailTo} onChange={(e)=>setEmailTo(e.target.value)} />
            <Input placeholder="Subject" value={emailSubject} onChange={(e)=>setEmailSubject(e.target.value)} />
            <Button onClick={sendTestEmail}>Send</Button>
          </div>
          <Textarea value={emailHtml} onChange={(e)=>setEmailHtml(e.target.value)} />
        </CardContent>
      </Card>
    </div>
    </RoleGuard>
  )
}


