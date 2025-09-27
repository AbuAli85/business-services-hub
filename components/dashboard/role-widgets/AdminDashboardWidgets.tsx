import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Activity,
  BarChart3,
  Shield,
  Clock,
  DollarSign
} from 'lucide-react'

interface AdminStats {
  totalUsers: number
  totalServices: number
  totalBookings: number
  totalRevenue: number
  pendingApprovals: number
  systemHealth: 'good' | 'warning' | 'critical'
  recentActivity: number
}

interface AdminDashboardWidgetsProps {
  stats: AdminStats
  onViewUsers: () => void
  onViewAnalytics: () => void
  onViewSystemHealth: () => void
  onViewPendingApprovals: () => void
}

export function AdminDashboardWidgets({
  stats,
  onViewUsers,
  onViewAnalytics,
  onViewSystemHealth,
  onViewPendingApprovals
}: AdminDashboardWidgetsProps) {
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'good': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'good': return <Activity className="h-4 w-4" />
      case 'warning': return <AlertTriangle className="h-4 w-4" />
      case 'critical': return <AlertTriangle className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* System Overview */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Overview</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Health Status</span>
              <Badge className={getHealthColor(stats.systemHealth)}>
                {getHealthIcon(stats.systemHealth)}
                <span className="ml-1 capitalize">{stats.systemHealth}</span>
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Recent Activity</span>
              <span className="text-sm font-medium">{stats.recentActivity}</span>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3"
            onClick={onViewSystemHealth}
          >
            View Details
          </Button>
        </CardContent>
      </Card>

      {/* User Management */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">User Management</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Users</span>
              <span className="text-2xl font-bold">{stats.totalUsers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending Approvals</span>
              <Badge variant={stats.pendingApprovals > 0 ? "destructive" : "secondary"}>
                {stats.pendingApprovals}
              </Badge>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3"
            onClick={onViewUsers}
          >
            Manage Users
          </Button>
        </CardContent>
      </Card>

      {/* Business Analytics */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Business Analytics</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Revenue</span>
              <span className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Bookings</span>
              <span className="text-sm font-medium">{stats.totalBookings}</span>
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
              onClick={onViewPendingApprovals}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Review Approvals
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={onViewAnalytics}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}