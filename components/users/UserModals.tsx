import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AdminUser } from '@/types/users'
import { getRoleColor, getStatusColor, getStatusIcon } from '@/lib/utils/user'
import { XCircle, AlertCircle, Mail, Phone, Calendar, Clock, UserCheck, Shield } from 'lucide-react'

interface UserModalsProps {
  showAddUserModal: boolean
  onCloseAddUserModal: () => void
  onInviteUser: (email: string, role: string) => Promise<void>
  showUserDetailsModal: boolean
  onCloseUserDetailsModal: () => void
  selectedUser: AdminUser | null
  onEditUser: (user: AdminUser) => void
  showDeleteConfirm: boolean
  onCloseDeleteConfirm: () => void
  userToDelete: AdminUser | null
  onConfirmDelete: () => Promise<void>
}

export function UserModals({
  showAddUserModal,
  onCloseAddUserModal,
  onInviteUser,
  showUserDetailsModal,
  onCloseUserDetailsModal,
  selectedUser,
  onEditUser,
  showDeleteConfirm,
  onCloseDeleteConfirm,
  userToDelete,
  onConfirmDelete
}: UserModalsProps) {
  const [inviteLoading, setInviteLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleInviteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const email = formData.get('email') as string
    const role = formData.get('role') as string
    
    setInviteLoading(true)
    try {
      await onInviteUser(email, role)
      onCloseAddUserModal()
    } catch (error) {
      console.error('Error inviting user:', error)
    } finally {
      setInviteLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    setDeleteLoading(true)
    try {
      await onConfirmDelete()
    } catch (error) {
      console.error('Error deleting user:', error)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Invite New User</h3>
            <form onSubmit={handleInviteSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <Input
                    name="email"
                    type="email"
                    required
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <Select name="role" defaultValue="client">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="provider">Provider</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCloseAddUserModal}
                  disabled={inviteLoading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={inviteLoading}
                >
                  {inviteLoading ? 'Sending...' : 'Send Invitation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">User Details</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={onCloseUserDetailsModal}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-700 font-bold text-xl">
                    {selectedUser.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold">{selectedUser.full_name}</h4>
                  <p className="text-gray-600">{selectedUser.email || 'No email'}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className={getRoleColor(selectedUser.role)}>
                      {selectedUser.role.toUpperCase()}
                    </Badge>
                    <Badge className={getStatusColor(selectedUser.status)}>
                      {selectedUser.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Company</label>
                  <p className="text-gray-900">{selectedUser.company_name || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-gray-900">{selectedUser.phone || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Created</label>
                  <p className="text-gray-900">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Sign In</label>
                  <p className="text-gray-900">
                    {selectedUser.last_sign_in ? new Date(selectedUser.last_sign_in).toLocaleDateString() : 'Never'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Verified</label>
                  <p className="text-gray-900">{selectedUser.is_verified ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">2FA Enabled</label>
                  <p className="text-gray-900">{selectedUser.two_factor_enabled ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={onCloseUserDetailsModal}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  onCloseUserDetailsModal()
                  onEditUser(selectedUser)
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Edit User
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">Delete User</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{userToDelete.full_name}</strong>? 
              This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={onCloseDeleteConfirm}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

