'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useAdminRealtime } from '@/hooks/useAdminRealtime'
import { formatCurrency } from '@/lib/dashboard-data'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { 
  Users, 
  Briefcase, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  Eye,
  Settings,
  FileText,
  BarChart3,
  RefreshCw,
  Radio,
  XCircle
} from 'lucide-react'
import { RealtimeNotifications } from '@/components/dashboard/RealtimeNotifications'

interface AdminDashboardStats {
  totalUsers: number
  totalServices: number
  totalBookings: number
  totalRevenue: number
  pendingApprovals: number
  pendingVerifications: number
  activeUsers: number
  featuredServices: number
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { users, services, bookings, invoices, loading, error, refresh } = useDashboardData()
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [systemStatus, setSystemStatus] = useState({
    database: 'checking',
    email: 'checking',
    storage: 'checking',
    api: 'checking'
  })
  const [hasRecentUpdate, setHasRecentUpdate] = useState(false)

  // Real-time subscription
  const { status: realtimeStatus, lastUpdate } = useAdminRealtime({
    enableUsers: true,
    enableServices: true,
    enableBookings: true,
    enableInvoices: true,
    enablePermissions: false,
    enableVerifications: false,
    debounceMs: 2000,
    showToasts: false
  })

  // Auto-refresh on real-time updates
  useEffect(() => {
    if (lastUpdate) {
      setHasRecentUpdate(true)
      refresh()
      setTimeout(() => setHasRecentUpdate(false), 3000)
    }
  }, [lastUpdate, refresh])

  // Calculate admin dashboard statistics
  useEffect(() => {
    if (users && services && bookings && invoices) {
      const calculatedStats: AdminDashboardStats = {
        totalUsers: users.length,
        totalServices: services.length,
        totalBookings: bookings.length,
        totalRevenue: invoices
          .filter(invoice => invoice.status === 'paid')
          .reduce((sum, invoice) => sum + invoice.amount, 0),
        pendingApprovals: services.filter(service => service.approvalStatus === 'pending').length,
        pendingVerifications: users.filter(user => user.status === 'pending').length,
        activeUsers: users.filter(user => user.status === 'active').length,
        featuredServices: services.filter(service => service.featured).length
      }
      setStats(calculatedStats)
    }
  }, [users, services, bookings, invoices])

  // Check actual system status
  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const supabase = await getSupabaseClient()
        
        // Check database connection
        const { error: dbError } = await supabase.from('profiles').select('count').limit(1).single()
        
        setSystemStatus({
          database: dbError ? 'offline' : 'online',
          email: 'online', // Would need actual email service check
          storage: realtimeStatus.connected ? 'online' : 'checking',
          api: 'online' // If we got here, API is working
        })
      } catch (err) {
        setSystemStatus({
          database: 'offline',
          email: 'unknown',
          storage: 'unknown',
          api: 'offline'
        })
      }
    }

    checkSystemStatus()
    const interval = setInterval(checkSystemStatus, 30000) // Check every 30 seconds
    
    return () => clearInterval(interval)
  }, [realtimeStatus.connected])

  const quickActions = [
    {
      title: 'Manage Users',
      description: 'View and manage user accounts',
      icon: Users,
      href: '/dashboard/admin/users',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Approve Services',
      description: 'Review and approve pending services',
      icon: Briefcase,
      href: '/dashboard/admin/services?filter=pending',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'View Analytics',
      description: 'Platform analytics and insights',
      icon: BarChart3,
      href: '/dashboard/admin/analytics',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'Manage Permissions',
      description: 'User roles and access control',
      icon: Settings,
      href: '/dashboard/admin/permissions',
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ]

  const recentActivity = [
    ...services
      .filter(service => service.approvalStatus === 'pending')
      .slice(0, 3)
      .map(service => ({
        type: 'service_pending' as const,
        title: 'Service Pending Approval',
        description: `${service.title} by ${service.providerId}`,
        timestamp: service.createdAt,
        action: 'Review Service',
        href: `/dashboard/admin/services?id=${service.id}`
      })),
    ...users
      .filter(user => user.status === 'pending')
      .slice(0, 2)
      .map(user => ({
        type: 'user_pending' as const,
        title: 'User Pending Verification',
        description: `${user.fullName || user.email}`,
        timestamp: user.createdAt,
        action: 'Verify User',
        href: `/dashboard/admin/users?id=${user.id}`
      }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading dashboard data</p>
          <Button onClick={refresh}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white transition-all duration-300 ${hasRecentUpdate ? 'ring-4 ring-yellow-400' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">Admin Dashboard</h1>
              {realtimeStatus.connected && (
                <Badge className="bg-green-500/20 text-white border-white/30">
                  <Radio className="h-3 w-3 mr-1 animate-pulse" />
                  Live
                </Badge>
              )}
            </div>
            <p className="text-blue-100 text-lg">Platform overview and real-time management</p>
          </div>
          <div className="flex flex-col gap-3">
            <RealtimeNotifications />
            <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeUsers} active users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Services</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalServices.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats.featuredServices} featured services
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                From {stats.totalBookings} bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApprovals + stats.pendingVerifications}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingApprovals} services, {stats.pendingVerifications} users
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${action.color} text-white`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription className="text-sm">{action.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={() => router.push(action.href)}
              >
                {action.title}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>Latest platform activity requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0">
                      {activity.type === 'service_pending' ? (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <Users className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => router.push(activity.href)}
                    >
                      {activity.action}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>All caught up! No pending actions.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>System Status</span>
            </CardTitle>
            <CardDescription>Real-time platform health monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database</span>
                <Badge 
                  variant="outline" 
                  className={
                    systemStatus.database === 'online' 
                      ? 'text-green-600 border-green-200 bg-green-50'
                      : systemStatus.database === 'checking'
                      ? 'text-yellow-600 border-yellow-200 bg-yellow-50'
                      : 'text-red-600 border-red-200 bg-red-50'
                  }
                >
                  {systemStatus.database === 'online' ? <CheckCircle className="h-3 w-3 mr-1" /> : 
                   systemStatus.database === 'checking' ? <Clock className="h-3 w-3 mr-1" /> :
                   <XCircle className="h-3 w-3 mr-1" />}
                  {systemStatus.database === 'online' ? 'Online' : 
                   systemStatus.database === 'checking' ? 'Checking...' : 'Offline'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Real-time Sync</span>
                <Badge 
                  variant="outline" 
                  className={
                    realtimeStatus.connected 
                      ? 'text-green-600 border-green-200 bg-green-50'
                      : 'text-red-600 border-red-200 bg-red-50'
                  }
                >
                  {realtimeStatus.connected ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                  {realtimeStatus.connected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">File Storage</span>
                <Badge 
                  variant="outline" 
                  className={
                    systemStatus.storage === 'online' 
                      ? 'text-green-600 border-green-200 bg-green-50'
                      : 'text-yellow-600 border-yellow-200 bg-yellow-50'
                  }
                >
                  {systemStatus.storage === 'online' ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                  {systemStatus.storage === 'online' ? 'Healthy' : 'Checking...'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Status</span>
                <Badge 
                  variant="outline" 
                  className={
                    systemStatus.api === 'online' 
                      ? 'text-green-600 border-green-200 bg-green-50'
                      : 'text-red-600 border-red-200 bg-red-50'
                  }
                >
                  {systemStatus.api === 'online' ? <TrendingUp className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                  {systemStatus.api === 'online' ? 'Optimal' : 'Error'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
