'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Package, 
  TrendingUp, 
  Star, 
  Calendar, 
  DollarSign, 
  Eye,
  Plus,
  Edit,
  BarChart3,
  Clock,
  Users
} from 'lucide-react'

interface ProviderDashboardWidgetsProps {
  stats: {
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
  const revenueGrowthColor = stats.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
  const revenueGrowthIcon = stats.monthlyGrowth >= 0 ? '↗' : '↘'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Services Overview */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">My Services</CardTitle>
          <Package className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalServices}</div>
          <p className="text-xs text-muted-foreground">
            {stats.activeServices} active
          </p>
          <div className="mt-2">
            <Progress value={(stats.activeServices / stats.totalServices) * 100} className="h-2" />
          </div>
          <Button variant="outline" size="sm" className="mt-2" onClick={onViewServices}>
            <Eye className="h-3 w-3 mr-1" />
            Manage
          </Button>
        </CardContent>
      </Card>

      {/* Revenue */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <div className="flex items-center mt-1">
            <span className={`text-xs ${revenueGrowthColor}`}>
              {revenueGrowthIcon} {Math.abs(stats.monthlyGrowth)}% this month
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Bookings */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bookings</CardTitle>
          <Calendar className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalBookings}</div>
          <p className="text-xs text-muted-foreground">
            {stats.pendingBookings} pending
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={onViewBookings}>
            <Clock className="h-3 w-3 mr-1" />
            View All
          </Button>
        </CardContent>
      </Card>

      {/* Rating */}
      <Card className="border-l-4 border-l-yellow-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rating</CardTitle>
          <Star className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">Average Rating</p>
          <div className="flex items-center mt-1">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`h-3 w-3 ${
                  i < Math.floor(stats.avgRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                }`} 
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>Your business metrics and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completion Rate</span>
                <span className="text-sm font-medium">
                  {stats.totalBookings > 0 ? Math.round((stats.completedBookings / stats.totalBookings) * 100) : 0}%
                </span>
              </div>
              <Progress 
                value={stats.totalBookings > 0 ? (stats.completedBookings / stats.totalBookings) * 100 : 0} 
                className="h-2" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Monthly Revenue</span>
                <span className="text-sm font-medium">${stats.monthlyRevenue.toLocaleString()}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.monthlyGrowth >= 0 ? '+' : ''}{stats.monthlyGrowth}% vs last month
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your business efficiently</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button onClick={onCreateService}>
              <Plus className="h-4 w-4 mr-2" />
              New Service
            </Button>
            <Button variant="outline" onClick={onViewServices}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Services
            </Button>
            <Button variant="outline" onClick={onViewBookings}>
              <Calendar className="h-4 w-4 mr-2" />
              View Bookings
            </Button>
            <Button variant="outline" onClick={onViewAnalytics}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
