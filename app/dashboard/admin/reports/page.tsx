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
  Search
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { useDashboardData } from '@/hooks/useDashboardData'
import { formatCurrency } from '@/lib/dashboard-data'
import { toast } from 'sonner'

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

export default function AdminReportsPage() {
  const { users, services, bookings, invoices, loading, error, refresh } = useDashboardData()
  const [reports, setReports] = useState<Report[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [selectedTab, setSelectedTab] = useState<'all' | 'financial' | 'user' | 'service' | 'booking' | 'analytics'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadReports()
    loadAnalytics()
  }, [])

  const loadReports = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // Mock data for demonstration
      const mockReports: Report[] = [
        {
          id: '1',
          title: 'Comprehensive Financial Report',
          type: 'financial',
          description: 'Revenue, expenses, profit analysis, and payment trends with client/provider breakdown',
          generated_at: new Date(Date.now() - 86400000).toISOString(),
          status: 'ready',
          file_url: '/reports/financial-comprehensive.pdf',
          metrics: {
            totalRevenue: 15750,
            totalBookings: 45,
            completionRate: 87.5
          }
        },
        {
          id: '2',
          title: 'User Analytics & Growth Report',
          type: 'user',
          description: 'User registrations, role distribution, activity metrics, and engagement analysis',
          generated_at: new Date(Date.now() - 172800000).toISOString(),
          status: 'ready',
          file_url: '/reports/user-analytics.pdf',
          metrics: {
            totalUsers: 156,
            totalBookings: 45,
            completionRate: 87.5
          }
        },
        {
          id: '3',
          title: 'Service Performance & Quality Report',
          type: 'service',
          description: 'Service booking rates, completion times, customer satisfaction, and provider performance',
          generated_at: new Date(Date.now() - 259200000).toISOString(),
          status: 'ready',
          file_url: '/reports/service-performance.pdf',
          metrics: {
            totalBookings: 45,
            completionRate: 87.5
          }
        },
        {
          id: '4',
          title: 'Booking Analytics & Trends Report',
          type: 'booking',
          description: 'Booking trends, cancellation rates, revenue by service, and client/provider insights',
          generated_at: new Date(Date.now() - 345600000).toISOString(),
          status: 'generating'
        },
        {
          id: '5',
          title: 'Executive Dashboard Report',
          type: 'analytics',
          description: 'High-level KPIs, growth metrics, and strategic insights for management',
          generated_at: new Date(Date.now() - 432000000).toISOString(),
          status: 'ready',
          file_url: '/reports/executive-dashboard.pdf',
          metrics: {
            totalUsers: 156,
            totalRevenue: 15750,
            totalBookings: 45,
            completionRate: 87.5
          }
        }
      ]

      setReports(mockReports)
    } catch (error) {
      console.error('Error loading reports:', error)
      toast.error('Failed to load reports')
    }
  }

  const loadAnalytics = async () => {
    try {
      // Mock analytics data
      const mockAnalytics: AnalyticsData = {
        totalUsers: 156,
        totalRevenue: 15750,
        totalBookings: 45,
        completionRate: 87.5,
        userGrowth: 12.5,
        revenueGrowth: 8.3,
        bookingGrowth: 15.2,
        topServices: [
          { name: 'Website Development', bookings: 12, revenue: 6000 },
          { name: 'Digital Marketing', bookings: 10, revenue: 3000 },
          { name: 'Graphic Design', bookings: 8, revenue: 1600 },
          { name: 'Content Writing', bookings: 7, revenue: 1400 },
          { name: 'Translation Services', bookings: 5, revenue: 600 }
        ],
        userRoles: [
          { role: 'Client', count: 89, percentage: 57.1 },
          { role: 'Provider', count: 45, percentage: 28.8 },
          { role: 'Admin', count: 12, percentage: 7.7 },
          { role: 'Manager', count: 6, percentage: 3.8 },
          { role: 'Support', count: 4, percentage: 2.6 }
        ],
        monthlyStats: [
          { month: 'Jan', users: 45, revenue: 3200, bookings: 12 },
          { month: 'Feb', users: 52, revenue: 3800, bookings: 15 },
          { month: 'Mar', users: 48, revenue: 4200, bookings: 18 },
          { month: 'Apr', users: 61, revenue: 4550, bookings: 20 }
        ]
      }

      setAnalytics(mockAnalytics)
    } catch (error) {
      console.error('Error loading analytics:', error)
    }
  }

  const generateReport = async (type: string) => {
    try {
      toast.success(`Generating ${type} report...`)
      // In a real implementation, this would trigger a background job
      setTimeout(() => {
        toast.success(`${type} report generated successfully!`)
        loadReports()
      }, 2000)
    } catch (error) {
      toast.error('Failed to generate report')
    }
  }

  const downloadReport = (report: Report) => {
    if (report.file_url) {
      // In a real implementation, this would download the actual file
      toast.success(`Downloading ${report.title}...`)
    } else {
      toast.error('Report file not available')
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
    
    switch (selectedTab) {
      case 'financial':
        return {
          title: 'Financial Overview',
          description: 'Revenue, expenses, and profit analysis',
          metrics: [
            { label: 'Total Revenue', value: formatCurrency(analytics.totalRevenue), icon: DollarSign },
            { label: 'Total Bookings', value: analytics.totalBookings.toString(), icon: Calendar },
            { label: 'Avg Revenue/Booking', value: formatCurrency(analytics.totalRevenue / analytics.totalBookings), icon: TrendingUp }
          ]
        }
      case 'user':
        return {
          title: 'User Analytics',
          description: 'User registrations, roles, and engagement',
          metrics: [
            { label: 'Total Users', value: analytics.totalUsers.toString(), icon: Users },
            { label: 'Active Users', value: Math.floor(analytics.totalUsers * 0.8).toString(), icon: UserCheck },
            { label: 'Growth Rate', value: '+12.5%', icon: TrendingUp }
          ]
        }
      case 'service':
        return {
          title: 'Service Performance',
          description: 'Service bookings, ratings, and provider performance',
          metrics: [
            { label: 'Total Services', value: analytics.topServices.length.toString(), icon: BarChart3 },
            { label: 'Top Service', value: analytics.topServices[0]?.name || 'N/A', icon: Building2 },
            { label: 'Avg Rating', value: '4.8/5', icon: Activity }
          ]
        }
      case 'booking':
        return {
          title: 'Booking Analytics',
          description: 'Booking trends, completion rates, and client insights',
          metrics: [
            { label: 'Total Bookings', value: analytics.totalBookings.toString(), icon: Calendar },
            { label: 'Completion Rate', value: '87.5%', icon: CheckCircle },
            { label: 'Avg Booking Value', value: formatCurrency(analytics.totalRevenue / analytics.totalBookings), icon: DollarSign }
          ]
        }
      case 'analytics':
        return {
          title: 'Platform Analytics',
          description: 'Overall platform performance and growth metrics',
          metrics: [
            { label: 'Total Users', value: analytics.totalUsers.toString(), icon: Users },
            { label: 'Total Revenue', value: formatCurrency(analytics.totalRevenue), icon: DollarSign },
            { label: 'Total Bookings', value: analytics.totalBookings.toString(), icon: Calendar }
          ]
        }
      default:
        return {
          title: 'All Reports Overview',
          description: 'Comprehensive platform analytics and insights',
          metrics: [
            { label: 'Total Users', value: analytics.totalUsers.toString(), icon: Users },
            { label: 'Total Revenue', value: formatCurrency(analytics.totalRevenue), icon: DollarSign },
            { label: 'Total Bookings', value: analytics.totalBookings.toString(), icon: Calendar }
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
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Analytics & Reports</h1>
            <p className="text-purple-100 text-lg mb-4">
              Comprehensive business intelligence and detailed system analytics
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
      {getTabAnalytics() && (
        <Card>
          <CardHeader>
            <CardTitle>{getTabAnalytics()?.title}</CardTitle>
            <CardDescription>{getTabAnalytics()?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {getTabAnalytics()?.metrics.map((metric, index) => (
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
      )}

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
                        <span className="font-medium">{report.title}</span>
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