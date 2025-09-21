'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Clock, User, Mail, Phone, Building } from 'lucide-react'

interface SimpleUser {
  id: string
  email: string
  full_name: string
  role: string
  phone?: string
  company_name?: string
  created_at: string
  status: string
  verification_status: string
}

export default function SimpleAdminUsersPage() {
  const [users, setUsers] = useState<SimpleUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users?test=true')
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }
      
      const data = await response.json()
      setUsers(data.users || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/user-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          status: 'active',
          verification_status: 'approved'
        })
      })

      if (response.ok) {
        // Refresh the users list
        await fetchUsers()
        alert('User approved successfully!')
      } else {
        const errorData = await response.json()
        alert(`Failed to approve user: ${errorData.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Error approving user:', err)
      alert('Failed to approve user')
    }
  }

  const handleReject = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/user-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          status: 'inactive',
          verification_status: 'rejected'
        })
      })

      if (response.ok) {
        // Refresh the users list
        await fetchUsers()
        alert('User rejected successfully!')
      } else {
        const errorData = await response.json()
        alert(`Failed to reject user: ${errorData.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Error rejecting user:', err)
      alert('Failed to reject user')
    }
  }

  const getStatusBadge = (status: string, verificationStatus: string) => {
    if (verificationStatus === 'pending' || status === 'pending') {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending Approval</Badge>
    } else if (verificationStatus === 'approved' || status === 'active') {
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Approved</Badge>
    } else if (verificationStatus === 'rejected' || status === 'inactive') {
      return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Rejected</Badge>
    }
    return <Badge variant="outline">{status}</Badge>
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      provider: 'bg-blue-100 text-blue-800',
      client: 'bg-gray-100 text-gray-800',
      manager: 'bg-purple-100 text-purple-800'
    }
    return <Badge className={colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>{role}</Badge>
  }

  const pendingUsers = users.filter(user => user.verification_status === 'pending' || user.status === 'pending')
  const approvedUsers = users.filter(user => user.verification_status === 'approved' || user.status === 'active')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Users</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchUsers}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Users Management</h1>
        <p className="text-gray-600 mt-2">Manage user approvals and access</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingUsers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Users</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedUsers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Users */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Approval ({pendingUsers.length})
          </CardTitle>
          <CardDescription>
            Users waiting for admin approval to access the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No users pending approval</p>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <div key={user.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{user.full_name || 'No Name'}</h3>
                        {getStatusBadge(user.status, user.verification_status)}
                        {getRoleBadge(user.role)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {user.phone}
                          </div>
                        )}
                        {user.company_name && (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            {user.company_name}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          Joined: {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(user.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(user.id)}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Users */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
          <CardDescription>Complete list of all registered users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{user.full_name || 'No Name'}</span>
                    {getStatusBadge(user.status, user.verification_status)}
                    {getRoleBadge(user.role)}
                  </div>
                  <div className="text-sm text-gray-600">{user.email}</div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
