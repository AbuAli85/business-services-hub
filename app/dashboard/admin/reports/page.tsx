'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Download,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Eye,
  RefreshCw,
  Building2,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Radio
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useAdminRealtime } from '@/hooks/useAdminRealtime'
import { formatCurrency } from '@/lib/dashboard-data'
import { toast } from 'sonner'
import { DashboardErrorBoundary } from '@/components/dashboard/dashboard-error-boundary'

interface Report {
  id: string
  title: string
  type: 'financial' | 'user' | 'service' | 'booking' | 'analytics'
  description: string
  generated_at: string
  status: 'ready' | 'generating' | 'failed'
  file_url?: string
  metrics?: {
    totalUsers?: number
    totalRevenue?: number
    totalBookings?: number
    completionRate?: number
  }
}

interface AnalyticsData {
  totalUsers: number
  totalRevenue: number
  totalBookings: number
  completionRate: number
  userGrowth: number
  revenueGrowth: number
  bookingGrowth: number
  topServices: Array<{
    name: string
    bookings: number
    revenue: number
  }>
  userRoles: Array<{
    role: string
    count: number
    percentage: number
  }>
  monthlyStats: Array<{
    month: string
    users: number
    revenue: number
    bookings: number
  }>
}

function AdminReportsPageContent() {
  const { users, services, bookings, invoices, loading, error, refresh } = useDashboardData()
  const [reports, setReports] = useState<Report[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [selectedTab, setSelectedTab] = useState<'all' | 'financial' | 'user' | 'service' | 'booking' | 'analytics'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [hasRecentUpdate, setHasRecentUpdate] = useState(false)

  // Real-time subscription for reports data
  const { status: realtimeStatus, lastUpdate } = useAdminRealtime({
    enableUsers: true,
    enableServices: true,
    enableBookings: true,
    enableInvoices: true,
    enablePermissions: false,
    enableVerifications: false,
    debounceMs: 3000,
    showToasts: false
  })

  // Auto-refresh when real-time updates occur
  useEffect(() => {
    if (lastUpdate) {
      setHasRecentUpdate(true)
      loadAnalytics()
      setTimeout(() => setHasRecentUpdate(false), 3000)
    }
  }, [lastUpdate])

  useEffect(() => {
    loadReports()
    loadAnalytics()
  }, [])

  const loadReports = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // Fetch real reports from database
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .order('generated_at', { ascending: false })
      
      // Handle case where reports table doesn't exist yet
      if (reportsError) {
        if (reportsError.code === '42P01') {
          // Table doesn't exist - this is okay, just show empty state
          setReports([])
          return
        }
        throw reportsError
      }
      
      setReports(reportsData || [])
    } catch (error: any) {
      console.error('Error loading reports:', error)
      // Don't show error toast if table doesn't exist
      if (error.code !== '42P01') {
        toast.error('Failed to load reports')
      }
      setReports([])
    }
  }

  const loadAnalytics = async () => {
    try {
      // Calculate real analytics from actual data
      const totalUsers = users.length
      const totalBookings = bookings.length
      const totalRevenue = invoices
        .filter(invoice => invoice.status === 'paid')
        .reduce((sum, invoice) => sum + (invoice.amount || 0), 0)
      
      const completedBookings = bookings.filter(b => b.status === 'completed').length
      const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0
      
      // Calculate user role distribution
      const userRoleMap = new Map<string, number>()
      users.forEach(user => {
        const role = user.role || 'Unknown'
        userRoleMap.set(role, (userRoleMap.get(role) || 0) + 1)
      })
      
      const userRoles = Array.from(userRoleMap.entries()).map(([role, count]) => ({
        role: role.charAt(0).toUpperCase() + role.slice(1),
        count,
        percentage: totalUsers > 0 ? (count / totalUsers) * 100 : 0
      }))
      
      // Calculate top services by bookings and revenue
      const serviceMap = new Map<string, { bookings: number, revenue: number }>()
      bookings.forEach(booking => {
        const serviceName = (booking as any).service_title || (booking as any).serviceTitle || 'Unknown Service'
        const current = serviceMap.get(serviceName) || { bookings: 0, revenue: 0 }
        const revenue = (booking as any).total_amount || (booking as any).totalAmount || (booking as any).amount || 0
        serviceMap.set(serviceName, {
          bookings: current.bookings + 1,
          revenue: current.revenue + revenue
        })
      })
      
      const topServices = Array.from(serviceMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 5)
      
      // Calculate monthly stats (last 4 months)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monthlyData = new Map<string, { users: number, revenue: number, bookings: number }>()
      
      const now = new Date()
      for (let i = 3; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`
        monthlyData.set(monthKey, { users: 0, revenue: 0, bookings: 0 })
      }
      
      bookings.forEach(booking => {
        const date = new Date((booking as any).created_at || (booking as any).createdAt)
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`
        const current = monthlyData.get(monthKey)
        if (current) {
          current.bookings++
          current.revenue += (booking as any).total_amount || (booking as any).totalAmount || (booking as any).amount || 0
        }
      })
      
      const monthlyStats = Array.from(monthlyData.entries()).map(([key, data]) => {
        const [year, monthIndex] = key.split('-').map(Number)
        return {
          month: monthNames[monthIndex],
          ...data
        }
      })
      
      // Calculate growth metrics from monthly stats
      const previousMonthBookings = monthlyStats.length >= 2 ? monthlyStats[monthlyStats.length - 2].bookings : 0
      const currentMonthBookings = monthlyStats.length >= 1 ? monthlyStats[monthlyStats.length - 1].bookings : 0
      const bookingGrowthCalc = previousMonthBookings > 0 
        ? ((currentMonthBookings - previousMonthBookings) / previousMonthBookings) * 100 
        : 0
      
      const previousMonthRevenue = monthlyStats.length >= 2 ? monthlyStats[monthlyStats.length - 2].revenue : 0
      const currentMonthRevenue = monthlyStats.length >= 1 ? monthlyStats[monthlyStats.length - 1].revenue : 0
      const revenueGrowthCalc = previousMonthRevenue > 0 
        ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
        : 0

      const realAnalytics: AnalyticsData = {
        totalUsers,
        totalRevenue,
        totalBookings,
        completionRate,
        userGrowth: 0, // Would require historical snapshots
        revenueGrowth: revenueGrowthCalc,
        bookingGrowth: bookingGrowthCalc,
        topServices,
        userRoles,
        monthlyStats
      }

      setAnalytics(realAnalytics)
    } catch (error) {
      console.error('Error loading analytics:', error)
    }
  }

  const generateReport = async (type: string) => {
    try {
      toast.info(`Preparing ${type} report...`)
      
      const supabase = await getSupabaseClient()
      
      // Get current analytics data
      const reportMetrics = {
        totalUsers: analytics?.totalUsers || 0,
        totalRevenue: analytics?.totalRevenue || 0,
        totalBookings: analytics?.totalBookings || 0,
        completionRate: analytics?.completionRate || 0
      }
      
      // Insert report record into database
      const { data, error } = await supabase
        .from('reports')
        .insert({
          title: `${type} Report - ${new Date().toLocaleDateString()}`,
          type: type.toLowerCase() as 'financial' | 'user' | 'service' | 'booking' | 'analytics',
          description: `Comprehensive ${type.toLowerCase()} analysis and insights`,
          status: 'ready',
          metrics: reportMetrics,
          generated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) throw error
      
      toast.success(`${type} report generated successfully!`)
      await loadReports()
    } catch (error: any) {
      console.error('Error generating report:', error)
      if (error?.code === '42P01') {
        toast.error('Reports table not found. Please run CREATE_REPORTS_TABLE.sql migration.')
      } else {
        toast.error('Failed to generate report')
      }
    }
  }

  const downloadReport = (report: Report) => {
    try {
      // Generate CSV from report metrics
      const csvData = [
        ['Report', report.title],
        ['Type', report.type],
        ['Generated', new Date(report.generated_at).toLocaleString()],
        ['Status', report.status],
        [''],
        ['Metrics', 'Value']
      ]
      
      if (report.metrics) {
        if (report.metrics.totalUsers) csvData.push(['Total Users', report.metrics.totalUsers.toString()])
        if (report.metrics.totalRevenue) csvData.push(['Total Revenue', report.metrics.totalRevenue.toString()])
        if (report.metrics.totalBookings) csvData.push(['Total Bookings', report.metrics.totalBookings.toString()])
        if (report.metrics.completionRate) csvData.push(['Completion Rate', `${report.metrics.completionRate}%`])
      }
      
      const csv = csvData.map(row => row.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.title.replace(/\s+/g, '-')}-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success(`Downloaded ${report.title}`)
    } catch (error) {
      console.error('Error downloading report:', error)
      toast.error('Failed to download report')
    }
  }

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'financial': return <DollarSign className="h-5 w-5" />
      case 'user': return <Users className="h-5 w-5" />
      case 'service': return <BarChart3 className="h-5 w-5" />
      case 'booking': return <Calendar className="h-5 w-5" />
      case 'analytics': return <PieChart className="h-5 w-5" />
      default: return <FileText className="h-5 w-5" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ready: { label: 'Ready', variant: 'default' as const, icon: CheckCircle },
      generating: { label: 'Generating', variant: 'secondary' as const, icon: Clock },
      failed: { label: 'Failed', variant: 'destructive' as const, icon: XCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'secondary' as const, icon: AlertTriangle }
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  // Filter reports based on selected tab and search
  const filteredReports = reports.filter(report => {
    const matchesTab = selectedTab === 'all' || report.type === selectedTab
    const matchesSearch = searchQuery === '' || 
      (report.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter
    
    return matchesTab && matchesSearch && matchesStatus
  })

  // Get tab-specific analytics
  const getTabAnalytics = () => {
    if (!analytics) return null
    
    // Safe access to analytics properties with fallbacks
    const safeTotalRevenue = analytics?.totalRevenue || 0
    const safeTotalBookings = analytics?.totalBookings || 0
    const safeTotalUsers = analytics?.totalUsers || 0
    const safeTopServices = analytics?.topServices || []
    
    switch (selectedTab) {
      case 'financial':
        return {
          title: 'Financial Overview',
          description: 'Revenue, expenses, and profit analysis',
          metrics: [
            { label: 'Total Revenue', value: formatCurrency(safeTotalRevenue), icon: DollarSign },
            { label: 'Total Bookings', value: safeTotalBookings.toString(), icon: Calendar },
            { label: 'Avg Revenue/Booking', value: formatCurrency(safeTotalBookings > 0 ? safeTotalRevenue / safeTotalBookings : 0), icon: TrendingUp }
          ]
        }
      case 'user':
        const activeUsersCount = users.filter(u => u.status === 'active').length
        const userGrowthRate = analytics?.userGrowth || 0
        return {
          title: 'User Analytics',
          description: 'User registrations, roles, and engagement',
          metrics: [
            { label: 'Total Users', value: safeTotalUsers.toString(), icon: Users },
            { label: 'Active Users', value: activeUsersCount.toString(), icon: UserCheck },
            { label: 'Growth Rate', value: `${userGrowthRate > 0 ? '+' : ''}${userGrowthRate.toFixed(1)}%`, icon: TrendingUp }
          ]
        }
      case 'service':
        const totalServicesCount = services.length
        const averageBookingsPerService = totalServicesCount > 0 ? (safeTotalBookings / totalServicesCount).toFixed(1) : '0'
        return {
          title: 'Service Performance',
          description: 'Service bookings, ratings, and provider performance',
          metrics: [
            { label: 'Total Services', value: totalServicesCount.toString(), icon: BarChart3 },
            { label: 'Top Service', value: safeTopServices[0]?.name || 'N/A', icon: Building2 },
            { label: 'Avg Bookings/Service', value: averageBookingsPerService, icon: Activity }
          ]
        }
      case 'booking':
        const completedCount = bookings.filter(b => b.status === 'completed').length
        const realCompletionRate = safeTotalBookings > 0 ? ((completedCount / safeTotalBookings) * 100).toFixed(1) : '0'
        return {
          title: 'Booking Analytics',
          description: 'Booking trends, completion rates, and client insights',
          metrics: [
            { label: 'Total Bookings', value: safeTotalBookings.toString(), icon: Calendar },
            { label: 'Completion Rate', value: `${realCompletionRate}%`, icon: CheckCircle },
            { label: 'Avg Booking Value', value: formatCurrency(safeTotalBookings > 0 ? safeTotalRevenue / safeTotalBookings : 0), icon: DollarSign }
          ]
        }
      case 'analytics':
        return {
          title: 'Platform Analytics',
          description: 'Overall platform performance and growth metrics',
          metrics: [
            { label: 'Total Users', value: safeTotalUsers.toString(), icon: Users },
            { label: 'Total Revenue', value: formatCurrency(safeTotalRevenue), icon: DollarSign },
            { label: 'Total Bookings', value: safeTotalBookings.toString(), icon: Calendar }
          ]
        }
      default:
        return {
          title: 'All Reports Overview',
          description: 'Comprehensive platform analytics and insights',
          metrics: [
            { label: 'Total Users', value: safeTotalUsers.toString(), icon: Users },
            { label: 'Total Revenue', value: formatCurrency(safeTotalRevenue), icon: DollarSign },
            { label: 'Total Bookings', value: safeTotalBookings.toString(), icon: Calendar }
          ]
        }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'OMR'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className={`bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-8 text-white transition-all duration-300 ${hasRecentUpdate ? 'ring-4 ring-yellow-400' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">Analytics & Reports</h1>
              {realtimeStatus.connected && (
                <Badge className="bg-green-500/20 text-white border-white/30">
                  <Radio className="h-3 w-3 mr-1 animate-pulse" />
                  Live
                </Badge>
              )}
            </div>
            <p className="text-purple-100 text-lg mb-4">
              Comprehensive business intelligence with real-time analytics
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span>Users: {analytics?.totalUsers || 0}</span>
              </div>
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                <span>Revenue: {formatCurrency(analytics?.totalRevenue || 0)}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Bookings: {analytics?.totalBookings || 0}</span>
              </div>
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>Growth: +{analytics?.userGrowth || 0}%</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={loadReports}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => generateReport('Executive')}
            >
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Users</p>
                <p className="text-2xl font-bold">{analytics?.totalUsers || 0}</p>
                <p className="text-xs text-green-600">+{analytics?.userGrowth || 0}% this month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics?.totalRevenue || 0)}</p>
                <p className="text-xs text-green-600">+{analytics?.revenueGrowth || 0}% this month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Total Bookings</p>
                <p className="text-2xl font-bold">{analytics?.totalBookings || 0}</p>
                <p className="text-xs text-green-600">+{analytics?.bookingGrowth || 0}% this month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-sm font-medium">Completion Rate</p>
                <p className="text-2xl font-bold">{analytics?.completionRate || 0}%</p>
                <p className="text-xs text-muted-foreground">Average across all services</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Button 
          variant={selectedTab === 'all' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('all')}
          className="rounded-md"
        >
          All Reports
        </Button>
        <Button 
          variant={selectedTab === 'financial' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('financial')}
          className="rounded-md"
        >
          Financial
        </Button>
        <Button 
          variant={selectedTab === 'user' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('user')}
          className="rounded-md"
        >
          Users
        </Button>
        <Button 
          variant={selectedTab === 'service' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('service')}
          className="rounded-md"
        >
          Services
        </Button>
        <Button 
          variant={selectedTab === 'booking' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('booking')}
          className="rounded-md"
        >
          Bookings
        </Button>
        <Button 
          variant={selectedTab === 'analytics' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('analytics')}
          className="rounded-md"
        >
          Analytics
        </Button>
      </div>

      {/* Tab-specific Analytics */}
      {(() => {
        const tabAnalytics = getTabAnalytics()
        return tabAnalytics && (
          <Card>
            <CardHeader>
              <CardTitle>{tabAnalytics?.title || 'Analytics'}</CardTitle>
              <CardDescription>{tabAnalytics?.description || 'Overview metrics'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tabAnalytics.metrics.map((metric, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <metric.icon className="h-6 w-6 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                      <p className="text-lg font-bold text-gray-900">{metric.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Top Services & User Roles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Performing Services
            </CardTitle>
            <CardDescription>Services with highest bookings and revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.topServices.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">{service.bookings} bookings</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(service.revenue)}</p>
                    <p className="text-sm text-muted-foreground">
                      {((service.revenue / (analytics?.totalRevenue || 1)) * 100).toFixed(1)}% of total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Role Distribution
            </CardTitle>
            <CardDescription>Breakdown of users by role and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.userRoles.map((role, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="font-medium">{role.role}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{role.count} users</p>
                    <p className="text-sm text-muted-foreground">{role.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Comprehensive Reports</CardTitle>
          <CardDescription>Create detailed reports for different aspects of the system with client and provider insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center space-y-2"
              onClick={() => generateReport('Financial')}
            >
              <DollarSign className="h-6 w-6" />
              <span>Financial Report</span>
              <span className="text-xs text-muted-foreground">Revenue & Payments</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center space-y-2"
              onClick={() => generateReport('User')}
            >
              <Users className="h-6 w-6" />
              <span>User Analytics</span>
              <span className="text-xs text-muted-foreground">Growth & Activity</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center space-y-2"
              onClick={() => generateReport('Service')}
            >
              <BarChart3 className="h-6 w-6" />
              <span>Service Report</span>
              <span className="text-xs text-muted-foreground">Performance & Quality</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center space-y-2"
              onClick={() => generateReport('Booking')}
            >
              <Calendar className="h-6 w-6" />
              <span>Booking Analytics</span>
              <span className="text-xs text-muted-foreground">Trends & Insights</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center space-y-2"
              onClick={() => generateReport('Executive')}
            >
              <PieChart className="h-6 w-6" />
              <span>Executive Report</span>
              <span className="text-xs text-muted-foreground">KPI Dashboard</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>View and download previously generated reports with comprehensive analytics</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="generating">Generating</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Key Metrics</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getReportIcon(report.type)}
                        <span className="font-medium">{report?.title || 'Report'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {report.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-muted-foreground">
                        {report.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      {report.metrics && (
                        <div className="text-sm">
                          {report.metrics.totalUsers && (
                            <p>Users: {report.metrics.totalUsers}</p>
                          )}
                          {report.metrics.totalRevenue && (
                            <p>Revenue: {formatCurrency(report.metrics.totalRevenue)}</p>
                          )}
                          {report.metrics.totalBookings && (
                            <p>Bookings: {report.metrics.totalBookings}</p>
                          )}
                          {report.metrics.completionRate && (
                            <p>Completion: {report.metrics.completionRate}%</p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>
                      {new Date(report.generated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {report.status === 'ready' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadReport(report)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminReportsPage() {
  return (
    <DashboardErrorBoundary 
      dashboardName="Reports" 
      onRetry={() => window.location.reload()}
    >
      <AdminReportsPageContent />
    </DashboardErrorBoundary>
  )
}