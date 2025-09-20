'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import { useUsers } from '@/hooks/useUsers'
import { UserStats } from '@/components/users/UserStats'
import { UserFilters } from '@/components/users/UserFilters'
import { UserTable } from '@/components/users/UserTable'
import { UserGrid } from '@/components/users/UserGrid'
import { UserModals } from '@/components/users/UserModals'
import { AdminUser, UserFilters as UserFiltersType } from '@/types/users'
import { calculateUserStats, filterAndSortUsers, paginateUsers, exportUsersToCSV } from '@/lib/utils/user'
import { 
  Plus, 
  RefreshCw, 
  Download, 
  Upload, 
  Users,
  CheckCircle2,
  Lock
} from 'lucide-react'

export default function AdminUsersPage() {
  // Data fetching
  const { users, loading, error, isFetching, refetch, updateUser, deleteUser, inviteUser, bulkAction } = useUsers({
    autoRefresh: true,
    refreshInterval: 60000,
    enableRealtime: true
  })

  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null)

  // Filters state
  const [filters, setFilters] = useState<UserFiltersType>({
    searchQuery: '',
    selectedRole: 'all',
    selectedStatus: 'all',
    sortBy: 'created',
    sortDir: 'desc',
    page: 1,
    pageSize: 20
  })

  // Computed values
  const stats = useMemo(() => calculateUserStats(users), [users])
  const filteredUsers = useMemo(() => filterAndSortUsers(users, filters), [users, filters])
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / filters.pageSize))
  const currentPage = Math.min(filters.page, totalPages)
  const pagedUsers = useMemo(() => paginateUsers(filteredUsers, currentPage, filters.pageSize), [filteredUsers, currentPage, filters.pageSize])

  // Event handlers
  const handleFiltersChange = useCallback((newFilters: Partial<UserFiltersType>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      selectedRole: 'all',
      selectedStatus: 'all',
      sortBy: 'created',
      sortDir: 'desc',
      page: 1,
      pageSize: 20
    })
  }, [])

  const handleSelectionChange = useCallback((userId: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (selected) {
        next.add(userId)
      } else {
        next.delete(userId)
      }
      return next
    })
  }, [])

  const handleViewUser = useCallback((user: AdminUser) => {
    setSelectedUser(user)
    setShowUserDetailsModal(true)
  }, [])

  const handleEditUser = useCallback((user: AdminUser) => {
    setSelectedUser(user)
    setShowUserDetailsModal(true)
  }, [])

  const handleDeleteUser = useCallback((user: AdminUser) => {
    setUserToDelete(user)
    setShowDeleteConfirm(true)
  }, [])

  const handleStatusChange = useCallback(async (user: AdminUser, newStatus: string) => {
    try {
      const backendStatus = newStatus === 'active' ? 'approved' : 
                          newStatus === 'suspended' ? 'suspended' : 
                          newStatus === 'pending' ? 'pending' : 
                          newStatus === 'inactive' ? 'rejected' : 
                          newStatus === 'deleted' ? 'deleted' : 'pending'
      
      console.log('🔄 Status change:', {
        userId: user.id,
        userName: user.full_name,
        currentStatus: user.status,
        newStatus,
        backendStatus
      })
      
      await updateUser(user.id, { status: backendStatus as any })
      
      // Force refresh the data to ensure UI updates
      await refetch(true)
      
      toast.success(`${user.full_name}'s status updated to ${newStatus}`)
    } catch (err: any) {
      console.error('❌ Status change error:', err)
      toast.error(err.message)
    }
  }, [updateUser, refetch])

  const handleRoleChange = useCallback(async (user: AdminUser, newRole: string) => {
    try {
      await updateUser(user.id, { role: newRole as any })
      toast.success(`${user.full_name}'s role updated to ${newRole}`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }, [updateUser])

  const handleBulkAction = useCallback(async (action: 'approve' | 'suspend' | 'delete') => {
    if (selectedIds.size === 0) return
    
    try {
      const status = action === 'approve' ? 'approved' : action === 'suspend' ? 'suspended' : 'rejected'
      await bulkAction(Array.from(selectedIds), 'status', status)
      setSelectedIds(new Set())
      toast.success(`Bulk ${action} completed for ${selectedIds.size} users`)
    } catch (e: any) {
      toast.error(e.message)
    }
  }, [selectedIds, bulkAction])

  const handleInviteUser = useCallback(async (email: string, role: string) => {
    try {
      await inviteUser(email, role)
      toast.success(`Invitation sent to ${email}`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }, [inviteUser])

  const handleConfirmDelete = useCallback(async () => {
    if (!userToDelete) return
    
    try {
      await deleteUser(userToDelete.id)
      toast.success(`${userToDelete.full_name} has been deleted`)
      setShowDeleteConfirm(false)
      setUserToDelete(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }, [userToDelete, deleteUser])

  const handleExportUsers = useCallback(() => {
    try {
      const csvContent = exportUsersToCSV(users)
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success('Users exported successfully')
    } catch (err: any) {
      toast.error('Export failed: ' + err.message)
    }
  }, [users])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Users</h2>
          <p className="text-gray-600">Please wait while we fetch user data...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="h-16 w-16 text-red-500 mx-auto mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Users</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => refetch(true)} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600 mt-1">Manage platform users, roles, and permissions</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => refetch(true)}
                disabled={isFetching}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button 
                onClick={() => setShowAddUserModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <UserStats stats={stats} />

        {/* Filters */}
        <UserFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalUsers={filteredUsers.length}
        />

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedIds.size} user{selectedIds.size > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleBulkAction('approve')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('suspend')}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <Lock className="h-4 w-4 mr-1" />
                    Suspend
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Users Table/Grid */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Users ({filteredUsers.length})</CardTitle>
                <CardDescription>
                  Manage user accounts, roles, and permissions
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleExportUsers}
                  variant="outline" 
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button 
                  onClick={() => toast('Import functionality coming soon')}
                  variant="outline" 
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {pagedUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-500 mb-6">
                  Try adjusting your search or filter criteria
                </p>
                <Button onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              </div>
            ) : viewMode === 'list' ? (
              <UserTable
                users={pagedUsers}
                selectedIds={selectedIds}
                onSelectionChange={handleSelectionChange}
                onViewUser={handleViewUser}
                onEditUser={handleEditUser}
                onDeleteUser={handleDeleteUser}
                onStatusChange={handleStatusChange}
                onRoleChange={handleRoleChange}
              />
            ) : (
              <UserGrid
                users={pagedUsers}
                selectedIds={selectedIds}
                onSelectionChange={handleSelectionChange}
                onStatusChange={handleStatusChange}
                onRoleChange={handleRoleChange}
              />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * filters.pageSize + 1}-{Math.min(currentPage * filters.pageSize, filteredUsers.length)} of {filteredUsers.length} users
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === 1} 
                    onClick={() => handleFiltersChange({ page: Math.max(1, currentPage - 1) })}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleFiltersChange({ page: pageNum })}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === totalPages} 
                    onClick={() => handleFiltersChange({ page: Math.min(totalPages, currentPage + 1) })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <UserModals
        showAddUserModal={showAddUserModal}
        onCloseAddUserModal={() => setShowAddUserModal(false)}
        onInviteUser={handleInviteUser}
        showUserDetailsModal={showUserDetailsModal}
        onCloseUserDetailsModal={() => setShowUserDetailsModal(false)}
        selectedUser={selectedUser}
        onEditUser={handleEditUser}
        showDeleteConfirm={showDeleteConfirm}
        onCloseDeleteConfirm={() => setShowDeleteConfirm(false)}
        userToDelete={userToDelete}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  )
}

