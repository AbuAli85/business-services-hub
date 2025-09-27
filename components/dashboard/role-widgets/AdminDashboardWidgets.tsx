'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Shield, 
  BarChart3, 
  Activity,
  DollarSign,
  Calendar,
  Eye,
  Settings
} from 'lucide-react'

interface AdminDashboardWidgetsProps {
  stats: {
    totalUsers: number
    totalServices: number
    totalBookings: number
    totalRevenue: number
    pendingApprovals: number
    systemHealth: 'good' | 'warning' | 'critical'
    recentActivity: number
  }
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* System Overview */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Overview</CardTitle>
          <Shield className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
          <p className="text-xs text-muted-foreground">Total Users</p>
          <div className="flex items-center mt-2">
            <Badge variant={stats.systemHealth === 'good' ? 'default' : stats.systemHealth === 'warning' ? 'secondary' : 'destructive'}>
              {stats.systemHealth === 'good' ? 'Healthy' : stats.systemHealth === 'warning' ? 'Warning' : 'Critical'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Analytics */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={onViewAnalytics}>
            <BarChart3 className="h-3 w-3 mr-1" />
            View Analytics
          </Button>
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
          <p className="text-xs text-muted-foreground">Awaiting Review</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={onViewPendingApprovals}>
            <Eye className="h-3 w-3 mr-1" />
            Review Now
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Activity</CardTitle>
          <Activity className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.recentActivity}</div>
          <p className="text-xs text-muted-foreground">Last 24 Hours</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={onViewSystemHealth}>
            <Settings className="h-3 w-3 mr-1" />
            System Health
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Administrative tools and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" onClick={onViewUsers}>
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
            <Button variant="outline" onClick={onViewAnalytics}>
              <BarChart3 className="h-4 w-4 mr-2" />
              View Reports
            </Button>
            <Button variant="outline" onClick={onViewSystemHealth}>
              <Settings className="h-4 w-4 mr-2" />
              System Settings
            </Button>
            <Button variant="outline" onClick={onViewPendingApprovals}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Approvals
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
