import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { 
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  MoreVertical,
  Star,
  DollarSign,
  Calendar,
  User,
  Building2,
  AlertTriangle,
  TrendingUp,
  Package,
  Edit,
  Trash2,
  Shield,
  Zap
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getServiceCardImageUrl } from '@/lib/service-images'

interface Service {
  id: string
  title: string
  description: string
  category: string
  base_price: number
  currency: string
  status: string
  approval_status: string
  featured: boolean
  created_at: string
  updated_at: string
  cover_image_url?: string
  provider: {
    id: string
    full_name: string
    email: string
    phone?: string
    company_name?: string
  }
  rating?: number
  review_count?: number
  booking_count?: number
}

interface EnhancedServiceTableProps {
  services: Service[]
  onViewService: (service: Service) => void
  onEditService: (service: Service) => void
  onDeleteService: (service: Service) => void
  onApproveService: (service: Service) => Promise<void>
  onSuspendService: (service: Service) => Promise<void>
  onFeatureService: (service: Service) => Promise<void>
  onUpdatePricing: (service: Service) => Promise<void>
  searchQueryExternal?: string
  statusFilterExternal?: string
  categoryFilterExternal?: string
  hideInternalFilters?: boolean
  selectable?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  disableClientSorting?: boolean
  allowFeature?: boolean
}

