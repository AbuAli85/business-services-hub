import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdminUser } from '@/types/users'
import { getRoleColor, getStatusColor, getStatusIcon } from '@/lib/utils/user'
import { Crown, Building2, UserCheck, Shield } from 'lucide-react'

interface UserGridProps {
  users: AdminUser[]
  selectedIds: Set<string>
  onSelectionChange: (userId: string, selected: boolean) => void
  onStatusChange: (user: AdminUser, newStatus: string) => Promise<void>
  onRoleChange: (user: AdminUser, newRole: string) => Promise<void>
}

export function UserGrid({
  users,
  selectedIds,
  onSelectionChange,
  onStatusChange,
  onRoleChange
}: UserGridProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {users.map((user) => {
        const StatusIcon = getStatusIcon(user.status)
        const isChangingStatus = changingStatus.has(user.id)
        const isChangingRole = changingRole.has(user.id)

        return (
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
                  onChange={(e) => onSelectionChange(user.id, e.target.checked)}
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
                    <StatusIcon className="h-4 w-4 mr-1" />
                    <span>{user.status.toUpperCase()}</span>
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
                  disabled={isChangingRole}
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
                  disabled={isChangingStatus}
                >
                  <SelectTrigger className="w-24 text-xs">
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
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

