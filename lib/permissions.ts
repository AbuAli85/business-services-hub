/**
 * Advanced Permissions System
 * Provides fine-grained access control for different user roles
 */

export type Permission = 
  // User Management
  | 'users:read' | 'users:create' | 'users:update' | 'users:delete'
  | 'users:assign_roles' | 'users:view_analytics'
  
  // Service Management
  | 'services:read' | 'services:create' | 'services:update' | 'services:delete'
  | 'services:approve' | 'services:feature' | 'services:view_analytics'
  
  // Booking Management
  | 'bookings:read' | 'bookings:create' | 'bookings:update' | 'bookings:delete'
  | 'bookings:approve' | 'bookings:cancel' | 'bookings:view_analytics'
  
  // Invoice Management
  | 'invoices:read' | 'invoices:create' | 'invoices:update' | 'invoices:delete'
  | 'invoices:approve' | 'invoices:view_analytics'
  
  // Review Management
  | 'reviews:read' | 'reviews:create' | 'reviews:update' | 'reviews:delete'
  | 'reviews:moderate'
  
  // Analytics & Reporting
  | 'analytics:view' | 'analytics:export' | 'reports:create' | 'reports:view'
  
  // System Administration
  | 'system:settings' | 'system:maintenance' | 'system:backup'
  | 'system:logs' | 'system:health'
  
  // Communication
  | 'messages:read' | 'messages:send' | 'notifications:manage'
  
  // Company Management
  | 'companies:read' | 'companies:create' | 'companies:update' | 'companies:delete'
  | 'companies:approve'

export type Role = 'admin' | 'provider' | 'client' | 'staff' | 'manager'

export interface PermissionSet {
  role: Role
  permissions: Permission[]
  restrictions?: {
    ownDataOnly?: boolean
    specificCategories?: string[]
    maxServices?: number
    maxBookings?: number
  }
}

export const ROLE_PERMISSIONS: Record<Role, PermissionSet> = {
  admin: {
    role: 'admin',
    permissions: [
      // Full access to everything
      'users:read', 'users:create', 'users:update', 'users:delete', 'users:assign_roles', 'users:view_analytics',
      'services:read', 'services:create', 'services:update', 'services:delete', 'services:approve', 'services:feature', 'services:view_analytics',
      'bookings:read', 'bookings:create', 'bookings:update', 'bookings:delete', 'bookings:approve', 'bookings:cancel', 'bookings:view_analytics',
      'invoices:read', 'invoices:create', 'invoices:update', 'invoices:delete', 'invoices:approve', 'invoices:view_analytics',
      'reviews:read', 'reviews:create', 'reviews:update', 'reviews:delete', 'reviews:moderate',
      'analytics:view', 'analytics:export', 'reports:create', 'reports:view',
      'system:settings', 'system:maintenance', 'system:backup', 'system:logs', 'system:health',
      'messages:read', 'messages:send', 'notifications:manage',
      'companies:read', 'companies:create', 'companies:update', 'companies:delete', 'companies:approve'
    ]
  },
  
  manager: {
    role: 'manager',
    permissions: [
      'users:read', 'users:view_analytics',
      'services:read', 'services:approve', 'services:feature', 'services:view_analytics',
      'bookings:read', 'bookings:update', 'bookings:approve', 'bookings:cancel', 'bookings:view_analytics',
      'invoices:read', 'invoices:approve', 'invoices:view_analytics',
      'reviews:read', 'reviews:moderate',
      'analytics:view', 'reports:create', 'reports:view',
      'messages:read', 'messages:send',
      'companies:read', 'companies:approve'
    ]
  },
  
  provider: {
    role: 'provider',
    permissions: [
      'services:read', 'services:create', 'services:update', 'services:delete', 'services:view_analytics',
      'bookings:read', 'bookings:update', 'bookings:view_analytics',
      'invoices:read', 'invoices:create', 'invoices:update', 'invoices:view_analytics',
      'reviews:read',
      'analytics:view',
      'messages:read', 'messages:send',
      'companies:read', 'companies:update'
    ],
    restrictions: {
      ownDataOnly: true,
      maxServices: 50
    }
  },
  
  staff: {
    role: 'staff',
    permissions: [
      'users:read',
      'services:read', 'services:approve',
      'bookings:read', 'bookings:update', 'bookings:approve', 'bookings:cancel',
      'invoices:read', 'invoices:approve',
      'reviews:read', 'reviews:moderate',
      'analytics:view',
      'messages:read', 'messages:send'
    ]
  },
  
  client: {
    role: 'client',
    permissions: [
      'services:read',
      'bookings:read', 'bookings:create', 'bookings:update',
      'invoices:read',
      'reviews:read', 'reviews:create',
      'messages:read', 'messages:send'
    ],
    restrictions: {
      ownDataOnly: true
    }
  }
}

