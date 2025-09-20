import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdminUser } from '@/types/users'
import { getRoleColor, getStatusColor, getStatusIcon } from '@/lib/utils/user'
import { Edit, Trash2, Eye, Crown, Mail, Phone, Calendar, Clock, UserCheck, Shield } from 'lucide-react'

interface UserTableProps {
  users: AdminUser[]
  selectedIds: Set<string>
  onSelectionChange: (userId: string, selected: boolean) => void
  onViewUser: (user: AdminUser) => void
  onEditUser: (user: AdminUser) => void
  onDeleteUser: (user: AdminUser) => void
  onStatusChange: (user: AdminUser, newStatus: string) => Promise<void>
  onRoleChange: (user: AdminUser, newRole: string) => Promise<void>
}

export function UserTable({
  users,
  selectedIds,
  onSelectionChange,
  onViewUser,
  onEditUser,
  onDeleteUser,
  onStatusChange,
  onRoleChange
}: UserTableProps) {
  const [changingStatus, setChangingStatus] = useState<Set<string>>(new Set())
  const [changingRole, setChangingRole] = useState<Set<string>>(new Set())

  const handleStatusChange = async (user: AdminUser, newStatus: string) => {
    setChangingStatus(prev => new Set(prev).add(user.id))
    try {
      await onStatusChange(user, newStatus)
    } finally {
      setChangingStatus(prev => {
        const next = new Set(prev)
        next.delete(user.id)
        return next
      })
    }
  }

  const handleRoleChange = async (user: AdminUser, newRole: string) => {
    setChangingRole(prev => new Set(prev).add(user.id))
    try {
      await onRoleChange(user, newRole)
    } finally {
      setChangingRole(prev => {
        const next = new Set(prev)
        next.delete(user.id)
        return next
      })
    }
  }

  return (
    <div className="space-y-4">
      {users.map((user) => {
        const StatusIcon = getStatusIcon(user.status)
        const isChangingStatus = changingStatus.has(user.id)
        const isChangingRole = changingRole.has(user.id)

        return (
          <div
            key={user.id}
            className="flex items-center justify-between p-6 bg-white border-2 border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-center space-x-4">
              <input 
                type="checkbox" 
                className="mt-1" 
                checked={selectedIds.has(user.id)} 
                onChange={(e) => onSelectionChange(user.id, e.target.checked)}
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
                    <StatusIcon className="h-4 w-4 mr-1" />
                    <span>{user.status.toUpperCase()}</span>
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
                disabled={isChangingRole}
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
                disabled={isChangingStatus}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                onClick={() => onViewUser(user)}
                variant="outline" 
                size="sm"
                title="View user details"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button 
                onClick={() => onEditUser(user)}
                variant="outline" 
                size="sm"
                title="Edit user"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                onClick={() => onDeleteUser(user)}
                variant="outline" 
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Delete user"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

