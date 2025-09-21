import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { AdminUser } from '@/types/users'
import { getRoleColor, getStatusColor, getStatusIcon } from '@/lib/utils/user'
import { 
  Edit, 
  Trash2, 
  Eye, 
  Crown, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  UserCheck, 
  Shield,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserPlus,
  UserMinus,
  RefreshCw,
  Send
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface EnhancedUserTableProps {
  users: AdminUser[]
  selectedIds: Set<string>
  onSelectionChange: (userId: string, selected: boolean) => void
  onViewUser: (user: AdminUser) => void
  onEditUser: (user: AdminUser) => void
  onDeleteUser: (user: AdminUser) => void
  onStatusChange: (user: AdminUser, newStatus: string) => Promise<void>
  onRoleChange: (user: AdminUser, newRole: string) => Promise<void>
  onVerifyUser: (user: AdminUser) => Promise<void>
  onSuspendUser: (user: AdminUser) => Promise<void>
  onSendEmail: (user: AdminUser) => Promise<void>
}

export function EnhancedUserTable({
  users,
  selectedIds,
  onSelectionChange,
  onViewUser,
  onEditUser,
  onDeleteUser,
  onStatusChange,
  onRoleChange,
  onVerifyUser,
  onSuspendUser,
  onSendEmail
}: EnhancedUserTableProps) {
  const [changingStatus, setChangingStatus] = useState<Set<string>>(new Set())
  const [changingRole, setChangingRole] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())

  const handleStatusChange = async (user: AdminUser, newStatus: string) => {
    setChangingStatus(prev => new Set(prev).add(user.id))
    try {
      await onStatusChange(user, newStatus)
      toast.success(`User status updated to ${newStatus}`)
    } catch (error) {
      toast.error('Failed to update user status')
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
      toast.success(`User role updated to ${newRole}`)
    } catch (error) {
      toast.error('Failed to update user role')
    } finally {
      setChangingRole(prev => {
        const next = new Set(prev)
        next.delete(user.id)
        return next
      })
    }
  }

  const handleQuickAction = async (user: AdminUser, action: string) => {
    setActionLoading(prev => new Set(prev).add(user.id))
    try {
      switch (action) {
        case 'verify':
          await onVerifyUser(user)
          toast.success('User verified successfully')
          break
        case 'suspend':
          await onSuspendUser(user)
          toast.success('User suspended successfully')
          break
        case 'email':
          await onSendEmail(user)
          toast.success('Email sent successfully')
          break
        default:
          break
      }
    } catch (error) {
      toast.error(`Failed to ${action} user`)
    } finally {
      setActionLoading(prev => {
        const next = new Set(prev)
        next.delete(user.id)
        return next
      })
    }
  }

  const getQuickActions = (user: AdminUser) => {
    const actions = []
    
    if (user.status === 'pending') {
      actions.push({ label: 'Verify User', icon: CheckCircle, action: 'verify', color: 'text-green-600' })
    }
    
    if (user.status === 'active') {
      actions.push({ label: 'Suspend User', icon: XCircle, action: 'suspend', color: 'text-red-600' })
    }
    
    if (user.status === 'suspended') {
      actions.push({ label: 'Reactivate User', icon: UserCheck, action: 'verify', color: 'text-green-600' })
    }
    
    actions.push({ label: 'Send Email', icon: Send, action: 'email', color: 'text-blue-600' })
    
    return actions
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4">
              <label className="sr-only">Select all users</label>
              <input
                type="checkbox"
                checked={users.length > 0 && selectedIds.size === users.length}
                onChange={(e) => {
                  users.forEach(user => onSelectionChange(user.id, e.target.checked))
                }}
                className="rounded border-gray-300"
                aria-label="Select all users"
              />
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
            <th className="text-left py-3 px-4 font-medium text-gray-900">Role</th>
            <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
            <th className="text-left py-3 px-4 font-medium text-gray-900">Last Active</th>
            <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isChangingStatus = changingStatus.has(user.id)
            const isChangingRole = changingRole.has(user.id)
            const isLoading = actionLoading.has(user.id)
            const quickActions = getQuickActions(user)
            
            return (
              <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4">
                  <label className="sr-only">Select user {user.full_name || user.email}</label>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(user.id)}
                    onChange={(e) => onSelectionChange(user.id, e.target.checked)}
                    className="rounded border-gray-300"
                    aria-label={`Select user ${user.full_name || user.email}`}
                  />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {user.full_name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user.full_name || 'Unknown User'}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {user.phone && (
                        <div className="text-xs text-gray-400 flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2">
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleRoleChange(user, value)}
                      disabled={isChangingRole}
                    >
                      <SelectTrigger className="w-32 h-8" aria-label="Change user role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="provider">Provider</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    {isChangingRole && (
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2">
                    <Select
                      value={user.status}
                      onValueChange={(value) => handleStatusChange(user, value)}
                      disabled={isChangingStatus}
                    >
                      <SelectTrigger className="w-32 h-8" aria-label="Change user status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    {isChangingStatus && (
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm text-gray-600">
                    {user.last_sign_in ? (
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-gray-400" />
                        {new Date(user.last_sign_in).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-gray-400">Never</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2">
                    {/* Quick Actions */}
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuickAction(user, action.action)}
                        disabled={isLoading}
                        className={`h-8 w-8 p-0 ${action.color} hover:bg-gray-100`}
                        title={action.label}
                      >
                        {isLoading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <action.icon className="h-4 w-4" />
                        )}
                      </Button>
                    ))}
                    
                    {/* More Actions Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewUser(user)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditUser(user)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onDeleteUser(user)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
