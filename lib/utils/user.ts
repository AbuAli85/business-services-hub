import { BackendUser, AdminUser } from '@/types/users'

export function normalizeStatus(status: string): AdminUser['status'] {
  if (status === 'approved' || status === 'active') {
    return 'active'
  } else if (status === 'suspended') {
    return 'suspended'
  } else if (status === 'pending') {
    return 'pending'
  } else if (status === 'deleted') {
    return 'deleted'
  } else {
    return 'inactive'
  }
}

export function mapBackendUserToAdminUser(u: BackendUser): AdminUser {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role as AdminUser['role'],
    phone: u.phone || undefined,
    company_name: u.company_name || undefined,
    created_at: u.created_at,
    last_sign_in: u.last_sign_in || undefined,
    status: normalizeStatus(u.status),
    is_verified: Boolean(u.is_verified === true || u.is_verified === 'true' || (u.email && u.email !== null && u.email !== '')),
    two_factor_enabled: !!u.two_factor_enabled,
    verification_status: (u.verification_status as AdminUser['verification_status']) || 'pending',
    permissions: []
  }
}

export function getRoleColor(role: string): string {
  switch (role) {
    case 'admin': return 'bg-red-100 text-red-800 border-red-200'
    case 'manager': return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'provider': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'client': return 'bg-green-100 text-green-800 border-green-200'
    case 'staff': return 'bg-orange-100 text-orange-800 border-orange-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800 border-green-200'
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'suspended': return 'bg-red-100 text-red-800 border-red-200'
    case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'deleted': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function getStatusIcon(status: string) {
  const { CheckCircle2, Clock, Lock, XCircle, AlertCircle, Trash2 } = require('lucide-react')
  
  switch (status) {
    case 'active': return CheckCircle2
    case 'pending': return Clock
    case 'suspended': return Lock
    case 'inactive': return XCircle
    case 'deleted': return Trash2
    default: return AlertCircle
  }
}

export function calculateUserStats(users: AdminUser[]) {
  const activeUsers = users.filter(u => u.status !== 'deleted')
  return {
    total: activeUsers.length,
    active: activeUsers.filter(u => u.status === 'active').length,
    pending: activeUsers.filter(u => u.status === 'pending').length,
    suspended: activeUsers.filter(u => u.status === 'suspended').length,
    admins: activeUsers.filter(u => u.role === 'admin').length,
    providers: activeUsers.filter(u => u.role === 'provider').length,
    clients: activeUsers.filter(u => u.role === 'client').length,
    verified: activeUsers.filter(u => u.is_verified).length,
    twoFA: activeUsers.filter(u => u.two_factor_enabled).length
  }
}

export function filterAndSortUsers(
  users: AdminUser[],
  filters: {
    searchQuery: string
    selectedRole: string
    selectedStatus: string
    sortBy: 'name' | 'email' | 'role' | 'status' | 'created' | 'last_seen'
    sortDir: 'asc' | 'desc'
  }
): AdminUser[] {
  // Filter users
  const filtered = users.filter(user => {
    // Exclude deleted users unless specifically filtering for them
    if (user.status === 'deleted' && filters.selectedStatus !== 'deleted') {
      return false
    }
    
    const matchesSearch = !filters.searchQuery || 
      user.full_name?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      user.phone?.includes(filters.searchQuery) ||
      user.company_name?.toLowerCase().includes(filters.searchQuery.toLowerCase())
    
    const matchesRole = filters.selectedRole === 'all' || user.role === filters.selectedRole
    const matchesStatus = filters.selectedStatus === 'all' || user.status === filters.selectedStatus
    
    return matchesSearch && matchesRole && matchesStatus
  })

  // Sort users
  return [...filtered].sort((a, b) => {
    let aVal: any, bVal: any
    
    switch (filters.sortBy) {
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
    
    if (aVal < bVal) return filters.sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return filters.sortDir === 'asc' ? 1 : -1
    return 0
  })
}

export function paginateUsers(users: AdminUser[], page: number, pageSize: number) {
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  return users.slice(startIndex, endIndex)
}

export function exportUsersToCSV(users: AdminUser[]): string {
  const csvContent = [
    ['Name', 'Email', 'Role', 'Status', 'Company', 'Phone', 'Created At', 'Last Sign In'],
    ...users.map(user => [
      user.full_name,
      user.email || '',
      user.role,
      user.status,
      user.company_name || '',
      user.phone || '',
      new Date(user.created_at).toLocaleDateString(),
      user.last_sign_in ? new Date(user.last_sign_in).toLocaleDateString() : 'Never'
    ])
  ].map(row => row.map(field => `"${field}"`).join(',')).join('\n')

  return csvContent
}

