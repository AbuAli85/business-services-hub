'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  Users, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  Search,
  Filter,
  Eye,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  Crown,
  Key,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

interface Permission {
  id: string
  name: string
  description: string
  category: 'user' | 'service' | 'booking' | 'system' | 'analytics'
  resource: string
  action: string
  scope: 'own' | 'all' | 'team'
}

interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  is_system: boolean
  user_count: number
  created_at: string
}

interface UserPermission {
  user_id: string
  user_name: string
  user_email: string
  role: string
  custom_permissions: string[]
  is_active: boolean
  last_login: string
}

const SYSTEM_PERMISSIONS: Permission[] = [
  // User Management
  { id: 'user:create', name: 'Create Users', description: 'Create new user accounts', category: 'user', resource: 'user', action: 'create', scope: 'all' },
  { id: 'user:read', name: 'View Users', description: 'View user information and profiles', category: 'user', resource: 'user', action: 'read', scope: 'all' },
  { id: 'user:update', name: 'Edit Users', description: 'Modify user information and settings', category: 'user', resource: 'user', action: 'update', scope: 'all' },
  { id: 'user:delete', name: 'Delete Users', description: 'Remove user accounts from the system', category: 'user', resource: 'user', action: 'delete', scope: 'all' },
  { id: 'user:suspend', name: 'Suspend Users', description: 'Temporarily disable user accounts', category: 'user', resource: 'user', action: 'suspend', scope: 'all' },
  { id: 'user:verify', name: 'Verify Users', description: 'Verify user accounts and documents', category: 'user', resource: 'user', action: 'verify', scope: 'all' },
  
  // Service Management
  { id: 'service:create', name: 'Create Services', description: 'Create new service listings', category: 'service', resource: 'service', action: 'create', scope: 'all' },
  { id: 'service:read', name: 'View Services', description: 'View all service listings', category: 'service', resource: 'service', action: 'read', scope: 'all' },
  { id: 'service:update', name: 'Edit Services', description: 'Modify service information', category: 'service', resource: 'service', action: 'update', scope: 'all' },
  { id: 'service:delete', name: 'Delete Services', description: 'Remove service listings', category: 'service', resource: 'service', action: 'delete', scope: 'all' },
  { id: 'service:approve', name: 'Approve Services', description: 'Approve pending service listings', category: 'service', resource: 'service', action: 'approve', scope: 'all' },
  { id: 'service:feature', name: 'Feature Services', description: 'Feature services on homepage', category: 'service', resource: 'service', action: 'feature', scope: 'all' },
  
  // Booking Management
  { id: 'booking:create', name: 'Create Bookings', description: 'Create bookings on behalf of users', category: 'booking', resource: 'booking', action: 'create', scope: 'all' },
  { id: 'booking:read', name: 'View Bookings', description: 'View all booking information', category: 'booking', resource: 'booking', action: 'read', scope: 'all' },
  { id: 'booking:update', name: 'Edit Bookings', description: 'Modify booking details and status', category: 'booking', resource: 'booking', action: 'update', scope: 'all' },
  { id: 'booking:delete', name: 'Delete Bookings', description: 'Remove bookings from the system', category: 'booking', resource: 'booking', action: 'delete', scope: 'all' },
  { id: 'booking:refund', name: 'Process Refunds', description: 'Process booking refunds', category: 'booking', resource: 'booking', action: 'refund', scope: 'all' },
  
  // System Management
  { id: 'system:settings', name: 'System Settings', description: 'Modify system-wide settings', category: 'system', resource: 'system', action: 'settings', scope: 'all' },
  { id: 'system:backup', name: 'Data Backup', description: 'Create and manage data backups', category: 'system', resource: 'system', action: 'backup', scope: 'all' },
  { id: 'system:logs', name: 'View Logs', description: 'Access system logs and audit trails', category: 'system', resource: 'system', action: 'logs', scope: 'all' },
  { id: 'system:maintenance', name: 'System Maintenance', description: 'Perform system maintenance tasks', category: 'system', resource: 'system', action: 'maintenance', scope: 'all' },
  
  // Analytics & Reports
  { id: 'analytics:view', name: 'View Analytics', description: 'Access platform analytics and reports', category: 'analytics', resource: 'analytics', action: 'view', scope: 'all' },
  { id: 'analytics:export', name: 'Export Data', description: 'Export analytics data and reports', category: 'analytics', resource: 'analytics', action: 'export', scope: 'all' },
  { id: 'analytics:reports', name: 'Generate Reports', description: 'Create custom reports', category: 'analytics', resource: 'analytics', action: 'reports', scope: 'all' },
]

