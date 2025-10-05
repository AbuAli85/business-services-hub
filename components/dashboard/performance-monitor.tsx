'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  Zap, 
  Clock, 
  Database, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Download,
  Settings
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface PerformanceMonitorProps {
  bookingId: string
  className?: string
}

interface PerformanceMetrics {
  // Real-time metrics
  activeUsers: number
  realtimeConnections: number
  apiResponseTime: number
  databaseQueryTime: number
  memoryUsage: number
  cpuUsage: number
  
  // Milestone-specific metrics
  milestonesLoaded: number
  tasksLoaded: number
  dragDropOperations: number
  formSubmissions: number
  errorCount: number
  
  // Historical data
  performanceHistory: Array<{
    timestamp: string
    responseTime: number
    memoryUsage: number
    errorCount: number
  }>
  
  // Performance alerts
  alerts: Array<{
    id: string
    type: 'warning' | 'error' | 'info'
    message: string
    timestamp: string
    resolved: boolean
  }>
}

interface LoadTestResult {
  id: string
  testName: string
  duration: number
  concurrentUsers: number
  requestsPerSecond: number
  averageResponseTime: number
  errorRate: number
  successRate: number
  timestamp: string
}

export function PerformanceMonitor({ bookingId, className }: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [loadTestResults, setLoadTestResults] = useState<LoadTestResult[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('1h')
  
  const monitoringInterval = useRef<NodeJS.Timeout | null>(null)
  const performanceObserver = useRef<PerformanceObserver | null>(null)

  useEffect(() => {
    loadPerformanceData()
    return () => {
      if (monitoringInterval.current) {
        clearInterval(monitoringInterval.current)
      }
      if (performanceObserver.current) {
        performanceObserver.current.disconnect()
      }
    }
  }, [bookingId, selectedTimeRange])

  const loadPerformanceData = async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      // Load performance metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('performance_metrics')
        .select('*')
        .eq('booking_id', bookingId)
        .gte('created_at', getTimeRangeStart(selectedTimeRange))
        .order('created_at', { ascending: false })
        .limit(100)

      if (metricsError) throw metricsError

      // Load load test results
      const { data: loadTestData, error: loadTestError } = await supabase
        .from('load_test_results')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (loadTestError) throw loadTestError

      // Calculate current metrics
      const currentMetrics = calculateCurrentMetrics(metricsData || [])
      setMetrics(currentMetrics)
      setLoadTestResults(loadTestData || [])
    } catch (error) {
      console.error('Error loading performance data:', error)
      toast.error('Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }

  const calculateCurrentMetrics = (data: any[]): PerformanceMetrics => {
    const now = new Date()
    const recentData = data.filter(d => 
      new Date(d.created_at) > new Date(now.getTime() - 5 * 60 * 1000) // Last 5 minutes
    )

    const latest = recentData[0] || {}
    
    return {
      activeUsers: latest.active_users || 0,
      realtimeConnections: latest.realtime_connections || 0,
      apiResponseTime: latest.api_response_time || 0,
      databaseQueryTime: latest.database_query_time || 0,
      memoryUsage: latest.memory_usage || 0,
      cpuUsage: latest.cpu_usage || 0,
      milestonesLoaded: latest.milestones_loaded || 0,
      tasksLoaded: latest.tasks_loaded || 0,
      dragDropOperations: latest.drag_drop_operations || 0,
      formSubmissions: latest.form_submissions || 0,
      errorCount: latest.error_count || 0,
      performanceHistory: data.slice(0, 50).map(d => ({
        timestamp: d.created_at,
        responseTime: d.api_response_time || 0,
        memoryUsage: d.memory_usage || 0,
        errorCount: d.error_count || 0
      })),
      alerts: generatePerformanceAlerts(data)
    }
  }

  const generatePerformanceAlerts = (data: any[]): Array<{
    id: string
    type: 'warning' | 'error' | 'info'
    message: string
    timestamp: string
    resolved: boolean
  }> => {
    const alerts = []
    const now = new Date()
    const lastHour = data.filter(d => 
      new Date(d.created_at) > new Date(now.getTime() - 60 * 60 * 1000)
    )

    // Check for high response times
    const avgResponseTime = lastHour.reduce((sum, d) => sum + (d.api_response_time || 0), 0) / lastHour.length
    if (avgResponseTime > 2000) {
      alerts.push({
        id: 'high-response-time',
        type: 'warning' as const,
        message: `Average response time is ${avgResponseTime.toFixed(0)}ms (threshold: 2000ms)`,
        timestamp: now.toISOString(),
        resolved: false
      })
    }

    // Check for high error rates
    const totalErrors = lastHour.reduce((sum, d) => sum + (d.error_count || 0), 0)
    if (totalErrors > 10) {
      alerts.push({
        id: 'high-error-rate',
        type: 'error' as const,
        message: `${totalErrors} errors in the last hour`,
        timestamp: now.toISOString(),
        resolved: false
      })
    }

    // Check for memory usage
    const latestMemory = lastHour[0]?.memory_usage || 0
    if (latestMemory > 100) {
      alerts.push({
        id: 'high-memory-usage',
        type: 'warning' as const,
        message: `Memory usage is ${latestMemory}MB (threshold: 100MB)`,
        timestamp: now.toISOString(),
        resolved: false
      })
    }

    return alerts
  }

  const getTimeRangeStart = (range: string) => {
    const now = new Date()
    switch (range) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString()
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      default:
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    }
  }

  const startMonitoring = () => {
    setIsMonitoring(true)
    
    // Start performance monitoring
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      performanceObserver.current = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.entryType === 'measure') {
            console.log('Performance measure:', entry.name, entry.duration)
          }
        })
      })
      
      performanceObserver.current.observe({ entryTypes: ['measure', 'navigation'] })
    }

    // Start interval monitoring
    monitoringInterval.current = setInterval(async () => {
      try {
        const supabase = await getSupabaseClient()
        
        // Collect current performance data
        const performanceData = {
          booking_id: bookingId,
          active_users: 1, // Current user (would need session tracking for actual count)
          realtime_connections: metrics?.realtimeConnections || 0,
          api_response_time: metrics?.apiResponseTime || 0,
          database_query_time: metrics?.dbQueryTime || 0,
          memory_usage: 0, // Requires server-side monitoring
          cpu_usage: 0, // Requires server-side monitoring
          milestones_loaded: metrics?.milestonesLoaded || 0,
          tasks_loaded: metrics?.tasksLoaded || 0,
          drag_drop_operations: metrics?.dragDropOperations || 0,
          form_submissions: metrics?.formSubmissions || 0,
          error_count: metrics?.errorCount || 0,
          created_at: new Date().toISOString()
        }

        // Store performance data
        await supabase
          .from('performance_metrics')
          .insert(performanceData)

        // Update local metrics
        setMetrics(prev => prev ? {
          ...prev,
          ...performanceData,
          performanceHistory: [
            {
              timestamp: performanceData.created_at,
              responseTime: performanceData.api_response_time,
              memoryUsage: performanceData.memory_usage,
              errorCount: performanceData.error_count
            },
            ...(prev.performanceHistory || []).slice(0, 49)
          ]
        } : null)

      } catch (error) {
        console.error('Error collecting performance data:', error)
      }
    }, 30000) // Every 30 seconds
  }

  const stopMonitoring = () => {
    setIsMonitoring(false)
    if (monitoringInterval.current) {
      clearInterval(monitoringInterval.current)
      monitoringInterval.current = null
    }
    if (performanceObserver.current) {
      performanceObserver.current.disconnect()
      performanceObserver.current = null
    }
  }

  const runLoadTest = async () => {
    try {
      const response = await fetch('/api/performance/load-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      })

      if (response.ok) {
        toast.success('Load test started')
        loadPerformanceData() // Refresh data
      } else {
        throw new Error('Failed to start load test')
      }
    } catch (error) {
      console.error('Error running load test:', error)
      toast.error('Failed to start load test')
    }
  }

  const exportPerformanceData = () => {
    if (!metrics) return

    const csvData = [
      ['Metric', 'Value', 'Timestamp'],
      ['Active Users', metrics.activeUsers, new Date().toISOString()],
      ['API Response Time (ms)', metrics.apiResponseTime, new Date().toISOString()],
      ['Database Query Time (ms)', metrics.databaseQueryTime, new Date().toISOString()],
      ['Memory Usage (MB)', metrics.memoryUsage, new Date().toISOString()],
      ['CPU Usage (%)', metrics.cpuUsage, new Date().toISOString()],
      ['Milestones Loaded', metrics.milestonesLoaded, new Date().toISOString()],
      ['Tasks Loaded', metrics.tasksLoaded, new Date().toISOString()],
      ['Error Count', metrics.errorCount, new Date().toISOString()]
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-metrics-${bookingId}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('Performance data exported to CSV')
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading performance data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No performance data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-blue-600" />
              <CardTitle>Performance Monitor</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value as any)}
                className="px-3 py-1 border rounded-md text-sm"
                aria-label="Select time range for performance monitoring"
                title="Select time range for performance monitoring"
              >
                <option value="1h">Last 1 hour</option>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
              <Button
                variant={isMonitoring ? "destructive" : "default"}
                size="sm"
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
              >
                {isMonitoring ? 'Stop' : 'Start'} Monitoring
              </Button>
              <Button variant="outline" size="sm" onClick={runLoadTest}>
                <Zap className="h-4 w-4 mr-2" />
                Load Test
              </Button>
              <Button variant="outline" size="sm" onClick={exportPerformanceData}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="load-tests">Load Tests</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Key Performance Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Response Time</p>
                        <p className="text-2xl font-bold">{metrics.apiResponseTime}ms</p>
                      </div>
                      <Clock className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="mt-2">
                      <Progress 
                        value={Math.min((metrics.apiResponseTime / 2000) * 100, 100)} 
                        className="h-2" 
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Users</p>
                        <p className="text-2xl font-bold">{metrics.activeUsers}</p>
                      </div>
                      <Users className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Memory Usage</p>
                        <p className="text-2xl font-bold">{metrics.memoryUsage}MB</p>
                      </div>
                      <Database className="h-8 w-8 text-orange-600" />
                    </div>
                    <div className="mt-2">
                      <Progress 
                        value={Math.min((metrics.memoryUsage / 100) * 100, 100)} 
                        className="h-2" 
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Error Count</p>
                        <p className="text-2xl font-bold">{metrics.errorCount}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">API Performance</span>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={Math.min((metrics.apiResponseTime / 2000) * 100, 100)} 
                          className="w-32 h-2" 
                        />
                        <Badge variant={metrics.apiResponseTime < 1000 ? 'default' : 'destructive'}>
                          {metrics.apiResponseTime < 1000 ? 'Excellent' : 
                           metrics.apiResponseTime < 2000 ? 'Good' : 'Poor'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Memory Usage</span>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={Math.min((metrics.memoryUsage / 100) * 100, 100)} 
                          className="w-32 h-2" 
                        />
                        <Badge variant={metrics.memoryUsage < 50 ? 'default' : 'destructive'}>
                          {metrics.memoryUsage < 50 ? 'Low' : 
                           metrics.memoryUsage < 100 ? 'Medium' : 'High'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Error Rate</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={metrics.errorCount === 0 ? 'default' : 'destructive'}>
                          {metrics.errorCount === 0 ? 'No Errors' : `${metrics.errorCount} Errors`}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-6">
              {/* Detailed Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">System Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">API Response Time</span>
                      <span className="font-medium">{metrics.apiResponseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Database Query Time</span>
                      <span className="font-medium">{metrics.databaseQueryTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Memory Usage</span>
                      <span className="font-medium">{metrics.memoryUsage}MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">CPU Usage</span>
                      <span className="font-medium">{metrics.cpuUsage}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Application Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Milestones Loaded</span>
                      <span className="font-medium">{metrics.milestonesLoaded}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Tasks Loaded</span>
                      <span className="font-medium">{metrics.tasksLoaded}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Drag & Drop Operations</span>
                      <span className="font-medium">{metrics.dragDropOperations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Form Submissions</span>
                      <span className="font-medium">{metrics.formSubmissions}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="load-tests" className="space-y-6">
              {/* Load Test Results */}
              <div className="space-y-4">
                {loadTestResults.map((result) => (
                  <Card key={result.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{result.testName}</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Duration: {result.duration}s | Users: {result.concurrentUsers}</p>
                            <p>RPS: {result.requestsPerSecond} | Response Time: {result.averageResponseTime}ms</p>
                            <p>Success Rate: {result.successRate}% | Error Rate: {result.errorRate}%</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={result.successRate > 95 ? 'default' : 'destructive'}>
                            {result.successRate > 95 ? 'Passed' : 'Failed'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(result.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {loadTestResults.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No load test results available
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-6">
              {/* Performance Alerts */}
              <div className="space-y-4">
                {metrics.alerts.map((alert) => (
                  <Card key={alert.id} className={alert.resolved ? 'opacity-50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {alert.type === 'error' ? (
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                          ) : alert.type === 'warning' ? (
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          )}
                          <div>
                            <p className="font-medium">{alert.message}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={alert.resolved ? 'secondary' : 'destructive'}>
                          {alert.resolved ? 'Resolved' : 'Active'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {metrics.alerts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No performance alerts
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
