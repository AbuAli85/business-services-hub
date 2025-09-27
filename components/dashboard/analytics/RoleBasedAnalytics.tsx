'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Calendar, 
  Star,
  Eye,
  Download,
  Filter,
  RefreshCw,
  Target,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react'

interface AnalyticsData {
  // Common metrics
  totalRevenue: number
  totalBookings: number
  avgRating: number
  conversionRate: number
  
  // Time-based metrics
  monthlyRevenue: number
  monthlyGrowth: number
  weeklyBookings: number
  weeklyGrowth: number
  
  // Role-specific metrics
  admin?: {
    totalUsers: number
    totalServices: number
    systemHealth: 'good' | 'warning' | 'critical'
    pendingApprovals: number
  }
  
  provider?: {
    totalServices: number
    activeServices: number
    completedBookings: number
    pendingBookings: number
    topPerformingService: string
    monthlyTarget: number
    targetProgress: number
  }
  
  client?: {
    totalSpent: number
    favoriteCategory: string
    savedServices: number
    upcomingBookings: number
    loyaltyLevel: 'bronze' | 'silver' | 'gold' | 'platinum'
  }
}

interface RoleBasedAnalyticsProps {
  role: 'admin' | 'provider' | 'client' | 'staff' | null
  data: AnalyticsData
  onExportData: () => void
  onRefreshData: () => void
  onViewDetails: (metric: string) => void
}

export function RoleBasedAnalytics({ 
  role, 
  data, 
  onExportData, 
  onRefreshData, 
  onViewDetails 
}: RoleBasedAnalyticsProps) {
  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    )
  }

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getLoyaltyBadge = (level: string) => {
    const config = {
      bronze: { color: 'bg-amber-100 text-amber-800', icon: '🥉' },
      silver: { color: 'bg-gray-100 text-gray-800', icon: '🥈' },
      gold: { color: 'bg-yellow-100 text-yellow-800', icon: '🥇' },
      platinum: { color: 'bg-purple-100 text-purple-800', icon: '💎' }
    }
    const configItem = config[level as keyof typeof config] || config.bronze
    return (
      <Badge className={configItem.color}>
        {configItem.icon} {level.charAt(0).toUpperCase() + level.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Comprehensive insights for {role} role</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={onRefreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={onExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.totalRevenue.toLocaleString()}</div>
            <div className="flex items-center mt-1">
              {getGrowthIcon(data.monthlyGrowth)}
              <span className={`text-sm ${getGrowthColor(data.monthlyGrowth)}`}>
                {Math.abs(data.monthlyGrowth)}% this month
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2 p-0 h-auto"
              onClick={() => onViewDetails('revenue')}
            >
              <Eye className="h-3 w-3 mr-1" />
              View Details
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalBookings}</div>
            <div className="flex items-center mt-1">
              {getGrowthIcon(data.weeklyGrowth)}
              <span className={`text-sm ${getGrowthColor(data.weeklyGrowth)}`}>
                {Math.abs(data.weeklyGrowth)}% this week
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2 p-0 h-auto"
              onClick={() => onViewDetails('bookings')}
            >
              <Eye className="h-3 w-3 mr-1" />
              View Details
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgRating.toFixed(1)}</div>
            <div className="flex items-center mt-1">
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-3 w-3 ${
                      i < Math.floor(data.avgRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`} 
                  />
                ))}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2 p-0 h-auto"
              onClick={() => onViewDetails('ratings')}
            >
              <Eye className="h-3 w-3 mr-1" />
              View Details
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.conversionRate.toFixed(1)}%</div>
            <div className="mt-2">
              <Progress value={data.conversionRate} className="h-2" />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2 p-0 h-auto"
              onClick={() => onViewDetails('conversion')}
            >
              <Eye className="h-3 w-3 mr-1" />
              View Details
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Role-Specific Analytics */}
      {role === 'admin' && data.admin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                System Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Users</span>
                  <span className="text-lg font-bold">{data.admin.totalUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Services</span>
                  <span className="text-lg font-bold">{data.admin.totalServices}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">System Health</span>
                  <Badge className={
                    data.admin.systemHealth === 'good' ? 'bg-green-100 text-green-800' :
                    data.admin.systemHealth === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {data.admin.systemHealth === 'good' ? <CheckCircle className="h-3 w-3 mr-1" /> :
                     data.admin.systemHealth === 'warning' ? <AlertCircle className="h-3 w-3 mr-1" /> :
                     <XCircle className="h-3 w-3 mr-1" />}
                    {data.admin.systemHealth}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pending Approvals</span>
                  <span className="text-lg font-bold text-orange-600">{data.admin.pendingApprovals}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    ${data.monthlyRevenue.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Monthly Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {data.weeklyBookings}
                  </div>
                  <div className="text-sm text-gray-600">Weekly Bookings</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {role === 'provider' && data.provider && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2 text-purple-600" />
                Service Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Services</span>
                  <span className="text-lg font-bold">{data.provider.totalServices}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Services</span>
                  <span className="text-lg font-bold text-green-600">{data.provider.activeServices}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Completed Bookings</span>
                  <span className="text-lg font-bold text-blue-600">{data.provider.completedBookings}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pending Bookings</span>
                  <span className="text-lg font-bold text-orange-600">{data.provider.pendingBookings}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Top Service</span>
                  <span className="text-sm text-gray-600 truncate">{data.provider.topPerformingService}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-green-600" />
                Monthly Target
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {data.provider.targetProgress.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Target Progress</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{data.provider.targetProgress.toFixed(1)}%</span>
                  </div>
                  <Progress value={data.provider.targetProgress} className="h-3" />
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    ${data.monthlyRevenue.toLocaleString()} / ${data.provider.monthlyTarget.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Revenue Target</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {role === 'client' && data.client && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="h-5 w-5 mr-2 text-yellow-600" />
                Client Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Spent</span>
                  <span className="text-lg font-bold">${data.client.totalSpent.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Favorite Category</span>
                  <Badge variant="secondary">{data.client.favoriteCategory}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Saved Services</span>
                  <span className="text-lg font-bold">{data.client.savedServices}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Upcoming Bookings</span>
                  <span className="text-lg font-bold text-blue-600">{data.client.upcomingBookings}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Loyalty Level</span>
                  {getLoyaltyBadge(data.client.loyaltyLevel)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                Activity Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {data.totalBookings}
                  </div>
                  <div className="text-sm text-gray-600">Total Bookings</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {data.avgRating.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Average Rating Given</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {data.conversionRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Booking Success Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common analytics tasks and reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" onClick={() => onViewDetails('revenue')}>
              <DollarSign className="h-4 w-4 mr-2" />
              Revenue Report
            </Button>
            <Button variant="outline" onClick={() => onViewDetails('bookings')}>
              <Calendar className="h-4 w-4 mr-2" />
              Booking Report
            </Button>
            <Button variant="outline" onClick={() => onViewDetails('performance')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Performance
            </Button>
            <Button variant="outline" onClick={() => onViewDetails('export')}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
