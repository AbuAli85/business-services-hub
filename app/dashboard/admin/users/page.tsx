'use client'

import { useState, useEffect } from 'react'
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
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  useEffect(() => {
    fetchUsers()
  }, [searchQuery, selectedRole, selectedStatus])

  const fetchUsers = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // Enhanced mock data with permission information
      const mockUsers: AdminUser[] = [
        {
          id: '1',
          email: 'admin@businesshub.com',
          full_name: 'Admin User',
          role: 'admin',
          phone: '+968 1234 5678',
          created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
          last_sign_in: new Date(Date.now() - 3600000).toISOString(),
          status: 'active',
          permissions: ['admin:*'],
          is_verified: true,
          two_factor_enabled: true
        },
        {
          id: '2',
          email: 'fahad.alamri@example.com',
          full_name: 'Fahad Alamri',
          role: 'provider',
          phone: '+968 9515 3930',
          company_name: 'Digital Solutions',
          created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
          last_sign_in: new Date(Date.now() - 1800000).toISOString(),
          status: 'active',
          permissions: ['service:create', 'service:update:own', 'booking:read:own'],
          is_verified: true,
          two_factor_enabled: false
        },
        {
          id: '3',
          email: 'client@example.com',
          full_name: 'Ahmed Al-Rashid',
          role: 'client',
          phone: '+968 9876 5432',
          created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
          last_sign_in: new Date(Date.now() - 7200000).toISOString(),
          status: 'active',
          permissions: ['service:read:all', 'booking:create', 'booking:read:own'],
          is_verified: false,
          two_factor_enabled: false
        },
        {
          id: '4',
          email: 'moderator@businesshub.com',
          full_name: 'Sarah Johnson',
          role: 'moderator',
          phone: '+968 5555 1234',
          created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
          last_sign_in: new Date(Date.now() - 900000).toISOString(),
          status: 'active',
          permissions: ['user:read', 'user:suspend', 'service:approve', 'analytics:view'],
          is_verified: true,
          two_factor_enabled: true
        },
        {
          id: '5',
          email: 'support@businesshub.com',
          full_name: 'Mike Chen',
          role: 'support',
          phone: '+968 4444 5678',
          created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
          last_sign_in: new Date(Date.now() - 1800000).toISOString(),
          status: 'active',
          permissions: ['user:read', 'user:update', 'booking:read', 'booking:update'],
          is_verified: true,
          two_factor_enabled: false
        }
      ]

      setUsers(mockUsers)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching users:', error)
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
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-6 border-2 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200 group"
                >
                  <div className="flex items-center space-x-6">
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
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="hover:bg-green-50 hover:border-green-200 hover:text-green-700"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700"
                    >
                      <Key className="h-4 w-4 mr-1" />
                      Permissions
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700"
                    >
                      {user.status === 'active' ? <Lock className="h-4 w-4 mr-1" /> : <Unlock className="h-4 w-4 mr-1" />}
                      {user.status === 'active' ? 'Suspend' : 'Activate'}
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Pagination */}
              <div className="flex items-center justify-between pt-6 border-t">
                <div className="text-sm text-gray-600">
                  Showing {filteredUsers.length} of {users.length} users
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Badge variant="outline" className="px-3">1</Badge>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