export function EnhancedServiceTable({
  services,
  onViewService,
  onEditService,
  onDeleteService,
  onApproveService,
  onSuspendService,
  onFeatureService,
  onUpdatePricing,
  searchQueryExternal,
  statusFilterExternal,
  categoryFilterExternal,
  hideInternalFilters,
  selectable,
  selectedIds = [],
  onSelectionChange,
  disableClientSorting,
  allowFeature = true
}: EnhancedServiceTableProps) {
  const [searchQuery, setSearchQuery] = useState(searchQueryExternal ?? '')
  const [categoryFilter, setCategoryFilter] = useState(categoryFilterExternal ?? 'all')
  const [statusFilter, setStatusFilter] = useState(statusFilterExternal ?? 'all')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())
  const isSelected = (id: string) => selectedIds.includes(id)
  const toggleRow = (id: string) => {
    if (!onSelectionChange) return
    const next = isSelected(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]
    onSelectionChange(next)
  }
  const toggleAllVisible = () => {
    if (!onSelectionChange) return
    const visibleIds = filteredAndSortedServices.map(s => s.id)
    const allSelected = visibleIds.every(id => selectedIds.includes(id))
    onSelectionChange(allSelected ? selectedIds.filter(id => !visibleIds.includes(id)) : Array.from(new Set([...selectedIds, ...visibleIds])))
  }

  // Keep internal state in sync with external props when provided
  useEffect(() => {
    if (typeof searchQueryExternal === 'string') setSearchQuery(searchQueryExternal)
  }, [searchQueryExternal])
  useEffect(() => {
    if (typeof categoryFilterExternal === 'string') setCategoryFilter(categoryFilterExternal)
  }, [categoryFilterExternal])
  useEffect(() => {
    if (typeof statusFilterExternal === 'string') setStatusFilter(statusFilterExternal)
  }, [statusFilterExternal])

  const categories = [
    'Digital Marketing',
    'Legal Services',
    'Accounting',
    'IT Services',
    'Design & Branding',
    'Consulting',
    'Translation',
    'HR Services',
    'Web Development',
    'Content Creation'
  ]

  const filteredAndSortedServices = services
    .filter(service => {
      const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           service.provider?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter
      const matchesStatus = statusFilter === 'all' || service.status === statusFilter
      return matchesSearch && matchesCategory && matchesStatus
    })
    .sort((a, b) => {
      if (disableClientSorting) return 0
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'price':
          aValue = a.base_price
          bValue = b.base_price
          break
        case 'rating':
          aValue = a.rating || 0
          bValue = b.rating || 0
          break
        case 'bookings':
          aValue = a.booking_count || 0
          bValue = b.booking_count || 0
          break
        case 'created_at':
        default:
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  const handleQuickAction = async (service: Service, action: string) => {
    setActionLoading(prev => new Set(prev).add(service.id))
    try {
      switch (action) {
        case 'approve':
          await onApproveService(service)
          toast.success('Service approved successfully')
          break
        case 'suspend':
          await onSuspendService(service)
          toast.success('Service suspended successfully')
          break
        case 'feature':
          await onFeatureService(service)
          toast.success('Service featured successfully')
          break
        case 'pricing':
          await onUpdatePricing(service)
          toast.success('Pricing updated successfully')
          break
        default:
          break
      }
    } catch (error) {
      toast.error(`Failed to ${action} service`)
    } finally {
      setActionLoading(prev => {
        const next = new Set(prev)
        next.delete(service.id)
        return next
      })
    }
  }

  const getQuickActions = (service: Service) => {
    const actions = []
    
    if (service.approval_status === 'pending') {
      actions.push({ label: 'Approve', icon: CheckCircle, action: 'approve', color: 'text-green-600' })
    }
    
    if (service.status === 'active') {
      actions.push({ label: 'Suspend', icon: XCircle, action: 'suspend', color: 'text-red-600' })
    }
    
    if (service.status === 'suspended') {
      actions.push({ label: 'Reactivate', icon: CheckCircle, action: 'approve', color: 'text-green-600' })
    }
    
    if (allowFeature && !service.featured) {
      actions.push({ label: 'Feature', icon: Star, action: 'feature', color: 'text-yellow-600' })
    }
    
    actions.push({ label: 'Update Pricing', icon: DollarSign, action: 'pricing', color: 'text-blue-600' })
    
    return actions
  }

  const getStatusBadge = (service: Service) => {
    const status = service.status
    const approvalStatus = service.approval_status
    
    if (approvalStatus === 'pending') {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Pending Approval</Badge>
    }
    
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active</Badge>
      case 'suspended':
        return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">Suspended</Badge>
      case 'inactive':
        return <Badge variant="outline" className="text-gray-600 border-gray-200 bg-gray-50">Inactive</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Filters */}
      {!hideInternalFilters && (
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date Created</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
              <SelectItem value="bookings">Bookings</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
          </Button>
        </div>
      </div>
      )}

      {/* Services Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[1100px]">
            <colgroup>
              {selectable && <col className="w-10" />}
              <col className="w-[38%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {selectable && (
                  <th className="text-left py-3 px-4 font-medium text-gray-900">
                    <Checkbox
                      checked={filteredAndSortedServices.length > 0 && filteredAndSortedServices.every(s => selectedIds.includes(s.id))}
                      onCheckedChange={toggleAllVisible}
                      aria-label="Select all"
                    />
                  </th>
                )}
                <th className="text-left py-3 px-4 font-medium text-gray-900">Service</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Provider</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Category</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Price</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Status</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Rating</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Bookings</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedServices.length === 0 ? (
                <tr>
                  <td colSpan={selectable ? 9 : 8} className="py-10 text-center text-gray-500">No services found. Adjust filters or search.</td>
                </tr>
              ) : filteredAndSortedServices.map((service) => {
                const isLoading = actionLoading.has(service.id)
                const quickActions = getQuickActions(service)
                
                return (
                  <tr key={service.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    {selectable && (
                      <td className="py-4 px-4 align-middle">
                        <Checkbox checked={isSelected(service.id)} onCheckedChange={() => toggleRow(service.id)} aria-label={`Select ${service.title}`} />
                      </td>
                    )}
                    <td className="py-4 px-4 align-top">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={getServiceCardImageUrl(service.category, service.title, service.cover_image_url, 48, 48)}
                            alt={`${service.title} - ${service.category} service`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{service.title}</div>
                          <div className="text-sm text-gray-500 line-clamp-1 sm:line-clamp-2">{service.description}</div>
                          {service.featured && (
                            <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-200 bg-yellow-50 mt-1">
                              <Star className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{service.provider?.full_name}</div>
                          {service.provider?.company_name && (
                            <div className="text-xs text-gray-500">{service.provider.company_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <Badge variant="secondary" className="text-xs">
                        {service.category}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 align-middle text-right whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{service.base_price}</span>
                        <span className="text-sm text-gray-500">{service.currency}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 align-middle text-center">
                      {getStatusBadge(service)}
                    </td>
                    <td className="py-4 px-4 align-middle text-center whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-medium">{service.rating?.toFixed(1) || 'N/A'}</span>
                        {service.review_count && (
                          <span className="text-xs text-gray-500">({service.review_count})</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 align-middle text-center">
                      <div className="inline-flex items-center space-x-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">{service.booking_count || 0}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 align-middle text-right">
                      <div className="inline-flex items-center space-x-2">
                        {/* Quick Actions */}
                        {quickActions.map((action, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuickAction(service, action.action)}
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
                            <DropdownMenuItem onClick={() => onViewService(service)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEditService(service)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Service
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => onDeleteService(service)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Service
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
      </div>
    </div>
  )
}