const DEFAULT_ROLES: Role[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full system access with all permissions',
    permissions: SYSTEM_PERMISSIONS.map(p => p.id),
    is_system: true,
    user_count: 0,
    created_at: new Date().toISOString()
  },
  {
    id: 'super_admin',
    name: 'Super Administrator',
    description: 'Highest level access including system management',
    permissions: SYSTEM_PERMISSIONS.map(p => p.id),
    is_system: true,
    user_count: 0,
    created_at: new Date().toISOString()
  },
  {
    id: 'moderator',
    name: 'Moderator',
    description: 'Content and user moderation capabilities',
    permissions: [
      'user:read', 'user:suspend', 'user:verify',
      'service:read', 'service:approve', 'service:update',
      'booking:read', 'booking:update',
      'analytics:view'
    ],
    is_system: false,
    user_count: 0,
    created_at: new Date().toISOString()
  },
  {
    id: 'support',
    name: 'Support Agent',
    description: 'Customer support and basic user management',
    permissions: [
      'user:read', 'user:update',
      'service:read',
      'booking:read', 'booking:update',
      'analytics:view'
    ],
    is_system: false,
    user_count: 0,
    created_at: new Date().toISOString()
  }
]

export default function AdminPermissionsPage() {
  const [activeTab, setActiveTab] = useState('roles')
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES)
  const [users, setUsers] = useState<UserPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] as string[] })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load users with their permissions
      const mockUsers: UserPermission[] = [
        {
          user_id: '1',
          user_name: 'Admin User',
          user_email: 'admin@businesshub.com',
          role: 'admin',
          custom_permissions: [],
          is_active: true,
          last_login: new Date(Date.now() - 3600000).toISOString()
        },
        {
          user_id: '2',
          user_name: 'Fahad Alamri',
          user_email: 'fahad.alamri@example.com',
          role: 'provider',
          custom_permissions: ['service:approve'],
          is_active: true,
          last_login: new Date(Date.now() - 1800000).toISOString()
        },
        {
          user_id: '3',
          user_name: 'Ahmed Al-Rashid',
          user_email: 'client@example.com',
          role: 'client',
          custom_permissions: [],
          is_active: true,
          last_login: new Date(Date.now() - 7200000).toISOString()
        }
      ]
      setUsers(mockUsers)
      setLoading(false)
    } catch (error) {
      console.error('Error loading permissions data:', error)
      setLoading(false)
    }
  }

  const handleCreateRole = () => {
    if (!newRole.name.trim()) {
      toast.error('Role name is required')
      return
    }

    const role: Role = {
      id: newRole.name.toLowerCase().replace(/\s+/g, '_'),
      name: newRole.name,
      description: newRole.description,
      permissions: newRole.permissions,
      is_system: false,
      user_count: 0,
      created_at: new Date().toISOString()
    }

    setRoles([...roles, role])
    setNewRole({ name: '', description: '', permissions: [] })
    toast.success('Role created successfully')
  }

  const handleUpdateRole = (roleId: string, updates: Partial<Role>) => {
    setRoles(roles.map(role => 
      role.id === roleId ? { ...role, ...updates } : role
    ))
    setEditingRole(null)
    toast.success('Role updated successfully')
  }

  const handleDeleteRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId)
    if (role?.is_system) {
      toast.error('Cannot delete system roles')
      return
    }
    
    setRoles(roles.filter(role => role.id !== roleId))
    toast.success('Role deleted successfully')
  }

  const handleAssignRole = (userId: string, roleId: string) => {
    setUsers(users.map(user => 
      user.user_id === userId ? { ...user, role: roleId } : user
    ))
    toast.success('Role assigned successfully')
  }

  const getPermissionCategory = (category: string) => {
    switch (category) {
      case 'user': return 'User Management'
      case 'service': return 'Service Management'
      case 'booking': return 'Booking Management'
      case 'system': return 'System Management'
      case 'analytics': return 'Analytics & Reports'
      default: return category
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'super_admin': return 'bg-purple-100 text-purple-800'
      case 'moderator': return 'bg-blue-100 text-blue-800'
      case 'support': return 'bg-green-100 text-green-800'
      case 'provider': return 'bg-orange-100 text-orange-800'
      case 'client': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
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
      <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Permission Management</h1>
            <p className="text-red-100 text-lg mb-4">
              Manage user roles, permissions, and access control across the platform
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-1" />
                <span>{roles.length} Roles</span>
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span>{users.length} Users</span>
              </div>
              <div className="flex items-center">
                <Key className="h-4 w-4 mr-1" />
                <span>{SYSTEM_PERMISSIONS.length} Permissions</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => setActiveTab('roles')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => setActiveTab('users')}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Assign Roles
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="users">User Assignments</TabsTrigger>
          <TabsTrigger value="permissions">Permission Matrix</TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-6">
          {/* Create New Role */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                Create New Role
              </CardTitle>
              <CardDescription>
                Define custom roles with specific permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Role Name</label>
                  <Input
                    placeholder="Enter role name"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    placeholder="Enter role description"
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Select Permissions</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto border rounded-lg p-4">
                  {SYSTEM_PERMISSIONS.map((permission) => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission.id}
                        checked={newRole.permissions.includes(permission.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewRole({
                              ...newRole,
                              permissions: [...newRole.permissions, permission.id]
                            })
                          } else {
                            setNewRole({
                              ...newRole,
                              permissions: newRole.permissions.filter(p => p !== permission.id)
                            })
                          }
                        }}
                      />
                      <label htmlFor={permission.id} className="text-sm">
                        {permission.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button onClick={handleCreateRole} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Create Role
              </Button>
            </CardContent>
          </Card>

          {/* Existing Roles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <Card key={role.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        {role.is_system && <Crown className="h-4 w-4 mr-2 text-yellow-500" />}
                        {role.name}
                      </CardTitle>
                      <CardDescription>{role.description}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingRole(role)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!role.is_system && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRole(role.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Permissions:</span>
                      <Badge variant="outline">{role.permissions.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Users:</span>
                      <Badge variant="outline">{role.user_count}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Type:</span>
                      <Badge className={role.is_system ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                        {role.is_system ? 'System' : 'Custom'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Role Assignments</CardTitle>
              <CardDescription>
                Assign roles and manage user permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {user.user_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium">{user.user_name}</h4>
                        <p className="text-sm text-gray-500">{user.user_email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getRoleColor(user.role)}>
                            {user.role}
                          </Badge>
                          {user.is_active ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">Inactive</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Select value={user.role || 'client'} onValueChange={(value) => handleAssignRole(user.user_id, value)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Permission Matrix</CardTitle>
              <CardDescription>
                Overview of all permissions and their assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {['user', 'service', 'booking', 'system', 'analytics'].map((category) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold mb-3">{getPermissionCategory(category)}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {SYSTEM_PERMISSIONS
                        .filter(p => p.category === category)
                        .map((permission) => (
                          <div key={permission.id} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{permission.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {permission.scope}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{permission.description}</p>
                            <div className="mt-2">
                              <span className="text-xs text-gray-500">
                                {roles.filter(role => role.permissions.includes(permission.id)).length} roles
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
