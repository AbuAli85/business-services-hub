'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseClient } from '@/lib/supabase'
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Shield,
  User,
  Building2,
  Calendar,
  Mail,
  Phone,
  Clock,
  Key,
  UserCheck,
  UserX,
  Crown,
  Lock,
  Unlock
} from 'lucide-react'

interface AdminUser {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'provider' | 'client' | 'staff' | 'moderator' | 'support'
  phone?: string
  company_name?: string
  created_at: string
  last_sign_in?: string
  status: 'active' | 'inactive' | 'suspended'
  permissions?: string[]
  is_verified?: boolean
  two_factor_enabled?: boolean
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [sortBy, setSortBy] = useState<'name'|'email'|'role'|'status'|'created'|'last_seen'>('created')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch('/api/admin/users', { cache: 'no-store', headers })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const json = await res.json()
      const apiUsers: AdminUser[] = (json.users || []).map((u: any) => {
        const normStatus: 'active'|'inactive'|'suspended' = u.status === 'approved' ? 'active' : (u.status === 'suspended' ? 'suspended' : 'inactive')
        return {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        phone: u.phone || undefined,
        company_name: u.company_name || undefined,
        created_at: u.created_at,
        last_sign_in: u.last_sign_in || undefined,
        status: normStatus,
        is_verified: !!u.is_verified,
        two_factor_enabled: !!u.two_factor_enabled,
        permissions: []
      }})
      setUsers(apiUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'moderator':
        return 'bg-blue-100 text-blue-800'
      case 'support':
        return 'bg-green-100 text-green-800'
      case 'provider':
        return 'bg-orange-100 text-orange-800'
      case 'client':
        return 'bg-gray-100 text-gray-800'
      case 'staff':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = selectedRole === 'all' || user.role === selectedRole
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    switch (sortBy) {
      case 'name':
        return a.full_name.localeCompare(b.full_name) * dir
      case 'email':
        return a.email.localeCompare(b.email) * dir
      case 'role':
        return a.role.localeCompare(b.role) * dir
      case 'status':
        return a.status.localeCompare(b.status) * dir
      case 'last_seen':
        return ((new Date(a.last_sign_in || 0).getTime()) - (new Date(b.last_sign_in || 0).getTime())) * dir
      case 'created':
      default:
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir
    }
  })

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedUsers = sortedUsers.slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize)

  async function callAdminUpdate(userId: string, payload: any) {
    const supabase = await getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
    const res = await fetch('/api/admin/user-update', { method: 'POST', headers, body: JSON.stringify({ user_id: userId, ...payload }) })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Update failed')
  }

  const handleView = (u: AdminUser) => {
    router.push(`/dashboard/admin/users/${u.id}`)
  }

  const handlePermissions = (u: AdminUser) => {
    router.push(`/dashboard/admin/permissions?userId=${encodeURIComponent(u.id)}`)
  }

  const handleEdit = async (u: AdminUser) => {
    const newRole = prompt('Set role (admin, manager, provider, client):', u.role)
    if (!newRole) return
    const newStatus = prompt('Set status (active, inactive, suspended):', u.status)
    try {
      let backendStatus: string | undefined = undefined
      if (newStatus) {
        const s = newStatus.toLowerCase()
        backendStatus = s === 'active' || s === 'approved' ? 'approved' : (s === 'suspended' ? 'suspended' : 'pending')
      }
      await callAdminUpdate(u.id, { role: newRole, status: backendStatus })
      await fetchUsers()
      alert('User updated')
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleToggleActive = async (u: AdminUser) => {
    const nextStatus = (u.status === 'active') ? 'suspended' : 'approved'
    try {
      await callAdminUpdate(u.id, { status: nextStatus })
      await fetchUsers()
    } catch (e: any) {
      alert(e.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">User Management</h1>
            <p className="text-indigo-100 text-lg mb-4">
              Manage platform users, roles, and permissions with advanced controls
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span>Total: {users.length}</span>
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-1" />
                <span>Active: {users.filter(u => u.status === 'active').length}</span>
              </div>
              <div className="flex items-center">
                <Building2 className="h-4 w-4 mr-1" />
                <span>Providers: {users.filter(u => u.role === 'provider').length}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Filter className="h-4 w-4 mr-2" />
              Bulk Actions
            </Button>
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => window.location.href = '/dashboard/admin/permissions'}
            >
              <Key className="h-4 w-4 mr-2" />
              Permissions
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              All platform users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Providers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'provider').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Service providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'client').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Service clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters */}
      <Card className="border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2 text-blue-600" />
            Advanced Search & Filters
          </CardTitle>
          <CardDescription>
            Use advanced filters to find specific users quickly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Search Users</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="provider">Provider</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Actions</label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Export
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Import
                </Button>
              </div>
            </div>
          </div>

          {/* Sorting & Pagination Controls */}
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort by</span>
              <select className="border rounded px-2 py-1 text-sm" value={sortBy} onChange={(e)=>{setSortBy(e.target.value as any); setPage(1)}}>
                <option value="created">Joined</option>
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="role">Role</option>
                <option value="status">Status</option>
                <option value="last_seen">Last seen</option>
              </select>
              <select className="border rounded px-2 py-1 text-sm" value={sortDir} onChange={(e)=>{setSortDir(e.target.value as any); setPage(1)}}>
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Page size</span>
              <select className="border rounded px-2 py-1 text-sm" value={pageSize} onChange={(e)=>{setPageSize(parseInt(e.target.value)); setPage(1)}}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            {selectedIds.size>0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm">Selected: {selectedIds.size}</span>
                <Button size="sm" variant="outline" onClick={async()=>{
                  try {
                    const ops = Array.from(selectedIds).map(id=>callAdminUpdate(id,{ status: 'approved' }))
                    await Promise.all(ops)
                    setSelectedIds(new Set())
                    await fetchUsers()
                  } catch(e:any){ alert(e.message) }
                }}>Activate</Button>
                <Button size="sm" variant="outline" onClick={async()=>{
                  try {
                    const ops = Array.from(selectedIds).map(id=>callAdminUpdate(id,{ status: 'suspended' }))
                    await Promise.all(ops)
                    setSelectedIds(new Set())
                    await fetchUsers()
                  } catch(e:any){ alert(e.message) }
                }}>Suspend</Button>
              </div>
            )}
          </div>
          
          {/* Quick Filter Tags */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            <span className="text-sm text-gray-500">Quick filters:</span>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-blue-50"
              onClick={() => {setSelectedRole('admin'); setSelectedStatus('active')}}
            >
              Active Admins
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-green-50"
              onClick={() => {setSelectedRole('provider'); setSelectedStatus('active')}}
            >
              Active Providers
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-yellow-50"
              onClick={() => setSelectedStatus('suspended')}
            >
              Suspended Users
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => {setSearchQuery(''); setSelectedRole('all'); setSelectedStatus('all')}}
            >
              Clear All
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Manage platform users and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No users found</p>
              <p className="text-sm">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pagedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-6 border-2 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200 group"
                >
                  <div className="flex items-center space-x-6">
                    <input type="checkbox" className="mt-1" checked={selectedIds.has(user.id)} onChange={(e)=>{
                      const next = new Set(selectedIds)
                      if (e.target.checked) next.add(user.id); else next.delete(user.id)
                      setSelectedIds(next)
                    }} />
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                        <span className="text-blue-700 font-bold text-lg">
                          {user.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {user.status === 'active' && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg">{user.full_name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-1" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Badge className={`${getRoleColor(user.role)} font-medium`}>
                          {user.role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
                          {user.role.toUpperCase()}
                        </Badge>
                        <Badge className={`${getStatusColor(user.status)} font-medium`}>
                          {user.status.toUpperCase()}
                        </Badge>
                        {user.is_verified && (
                          <Badge className="bg-green-100 text-green-800">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        {user.two_factor_enabled && (
                          <Badge className="bg-blue-100 text-blue-800">
                            <Shield className="h-3 w-3 mr-1" />
                            2FA
                          </Badge>
                        )}
                        {user.company_name && (
                          <Badge variant="outline" className="text-purple-600 border-purple-200">
                            <Building2 className="h-3 w-3 mr-1" />
                            {user.company_name}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </div>
                        {user.last_sign_in && (
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Last seen {new Date(user.last_sign_in).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    {/* inline quick editors */}
                    <select className="border rounded px-2 py-1 text-xs" value={user.role} onChange={async (e)=>{
                      try { await callAdminUpdate(user.id, { role: e.target.value }); await fetchUsers() } catch(err:any){ alert(err.message) }
                    }}>
                      <option value="admin">admin</option>
                      <option value="manager">manager</option>
                      <option value="provider">provider</option>
                      <option value="client">client</option>
                    </select>
                    <select className="border rounded px-2 py-1 text-xs" value={user.status}
                      onChange={async (e)=>{
                        const s = e.target.value
                        const backend = s==='active'?'approved':(s==='suspended'?'suspended':'pending')
                        try { await callAdminUpdate(user.id, { status: backend }); await fetchUsers() } catch(err:any){ alert(err.message) }
                      }}>
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                      <option value="suspended">suspended</option>
                    </select>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                      onClick={() => handleView(user)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="hover:bg-green-50 hover:border-green-200 hover:text-green-700"
                      onClick={() => handleEdit(user)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700"
                      onClick={() => handlePermissions(user)}
                    >
                      <Key className="h-4 w-4 mr-1" />
                      Permissions
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700"
                      onClick={() => handleToggleActive(user)}
                    >
                      {user.status === 'active' ? <Lock className="h-4 w-4 mr-1" /> : <Unlock className="h-4 w-4 mr-1" />}
                      {user.status === 'active' ? 'Suspend' : 'Activate'}
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Pagination */}
              <div className="flex items-center justify-between pt-6 border-t">
                <div className="text-sm text-gray-600">Showing {(currentPage-1)*pageSize+1}-{Math.min(currentPage*pageSize, sortedUsers.length)} of {sortedUsers.length} users</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={currentPage===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</Button>
                  <Badge variant="outline" className="px-3">{currentPage}/{totalPages}</Badge>
                  <Button variant="outline" size="sm" disabled={currentPage===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
