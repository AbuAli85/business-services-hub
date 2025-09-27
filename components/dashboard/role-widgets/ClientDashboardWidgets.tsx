'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Package, 
  Star, 
  Clock, 
  Search,
  Heart,
  History,
  Bell,
  TrendingUp,
  MapPin
} from 'lucide-react'

interface ClientDashboardWidgetsProps {
  stats: {
    totalBookings: number
    activeBookings: number
    completedBookings: number
    totalSpent: number
    favoriteCategories: string[]
    upcomingBookings: number
    savedServices: number
    notifications: number
  }
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* My Bookings */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">My Bookings</CardTitle>
          <Calendar className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalBookings}</div>
          <p className="text-xs text-muted-foreground">
            {stats.activeBookings} active
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={onViewBookings}>
            <Clock className="h-3 w-3 mr-1" />
            View All
          </Button>
        </CardContent>
      </Card>

      {/* Total Spent */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${stats.totalSpent.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">All Time</p>
          <div className="flex items-center mt-1">
            <span className="text-xs text-muted-foreground">
              {stats.completedBookings} completed bookings
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
          <Clock className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.upcomingBookings}</div>
          <p className="text-xs text-muted-foreground">Scheduled</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={onViewBookings}>
            <Calendar className="h-3 w-3 mr-1" />
            View Schedule
          </Button>
        </CardContent>
      </Card>

      {/* Saved Services */}
      <Card className="border-l-4 border-l-pink-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saved</CardTitle>
          <Heart className="h-4 w-4 text-pink-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.savedServices}</div>
          <p className="text-xs text-muted-foreground">Favorite Services</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={onViewFavorites}>
            <Heart className="h-3 w-3 mr-1" />
            View Favorites
          </Button>
        </CardContent>
      </Card>

      {/* Favorite Categories */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Favorite Categories</CardTitle>
          <CardDescription>Your most booked service types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stats.favoriteCategories.length > 0 ? (
              stats.favoriteCategories.map((category, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {category}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No bookings yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Stay updated with your bookings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-orange-500" />
              <span className="text-sm">
                {stats.notifications} new notifications
              </span>
            </div>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Find and book services easily</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button onClick={onBrowseServices}>
              <Search className="h-4 w-4 mr-2" />
              Browse Services
            </Button>
            <Button variant="outline" onClick={onViewBookings}>
              <Calendar className="h-4 w-4 mr-2" />
              My Bookings
            </Button>
            <Button variant="outline" onClick={onViewFavorites}>
              <Heart className="h-4 w-4 mr-2" />
              Favorites
            </Button>
            <Button variant="outline" onClick={onViewHistory}>
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
