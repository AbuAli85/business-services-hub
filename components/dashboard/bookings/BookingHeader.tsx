import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Download, 
  Upload, 
  BarChart3, 
  HelpCircle, 
  RefreshCw,
  Grid3X3,
  Calendar,
  Table
} from 'lucide-react'
import { formatCurrency } from '@/lib/dashboard-data'

interface BookingHeaderProps {
  userRole: 'client' | 'provider' | 'admin' | null
  stats: {
    total: number
    inProgress: number
    approved: number
    pending: number
    totalRevenue: number
  }
  filters: {
    dateStart?: string
    dateEnd?: string
  }
  lastUpdatedAt: number | null
  dataLoading: boolean
  viewMode: 'card' | 'calendar' | 'table'
  density: 'compact' | 'comfortable' | 'spacious'
  onRefresh: () => void
  onViewModeChange: (mode: 'card' | 'calendar' | 'table') => void
  onDensityChange: (density: 'compact' | 'comfortable' | 'spacious') => void
  onExport: (format: 'csv' | 'pdf' | 'json') => void
  canCreateBooking: boolean
}

export function BookingHeader({
  userRole,
  stats,
  filters,
  lastUpdatedAt,
  dataLoading,
  viewMode,
  density,
  onRefresh,
  onViewModeChange,
  onDensityChange,
  onExport,
  canCreateBooking
}: BookingHeaderProps) {
  const getPageDescription = () => {
    switch (userRole) {
      case 'admin': return 'Manage all bookings across the platform'
      case 'provider': return 'Track and manage your service bookings'
      case 'client': return 'View and manage your service requests'
      default: return 'Manage bookings'
    }
  }

  return (
    <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full bg-dot-pattern"></div>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Bookings Management</h1>
            <p className="text-blue-200 text-sm mb-4">{getPageDescription()}</p>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="bg-white/20 px-3 py-1.5 rounded-full border border-white/30 font-medium">
                {stats.total} total
              </span>
              <span className="bg-white/20 px-3 py-1.5 rounded-full border border-white/30 font-medium">
                {stats.inProgress + stats.approved} active
              </span>
              <span className="bg-white/20 px-3 py-1.5 rounded-full border border-white/30 font-medium">
                {stats.pending} pending
              </span>
              <span className="bg-white/20 px-3 py-1.5 rounded-full border border-white/30 font-medium">
                Revenue {formatCurrency(stats.totalRevenue)}
              </span>
            </div>
            
            {/* Date Range & Last Updated */}
            <div className="mt-3 text-xs text-blue-200">
              <span>
                {(() => {
                  const start = filters.dateStart
                  const end = filters.dateEnd
                  if (!start && !end) return 'All time'
                  const fmt = (v: string) => new Date(v).toLocaleDateString()
                  return `${start ? fmt(start) : '—'} to ${end ? fmt(end) : '—'}`
                })()}
              </span>
              {lastUpdatedAt && (
                <span className="ml-3">
                  Last updated {new Date(lastUpdatedAt).toLocaleTimeString()} 
                  {dataLoading && ' • refreshing…'}
                </span>
              )}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex flex-wrap gap-2">
              {canCreateBooking && (
                <Button size="sm" variant="secondary" className="bg-white text-blue-900 hover:bg-blue-50">
                  <FileText className="h-4 w-4 mr-2" />
                  New Booking
                </Button>
              )}
              <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => onExport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
              <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => console.log('Import Bookings')}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" asChild>
                <a href="/dashboard/analytics/bookings">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </a>
              </Button>
              <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => window.open('https://docs', '_blank')}>
                <HelpCircle className="h-4 w-4 mr-2" />
                Help
              </Button>
              <Button 
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={onRefresh}
                disabled={dataLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            {/* View Toggles */}
            <div className="flex items-center gap-2">
              <div className="bg-white/10 p-1 rounded-lg border border-white/20">
                <Button 
                  size="sm" 
                  variant={viewMode === 'card' ? 'default' : 'ghost'}
                  className={`px-3 py-1.5 text-xs ${viewMode === 'card' ? 'bg-white text-blue-900' : 'text-white hover:bg-white/10'}`}
                  onClick={() => onViewModeChange('card')}
                >
                  <Grid3X3 className="h-3 w-3 mr-1" />
                  Card
                </Button>
                <Button 
                  size="sm" 
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  className={`px-3 py-1.5 text-xs ${viewMode === 'calendar' ? 'bg-white text-blue-900' : 'text-white hover:bg-white/10'}`}
                  onClick={() => onViewModeChange('calendar')}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Calendar
                </Button>
                <Button 
                  size="sm" 
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  className={`px-3 py-1.5 text-xs ${viewMode === 'table' ? 'bg-white text-blue-900' : 'text-white hover:bg-white/10'}`}
                  onClick={() => onViewModeChange('table')}
                >
                  <Table className="h-3 w-3 mr-1" />
                  Table
                </Button>
              </div>
              
              <div className="bg-white/10 p-1 rounded-lg border border-white/20">
                <Button 
                  size="sm" 
                  variant={density === 'compact' ? 'default' : 'ghost'}
                  className={`px-2 py-1.5 text-xs ${density === 'compact' ? 'bg-white text-blue-900' : 'text-white hover:bg-white/10'}`}
                  onClick={() => onDensityChange('compact')}
                >
                  Compact
                </Button>
                <Button 
                  size="sm" 
                  variant={density === 'comfortable' ? 'default' : 'ghost'}
                  className={`px-2 py-1.5 text-xs ${density === 'comfortable' ? 'bg-white text-blue-900' : 'text-white hover:bg-white/10'}`}
                  onClick={() => onDensityChange('comfortable')}
                >
                  Comfortable
                </Button>
                <Button 
                  size="sm" 
                  variant={density === 'spacious' ? 'default' : 'ghost'}
                  className={`px-2 py-1.5 text-xs ${density === 'spacious' ? 'bg-white text-blue-900' : 'text-white hover:bg-white/10'}`}
                  onClick={() => onDensityChange('spacious')}
                >
                  Spacious
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
