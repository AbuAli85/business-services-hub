import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Heart, 
  History,
  DollarSign,
  Star,
  Bell,
  Search,
  Clock
} from 'lucide-react'

interface ClientStats {
  totalBookings: number
  activeBookings: number
  completedBookings: number
  totalSpent: number
  favoriteCategories: string[]
  upcomingBookings: number
  savedServices: number
  notifications: number
}

interface ClientDashboardWidgetsProps {
  stats: ClientStats
  onViewBookings: () => void
  onBrowseServices: () => void
  onViewFavorites: () => void
  onViewHistory: () => void
}

export function ClientDashboardWidgets({
  stats,
  onViewBookings,
  onBrowseServices,
  onViewFavorites,
  onViewHistory
}: ClientDashboardWidgetsProps) {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Bookings Overview */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">My Bookings</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Bookings</span>
              <span className="text-2xl font-bold">{stats.totalBookings}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active</span>
              <Badge variant="secondary">{stats.activeBookings}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Upcoming</span>
              <Badge variant="outline">{stats.upcomingBookings}</Badge>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3"
            onClick={onViewBookings}
          >
            View All Bookings
          </Button>
        </CardContent>
      </Card>

      {/* Spending Overview */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Spending</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Spent</span>
              <span className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</span>
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
            onClick={onViewHistory}
          >
            View History
          </Button>
        </CardContent>
      </Card>

      {/* Favorites & Saved */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Favorites</CardTitle>
          <Heart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Saved Services</span>
              <span className="text-2xl font-bold">{stats.savedServices}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Favorite Categories</span>
              <Badge variant="outline">{stats.favoriteCategories.length}</Badge>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onViewFavorites}
            >
              View Favorites
            </Button>
            <Button 
              size="sm" 
              className="flex-1"
              onClick={onBrowseServices}
            >
              <Search className="h-4 w-4 mr-1" />
              Browse
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={onBrowseServices}
            >
              <Search className="h-4 w-4 mr-2" />
              Browse Services
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={onViewBookings}
            >
              <Calendar className="h-4 w-4 mr-2" />
              View Bookings
            </Button>
            {stats.notifications > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => {}}
              >
                <Bell className="h-4 w-4 mr-2" />
                Notifications ({stats.notifications})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}