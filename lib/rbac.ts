export type Permission =
  | 'service:create' 
  | 'service:update:own' 
  | 'service:delete:own'
  | 'service:read:all'
  | 'booking:create'
  | 'booking:read:own' 
  | 'booking:update:own'
  | 'booking:delete:own'
  | 'company:manage:own'
  | 'invoice:read:own'
  | 'invoice:create:own'
  | 'review:create:own'
  | 'review:read:all'
  | 'user:manage:all'
  | 'admin:*';

export const rolePermissions: Record<string, Permission[]> = {
  admin: ['admin:*'],
  provider: [
    'service:create',
    'service:update:own', 
    'service:delete:own',
    'service:read:all',
    'booking:read:own',
    'booking:update:own',
    'company:manage:own',
    'invoice:read:own',
    'invoice:create:own',
    'review:read:all'
  ],
  client: [
    'service:read:all',
    'booking:create',
    'booking:read:own', 
    'booking:update:own',
    'invoice:read:own',
    'review:create:own',
    'review:read:all'
  ],
  staff: [
    'service:read:all',
    'booking:read:own',
    'booking:update:own',
    'invoice:read:own'
  ]
};

export function hasPerm(role: string, permission: Permission): boolean {
  const perms = rolePermissions[role] ?? [];
  return perms.includes('admin:*') || perms.includes(permission);
}

export function hasAnyPerm(role: string, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPerm(role, permission));
}

export function hasAllPerms(role: string, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPerm(role, permission));
}

// Helper to get user role from session
export function getUserRole(userMetadata: any): string {
  return userMetadata?.role || 'client';
}

// Type guard for checking if user can access resource
export function canAccessResource(
  userRole: string, 
  resourceOwnerId: string, 
  userId: string,
  permission: Permission
): boolean {
  if (hasPerm(userRole, 'admin:*')) return true;
  if (hasPerm(userRole, permission)) {
    // For own resources, check ownership
    if (permission.includes(':own')) {
      return resourceOwnerId === userId;
    }
    return true;
  }
  return false;
}
