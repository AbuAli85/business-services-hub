'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { toast } from 'react-hot-toast'
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
  Unlock,
  RefreshCw,
  MoreVertical,
  Download,
  Upload,
  Settings,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  BarChart3,
  TrendingUp,
  Activity,
  Zap,
  Star,
  Target,
  Globe,
  Database,
  Server,
  Cpu,
  HardDrive
} from 'lucide-react'

interface AdminUser {
  id: string
  email: string | null
  full_name: string
  role: 'admin' | 'manager' | 'provider' | 'client' | 'staff' | 'moderator' | 'support'
  phone?: string
  company_name?: string
  created_at: string
  last_sign_in?: string
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  permissions?: string[]
  is_verified?: boolean
  two_factor_enabled?: boolean
  verification_status?: 'pending' | 'approved' | 'rejected'
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [sortBy, setSortBy] = useState<'name'|'email'|'role'|'status'|'created'|'last_seen'>('created')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isFetching, setIsFetching] = useState(false)
  const [viewMode, setViewMode] = useState<'grid'|'list'>('list')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchUsers()
    let intervalId: ReturnType<typeof setInterval> | undefined
    let channel: any
    let lastFetchTime = 0
    
    const setupRealtime = async () => {
      try {
        const supabase = await getSupabaseClient()
        channel = supabase
          .channel('admin-users-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            const now = Date.now()
            if (now - lastFetchTime > 2000) {
              lastFetchTime = now
              fetchUsers()
            }
          })
          .subscribe()
      } catch {}
    }
    
    setupRealtime()
    intervalId = setInterval(() => { fetchUsers() }, 60000)
    
    return () => {
      try { if (channel) channel.unsubscribe() } catch {}
      try { if (intervalId) clearInterval(intervalId) } catch {}
    }
  }, [])

  const fetchUsers = async (force = false) => {
    if (isFetching && !force) {
      console.log('⏳ Fetch already in progress, skipping...')
      return
    }
    setIsFetching(true)
    console.log(`🔄 Fetching users (force: ${force})...`)
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        console.error('❌ No session found')
        setError('Please sign in to access this page')
        setLoading(false)
        return
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const res = await fetch(`/api/admin/users?t=${Date.now()}`, { cache: 'no-store', headers })
      if (!res.ok) {
        const errorText = await res.text()
        console.error('❌ API Error:', { status: res.status, error: errorText })
        throw new Error(`Request failed: ${res.status} - ${errorText}`)
      }

      const json = await res.json()
      console.log('🔍 API Response:', { userCount: json.users?.length || 0, sampleUser: json.users?.[0] })
      
      const apiUsers: AdminUser[] = (json.users || []).map((u: any) => {
        // Map API status to UI status
        let normStatus: 'active'|'inactive'|'suspended'|'pending'
        if (u.status === 'approved' || u.status === 'active') {
          normStatus = 'active'
        } else if (u.status === 'suspended') {
          normStatus = 'suspended'
        } else if (u.status === 'pending') {
          normStatus = 'pending'
        } else {
          normStatus = 'inactive'
        }
        
        console.log('👤 User mapping:', { 
          id: u.id, 
          name: u.full_name, 
          originalStatus: u.status, 
          mappedStatus: normStatus,
          isVerified: u.is_verified 
        })
        
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
          is_verified: u.is_verified === true || u.is_verified === 'true' || (u.email && u.email !== null),
          two_factor_enabled: !!u.two_factor_enabled,
          verification_status: u.verification_status || 'pending',
          permissions: []
        }
      })
      setUsers(apiUsers)
      setError(null)
      
      // Debug: Log the updated users
      console.log('🔄 Users updated after fetch:', {
        total: apiUsers.length,
        active: apiUsers.filter(u => u.status === 'active').length,
        pending: apiUsers.filter(u => u.status === 'pending').length,
        users: apiUsers.map(u => ({ name: u.full_name, status: u.status }))
      })
    } catch (error) {
      console.error('❌ Error fetching users:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch users')
      logger.error('Error fetching users:', error)
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }

  const callAdminUpdate = async (userId: string, payload: any) => {
    const supabase = await getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
    const res = await fetch('/api/admin/user-update', { method: 'POST', headers, body: JSON.stringify({ user_id: userId, ...payload }) })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Update failed')
  }

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchQuery || 
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone?.includes(searchQuery) ||
        user.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesRole = selectedRole === 'all' || user.role === selectedRole
      const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus
      
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchQuery, selectedRole, selectedStatus])

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let aVal: any, bVal: any
      
      switch (sortBy) {
        case 'name':
          aVal = a.full_name?.toLowerCase() || ''
          bVal = b.full_name?.toLowerCase() || ''
          break
        case 'email':
          aVal = a.email?.toLowerCase() || ''
          bVal = b.email?.toLowerCase() || ''
          break
        case 'role':
          aVal = a.role
          bVal = b.role
          break
        case 'status':
          aVal = a.status
          bVal = b.status
          break
        case 'created':
          aVal = new Date(a.created_at).getTime()
          bVal = new Date(b.created_at).getTime()
          break
        case 'last_seen':
          aVal = a.last_sign_in ? new Date(a.last_sign_in).getTime() : 0
          bVal = b.last_sign_in ? new Date(b.last_sign_in).getTime() : 0
          break
        default:
          return 0
      }
      
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredUsers, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedUsers = sortedUsers.slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize)

  // Statistics
  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter(u => u.status === 'active').length
    const pending = users.filter(u => u.status === 'pending').length
    const suspended = users.filter(u => u.status === 'suspended').length
    const admins = users.filter(u => u.role === 'admin').length
    const providers = users.filter(u => u.role === 'provider').length
    const clients = users.filter(u => u.role === 'client').length
    const verified = users.filter(u => u.is_verified).length
    const twoFA = users.filter(u => u.two_factor_enabled).length

    console.log('📊 Statistics calculation:', {
      total,
      active,
      pending,
      suspended,
      admins,
      providers,
      clients,
      verified,
      twoFA,
      userStatuses: users.map(u => ({ name: u.full_name, status: u.status, verified: u.is_verified }))
    })
    
    // Additional debugging for active users
    const activeUsers = users.filter(u => u.status === 'active')
    console.log('🎯 Active users breakdown:', activeUsers.map(u => ({ 
      name: u.full_name, 
      status: u.status, 
      role: u.role,
      verification_status: u.verification_status 
    })))

    return { total, active, pending, suspended, admins, providers, clients, verified, twoFA }
  }, [users])

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200'
      case 'manager': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'provider': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'client': return 'bg-green-100 text-green-800 border-green-200'
      case 'staff': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'suspended': return 'bg-red-100 text-red-800 border-red-200'
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />
      case 'suspended': return <Lock className="h-4 w-4 text-red-600" />
      case 'inactive': return <XCircle className="h-4 w-4 text-gray-600" />
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const handleStatusChange = async (user: AdminUser, newStatus: string) => {
    try {
      console.log(`🔄 Updating ${user.full_name} status from ${user.status} to ${newStatus}`)
      const backendStatus = newStatus === 'active' ? 'approved' : 
                          newStatus === 'suspended' ? 'suspended' : 
                          newStatus === 'pending' ? 'pending' : 
                          newStatus === 'inactive' ? 'rejected' : 'pending'
      
      console.log(`📡 Calling API with backend status: ${backendStatus}`)
      await callAdminUpdate(user.id, { status: backendStatus })
      
      console.log(`🔄 Refreshing users list...`)
      await fetchUsers(true) // Force refresh
      
      console.log(`✅ Status update completed for ${user.full_name}`)
      toast.success(`${user.full_name}'s status updated to ${newStatus}`)
    } catch (err: any) {
      console.error(`❌ Status update failed for ${user.full_name}:`, err)
      toast.error(err.message)
    }
  }

  const handleRoleChange = async (user: AdminUser, newRole: string) => {
    try {
      await callAdminUpdate(user.id, { role: newRole })
      await fetchUsers()
      toast.success(`${user.full_name}'s role updated to ${newRole}`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleBulkAction = async (action: 'approve' | 'suspend' | 'delete') => {
    if (selectedIds.size === 0) return
    
    try {
      const status = action === 'approve' ? 'approved' : action === 'suspend' ? 'suspended' : 'rejected'
      const ops = Array.from(selectedIds).map(id => callAdminUpdate(id, { status }))
      await Promise.all(ops)
      setSelectedIds(new Set())
      await fetchUsers()
      toast.success(`Bulk ${action} completed for ${selectedIds.size} users`)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Users</h2>
          <p className="text-gray-600">Please wait while we fetch user data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Users</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => fetchUsers(true)} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600 mt-1">Manage platform users, roles, and permissions</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={async () => {
                  console.log('🔄 Manual refresh triggered')
                  setUsers([]) // Clear users first
                  await fetchUsers(true)
                }}
                disabled={isFetching}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Users</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Active Users</p>
                  <p className="text-3xl font-bold">{stats.active}</p>
                </div>
                <Activity className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Pending Review</p>
                  <p className="text-3xl font-bold">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Verified Users</p>
                  <p className="text-3xl font-bold">{stats.verified}</p>
                </div>
                <Shield className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Filter className="h-5 w-5 mr-2 text-blue-600" />
                  Search & Filters
                </CardTitle>
                <CardDescription>
                  Find and filter users by various criteria
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
            </div>
          </CardHeader>
          {showFilters && (
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
                      <SelectItem value="manager">Manager</SelectItem>
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">View Mode</label>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sorting */}
              <div className="flex items-center gap-4 mt-6 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Sort by:</label>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="role">Role</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="created">Created</SelectItem>
                      <SelectItem value="last_seen">Last Seen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                >
                  {sortDir === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
                <div className="text-sm text-gray-500">
                  {sortedUsers.length} users found
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedIds.size} user{selectedIds.size > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleBulkAction('approve')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('suspend')}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <Lock className="h-4 w-4 mr-1" />
                    Suspend
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Users Table/Grid */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Users ({sortedUsers.length})</CardTitle>
                <CardDescription>
                  Manage user accounts, roles, and permissions
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {pagedUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-500 mb-6">
                  Try adjusting your search or filter criteria
                </p>
                <Button onClick={() => {
                  setSearchQuery('')
                  setSelectedRole('all')
                  setSelectedStatus('all')
                }}>
                  Clear Filters
                </Button>
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-4">
                {pagedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-6 bg-white border-2 border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-center space-x-4">
                      <input 
                        type="checkbox" 
                        className="mt-1" 
                        checked={selectedIds.has(user.id)} 
                        onChange={(e) => {
                          const next = new Set(selectedIds)
                          if (e.target.checked) next.add(user.id)
                          else next.delete(user.id)
                          setSelectedIds(next)
                        }}
                        aria-label={`Select user ${user.full_name}`}
                        title={`Select user ${user.full_name}`}
                      />
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                          <span className="text-blue-700 font-bold text-lg">
                            {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        {user.status === 'active' && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-gray-900 text-lg">{user.full_name}</h4>
                          {user.role === 'admin' && <Crown className="h-4 w-4 text-yellow-500" />}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          {user.email && (
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-1" />
                              {user.email}
                            </div>
                          )}
                          {user.phone && (
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-1" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={`${getRoleColor(user.role)} font-medium`}>
                            {user.role.toUpperCase()}
                          </Badge>
                          <Badge className={`${getStatusColor(user.status)} font-medium flex items-center`}>
                            {getStatusIcon(user.status)}
                            <span className="ml-1">{user.status.toUpperCase()}</span>
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
                    
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Select 
                        value={user.role} 
                        onValueChange={(value) => handleRoleChange(user, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="provider">Provider</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select 
                        value={user.status}
                        onValueChange={(value) => handleStatusChange(user, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pagedUsers.map((user) => (
                  <Card key={user.id} className="group hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-700 font-bold text-lg">
                                {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            </div>
                            {user.status === 'active' && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{user.full_name}</h4>
                            <p className="text-sm text-gray-600">{user.email || 'No email'}</p>
                          </div>
                        </div>
                        <input 
                          type="checkbox" 
                          className="mt-1" 
                          checked={selectedIds.has(user.id)} 
                          onChange={(e) => {
                            const next = new Set(selectedIds)
                            if (e.target.checked) next.add(user.id)
                            else next.delete(user.id)
                            setSelectedIds(next)
                          }}
                          aria-label={`Select user ${user.full_name}`}
                          title={`Select user ${user.full_name}`}
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Badge className={`${getRoleColor(user.role)} font-medium`}>
                            {user.role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
                            {user.role.toUpperCase()}
                          </Badge>
                          <Badge className={`${getStatusColor(user.status)} font-medium flex items-center`}>
                            {getStatusIcon(user.status)}
                            <span className="ml-1">{user.status.toUpperCase()}</span>
                          </Badge>
                        </div>
                        
                        {user.company_name && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Building2 className="h-4 w-4 mr-2" />
                            {user.company_name}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                          {user.is_verified && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-4 pt-4 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                        <Select 
                          value={user.role} 
                          onValueChange={(value) => handleRoleChange(user, value)}
                        >
                          <SelectTrigger className="w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="provider">Provider</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Select 
                          value={user.status}
                          onValueChange={(value) => handleStatusChange(user, value)}
                        >
                          <SelectTrigger className="w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, sortedUsers.length)} of {sortedUsers.length} users
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === 1} 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === totalPages} 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}