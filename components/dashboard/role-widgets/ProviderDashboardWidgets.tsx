import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Briefcase, 
  TrendingUp, 
  Star,
  Calendar,
  DollarSign,
  Plus,
  BarChart3,
  Clock
} from 'lucide-react'

interface ProviderStats {
  totalServices: number
  activeServices: number
  totalBookings: number
  totalRevenue: number
  avgRating: number
  pendingBookings: number
  completedBookings: number
  monthlyRevenue: number
  monthlyGrowth: number
}

interface ProviderDashboardWidgetsProps {
  stats: ProviderStats
  onViewServices: () => void
  onViewBookings: () => void
  onViewAnalytics: () => void
  onCreateService: () => void
}

export function ProviderDashboardWidgets({
  stats,
  onViewServices,
  onViewBookings,
  onViewAnalytics,
  onCreateService
}: ProviderDashboardWidgetsProps) {
  // Add error boundary and loading state handling
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600 bg-green-100'
    if (growth < 0) return 'text-red-600 bg-red-100'
    return 'text-gray-600 bg-gray-100'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Revenue Overview */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue Overview</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Revenue</span>
              <span className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">This Month</span>
              <span className="text-sm font-medium">{formatCurrency(stats.monthlyRevenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Growth</span>
              <Badge className={getGrowthColor(stats.monthlyGrowth)}>
                {stats.monthlyGrowth > 0 ? '+' : ''}{stats.monthlyGrowth}%
              </Badge>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3"
            onClick={onViewAnalytics}
          >
            View Details
          </Button>
        </CardContent>
      </Card>

      {/* Services Management */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Services</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Services</span>
              <span className="text-2xl font-bold">{stats.totalServices}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active</span>
              <Badge variant="secondary">{stats.activeServices}</Badge>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onViewServices}
            >
              View All
            </Button>
            <Button 
              size="sm" 
              className="flex-1"
              onClick={onCreateService}
            >
              <Plus className="h-4 w-4 mr-1" />
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Overview */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bookings</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Bookings</span>
              <span className="text-2xl font-bold">{stats.totalBookings}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending</span>
              <Badge variant={stats.pendingBookings > 0 ? "destructive" : "secondary"}>
                {stats.pendingBookings}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Completed</span>
              <Badge variant="secondary">{stats.completedBookings}</Badge>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3"
            onClick={onViewBookings}
          >
            Manage Bookings
          </Button>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Performance</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg Rating</span>
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="text-sm font-medium">{stats.avgRating.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Completion Rate</span>
              <span className="text-sm font-medium">
                {stats.totalBookings > 0 
                  ? Math.round((stats.completedBookings / stats.totalBookings) * 100)
                  : 0}%
              </span>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3"
            onClick={onViewAnalytics}
          >
            View Analytics
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}