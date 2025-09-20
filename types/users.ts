export interface BackendUser {
  id: string
  email: string | null
  full_name: string
  role: string
  status: string
  phone?: string | null
  company_name?: string | null
  created_at: string
  last_sign_in?: string | null
  is_verified?: boolean | string
  two_factor_enabled?: boolean
  verification_status?: string
}

export interface AdminUser {
  id: string
  email: string | null
  full_name: string
  role: 'admin' | 'manager' | 'provider' | 'client' | 'staff' | 'moderator' | 'support'
  phone?: string
  company_name?: string
  created_at: string
  last_sign_in?: string
  status: 'active' | 'inactive' | 'suspended' | 'pending' | 'deleted'
  permissions?: string[]
  is_verified?: boolean
  two_factor_enabled?: boolean
  verification_status?: 'pending' | 'approved' | 'rejected'
}

export interface UserFilters {
  searchQuery: string
  selectedRole: string
  selectedStatus: string
  sortBy: 'name' | 'email' | 'role' | 'status' | 'created' | 'last_seen'
  sortDir: 'asc' | 'desc'
  page: number
  pageSize: number
}

export interface UserStats {
  total: number
  active: number
  pending: number
  suspended: number
  admins: number
  providers: number
  clients: number
  verified: number
  twoFA: number
}

export interface UserAction {
  type: 'status_change' | 'role_change' | 'bulk_action' | 'delete' | 'invite'
  userId?: string
  userIds?: string[]
  oldValue?: string
  newValue?: string
  timestamp: string
  actor: string
}

