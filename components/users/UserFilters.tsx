import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Filter, ChevronDown, ChevronUp, List, Grid3X3, SortAsc, SortDesc } from 'lucide-react'
import { UserFilters as UserFiltersType } from '@/types/users'

interface UserFiltersProps {
  filters: UserFiltersType
  onFiltersChange: (filters: Partial<UserFiltersType>) => void
  onClearFilters: () => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  totalUsers: number
}

export function UserFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  viewMode,
  onViewModeChange,
  totalUsers
}: UserFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  const handleSearchChange = useCallback((value: string) => {
    onFiltersChange({ searchQuery: value, page: 1 })
  }, [onFiltersChange])

  const handleRoleChange = useCallback((value: string) => {
    onFiltersChange({ selectedRole: value, page: 1 })
  }, [onFiltersChange])

  const handleStatusChange = useCallback((value: string) => {
    onFiltersChange({ selectedStatus: value, page: 1 })
  }, [onFiltersChange])

  const handleSortChange = useCallback((value: string) => {
    onFiltersChange({ sortBy: value as UserFiltersType['sortBy'] })
  }, [onFiltersChange])

  const handleSortDirToggle = useCallback(() => {
    onFiltersChange({ sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc' })
  }, [filters.sortDir, onFiltersChange])

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2 text-blue-600" />
              Search & Filters
            </CardTitle>
            <CardDescription>
              Find and filter users by various criteria
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>
      </CardHeader>
      {showFilters && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Search Users</label>
              <div className="relative">
                <Input
                  placeholder="Name, email, phone..."
                  value={filters.searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Role</label>
              <Select value={filters.selectedRole} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="provider">Provider</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <Select value={filters.selectedStatus} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">View Mode</label>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onViewModeChange('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onViewModeChange('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <Select value={filters.sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="last_seen">Last Seen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSortDirToggle}
            >
              {filters.sortDir === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
            <div className="text-sm text-gray-500">
              {totalUsers} users found
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

