'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseClient } from '@/lib/supabase'
import { 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Award,
  Clock,
  Filter
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ReportData {
  totalReports: number
  generatedReports: number
  pendingReports: number
  reportTypes: Array<{
    name: string
    count: number
    lastGenerated: string
    status: 'active' | 'inactive'
  }>
  recentReports: Array<{
    id: string
    type: string
    title: string
    generatedAt: string
    status: 'completed' | 'processing' | 'failed'
    size: string
  }>
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedReportType, setSelectedReportType] = useState('all')
  const [timeRange, setTimeRange] = useState('30')

  useEffect(() => {
    fetchReports()
  }, [selectedReportType, timeRange])

  const fetchReports = async () => {
    try {
      // Mock reports data for now
      const mockReports: ReportData = {
        totalReports: 24,
        generatedReports: 18,
        pendingReports: 6,
        reportTypes: [
          {
            name: 'User Activity Report',
            count: 8,
            lastGenerated: new Date(Date.now() - 86400000).toISOString(),
            status: 'active'
          },
          {
            name: 'Revenue Analytics',
            count: 6,
            lastGenerated: new Date(Date.now() - 172800000).toISOString(),
            status: 'active'
          },
          {
            name: 'Service Performance',
            count: 4,
            lastGenerated: new Date(Date.now() - 259200000).toISOString(),
            status: 'active'
          },
          {
            name: 'Platform Health',
            count: 3,
            lastGenerated: new Date(Date.now() - 345600000).toISOString(),
            status: 'active'
          },
          {
            name: 'Compliance Report',
            count: 2,
            lastGenerated: new Date(Date.now() - 432000000).toISOString(),
            status: 'inactive'
          }
        ],
        recentReports: [
          {
            id: '1',
            type: 'User Activity',
            title: 'Weekly User Engagement Report',
            generatedAt: new Date(Date.now() - 3600000).toISOString(),
            status: 'completed',
            size: '2.4 MB'
          },
          {
            id: '2',
            type: 'Revenue',
            title: 'Monthly Revenue Analysis',
            generatedAt: new Date(Date.now() - 7200000).toISOString(),
            status: 'completed',
            size: '1.8 MB'
          },
          {
            id: '3',
            type: 'Performance',
            title: 'Service Quality Metrics',
            generatedAt: new Date(Date.now() - 10800000).toISOString(),
            status: 'processing',
            size: '3.2 MB'
          },
          {
            id: '4',
            type: 'Health',
            title: 'Platform System Status',
            generatedAt: new Date(Date.now() - 14400000).toISOString(),
            status: 'completed',
            size: '0.9 MB'
          }
        ]
      }

      setReports(mockReports)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching reports:', error)
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const generateReport = async (reportType: string) => {
    try {
      console.log(`Generating ${reportType} report...`)
      // Here you would implement the actual report generation logic
      // For now, we'll just show a success message
      alert(`${reportType} report generation started!`)
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate report')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!reports) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium mb-2">No reports available</p>
        <p className="text-sm">Reports will appear here once generated</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Reports</h1>
          <p className="text-gray-600 mt-2">
            Generate and manage comprehensive platform reports and analytics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Report Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.totalReports}</div>
            <p className="text-xs text-muted-foreground">
              All report types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Generated</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.generatedReports}</div>
            <p className="text-xs text-muted-foreground">
              Successfully created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.pendingReports}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting generation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Types */}
      <Card>
        <CardHeader>
          <CardTitle>Report Types</CardTitle>
          <CardDescription>
            Available report types and their generation status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.reportTypes.map((reportType) => (
              <div
                key={reportType.name}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    reportType.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <FileText className={`h-5 w-5 ${
                      reportType.status === 'active' ? 'text-green-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{reportType.name}</h4>
                    <p className="text-sm text-gray-500">
                      {reportType.count} reports generated
                    </p>
                    <p className="text-xs text-gray-400">
                      Last: {new Date(reportType.lastGenerated).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge className={reportType.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {reportType.status}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => generateReport(reportType.name)}
                    disabled={reportType.status === 'inactive'}
                  >
                    Generate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>
            Latest generated reports and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.recentReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{report.title}</h4>
                    <p className="text-sm text-gray-500">{report.type}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(report.generatedAt).toLocaleDateString()} • {report.size}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(report.status)}>
                    {report.status}
                  </Badge>
                  {report.status === 'completed' && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common report generation tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col space-y-2"
              onClick={() => generateReport('User Activity')}
            >
              <Users className="h-6 w-6" />
              <span>User Report</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col space-y-2"
              onClick={() => generateReport('Revenue Analytics')}
            >
              <DollarSign className="h-6 w-6" />
              <span>Revenue Report</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col space-y-2"
              onClick={() => generateReport('Platform Health')}
            >
              <Activity className="h-6 w-6" />
              <span>Health Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
