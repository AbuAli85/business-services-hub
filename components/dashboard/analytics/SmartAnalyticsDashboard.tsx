'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  Users, 
  Target,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react'
import { BookingTrendsChart } from './BookingTrendsChart'
import { RevenueAnalyticsChart } from './RevenueAnalyticsChart'
import { CompletionAnalyticsChart } from './CompletionAnalyticsChart'

interface DashboardKPIs {
  total_bookings: number
  completed_bookings: number
  in_progress_bookings: number
  pending_bookings: number
  total_revenue: number
  completed_revenue: number
  avg_completion_days: number
  completion_rate: number
  avg_progress: number
  revenue_growth: number
  booking_growth: number
}

interface SmartAnalyticsDashboardProps {
  className?: string
}

export function SmartAnalyticsDashboard({ className }: SmartAnalyticsDashboardProps) {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState('overview')

  const fetchKPIs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/analytics/kpis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          days_back: 30
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch KPIs')
      }

      const data = await response.json()
      setKpis(data[0] || {})
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching KPIs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKPIs()
  }, [])

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (growth < 0) return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
    return <div className="h-4 w-4" />
  }

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600'
    if (growth < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const handleRefresh = () => {
    fetchKPIs()
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export analytics data')
  }

  if (loading && !kpis) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights into your booking performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis.total_bookings}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getGrowthIcon(kpis.booking_growth)}
                    <span className={`text-sm ${getGrowthColor(kpis.booking_growth)}`}>
                      {kpis.booking_growth > 0 ? '+' : ''}{kpis.booking_growth.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">${kpis.total_revenue.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getGrowthIcon(kpis.revenue_growth)}
                    <span className={`text-sm ${getGrowthColor(kpis.revenue_growth)}`}>
                      {kpis.revenue_growth > 0 ? '+' : ''}{kpis.revenue_growth.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis.completion_rate.toFixed(1)}%</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {kpis.completed_bookings} of {kpis.total_bookings} completed
                  </p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Completion Time</p>
                  <p className="text-2xl font-bold text-gray-900">N/A</p>
                  <p className="text-sm text-gray-500 mt-1">Not available</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Overview */}
      {kpis && (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Booking Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{kpis.total_bookings}</div>
                  <div className="text-sm text-blue-700">Total</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{kpis.completed_bookings}</div>
                  <div className="text-sm text-green-700">Completed</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{kpis.in_progress_bookings}</div>
                  <div className="text-sm text-yellow-700">In Progress</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{kpis.pending_bookings}</div>
                  <div className="text-sm text-gray-700">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <BookingTrendsChart />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <RevenueAnalyticsChart />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <CompletionAnalyticsChart />
        </TabsContent>
      </Tabs>

      {/* Last Updated */}
      <div className="mt-8 text-center text-sm text-gray-500">
        Last updated: {lastUpdated.toLocaleString()}
        {error && (
          <div className="mt-2 text-red-600">
            Error: {error}
          </div>
        )}
      </div>
    </div>
  )
}
