import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Filter, 
  X, 
  Search, 
  Calendar as CalendarIcon,
  ChevronDown
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface FilterChip {
  id: string
  label: string
  value: string
  type: 'status' | 'date' | 'search' | 'category'
}

interface EnhancedBookingFiltersProps {
  activeFilters: FilterChip[]
  onRemoveFilter: (filterId: string) => void
  onClearAllFilters: () => void
  onApplyFilters: (filters: any) => void
  statusCounts: Record<string, number>
  categories: string[]
  className?: string
}

export function EnhancedBookingFilters({
  activeFilters,
  onRemoveFilter,
  onClearAllFilters,
  onApplyFilters,
  statusCounts,
  categories,
  className = ''
}: EnhancedBookingFiltersProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [filters, setFilters] = React.useState({
    status: '',
    search: '',
    category: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null
  })

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleApplyFilters = () => {
    onApplyFilters(filters)
    setIsExpanded(false)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      approved: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filter Header with Active Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant={isExpanded ? "default" : "outline"}
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilters.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFilters.length}
              </Badge>
            )}
          </Button>

          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAllFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              Clear All
            </Button>
          )}
        </div>

        <div className="text-sm text-gray-600">
          {activeFilters.length > 0 && `${activeFilters.length} filter${activeFilters.length > 1 ? 's' : ''} applied`}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.id}
              variant="outline"
              className={cn(
                'flex items-center gap-2 pr-1',
                getStatusColor(filter.value)
              )}
            >
              <span>{filter.label}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveFilter(filter.id)}
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Expandable Filter Panel */}
      {isExpanded && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Status
                </label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    {Object.entries(statusCounts).map(([status, count]) => (
                      <SelectItem key={status} value={status}>
                        {status.replace('_', ' ')} ({count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search bookings..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Category
                </label>
                <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Date Range
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom && filters.dateTo
                        ? `${format(filters.dateFrom, 'MMM dd')} - ${format(filters.dateTo, 'MMM dd')}`
                        : 'Select date range'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={filters.dateFrom || undefined}
                      selected={{
                        from: filters.dateFrom || undefined,
                        to: filters.dateTo || undefined
                      }}
                      onSelect={(range) => {
                        handleFilterChange('dateFrom', range?.from || null)
                        handleFilterChange('dateTo', range?.to || null)
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Apply Filters Button */}
            <div className="flex justify-end">
              <Button onClick={handleApplyFilters} className="flex items-center gap-2">
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