export class PermissionManager {
  private userRole: Role | null
  private userId: string | null

  constructor(userRole: Role | null, userId: string | null) {
    this.userRole = userRole
    this.userId = userId
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission: Permission): boolean {
    if (!this.userRole) return false
    
    const roleConfig = ROLE_PERMISSIONS[this.userRole]
    return roleConfig.permissions.includes(permission)
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission))
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission))
  }

  /**
   * Check if user can perform action on specific resource
   */
  canAccessResource(resourceType: string, resourceId: string, action: string): boolean {
    if (!this.userRole) return false

    const roleConfig = ROLE_PERMISSIONS[this.userRole]
    
    // Admin can access everything
    if (this.userRole === 'admin') return true

    // Check if user can only access their own data
    if (roleConfig.restrictions?.ownDataOnly) {
      // This would need to be implemented with actual data checks
      // For now, we'll assume the caller will verify ownership
      return true
    }

    return this.hasPermission(`${resourceType}:${action}` as Permission)
  }

  /**
   * Get user's effective permissions
   */
  getEffectivePermissions(): Permission[] {
    if (!this.userRole) return []
    return ROLE_PERMISSIONS[this.userRole].permissions
  }

  /**
   * Get user's restrictions
   */
  getRestrictions() {
    if (!this.userRole) return null
    return ROLE_PERMISSIONS[this.userRole].restrictions
  }

  /**
   * Check if user can create more services (for providers)
   */
  canCreateService(currentServiceCount: number): boolean {
    if (!this.hasPermission('services:create')) return false
    
    const restrictions = this.getRestrictions()
    if (restrictions?.maxServices) {
      return currentServiceCount < restrictions.maxServices
    }
    
    return true
  }

  /**
   * Check if user can access analytics
   */
  canViewAnalytics(): boolean {
    return this.hasPermission('analytics:view')
  }

  /**
   * Check if user can manage users
   */
  canManageUsers(): boolean {
    return this.hasAnyPermission(['users:create', 'users:update', 'users:delete', 'users:assign_roles'])
  }

  /**
   * Check if user can approve content
   */
  canApproveContent(): boolean {
    return this.hasAnyPermission(['services:approve', 'bookings:approve', 'invoices:approve', 'companies:approve'])
  }
}

/**
 * Hook for using permissions in React components
 */
export function usePermissions(userRole: Role | null, userId: string | null) {
  const permissionManager = new PermissionManager(userRole, userId)
  
  return {
    hasPermission: (permission: Permission) => permissionManager.hasPermission(permission),
    hasAnyPermission: (permissions: Permission[]) => permissionManager.hasAnyPermission(permissions),
    hasAllPermissions: (permissions: Permission[]) => permissionManager.hasAllPermissions(permissions),
    canAccessResource: (resourceType: string, resourceId: string, action: string) => 
      permissionManager.canAccessResource(resourceType, resourceId, action),
    canCreateService: (currentServiceCount: number) => permissionManager.canCreateService(currentServiceCount),
    canViewAnalytics: () => permissionManager.canViewAnalytics(),
    canManageUsers: () => permissionManager.canManageUsers(),
    canApproveContent: () => permissionManager.canApproveContent(),
    getEffectivePermissions: () => permissionManager.getEffectivePermissions(),
    getRestrictions: () => permissionManager.getRestrictions()
  }
}
