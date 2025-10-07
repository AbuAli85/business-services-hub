'use client'

import { useState, useEffect } from 'react'
import { useRefreshCallback } from '@/contexts/AutoRefreshContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle,
  Zap,
  Database,
  MessageSquare,
  BarChart3,
  User,
  Settings
} from 'lucide-react'
import { 
  edgeFunctions, 
  getPerformanceStats, 
  getMonitoringEvents, 
  clearMonitoringEvents,
  healthCheck,
  type MonitoringEvent 
} from '@/lib/edge-functions'

interface HealthStatus {
  [key: string]: boolean
}

export function EdgeFunctionMonitor() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({})
  const [performanceStats, setPerformanceStats] = useState(getPerformanceStats())
  const [monitoringEvents, setMonitoringEvents] = useState<MonitoringEvent[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Register with centralized auto-refresh system
  useRefreshCallback(() => {
    if (autoRefresh) {
      refreshData()
    }
  }, [autoRefresh])

  // Initial load
  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = async () => {
    setIsRefreshing(true)
    try {
      // Check health of all functions
      const health = await healthCheck()
      setHealthStatus(health)
      
      // Update performance stats
      setPerformanceStats(getPerformanceStats())
      
      // Update monitoring events
      setMonitoringEvents(getMonitoringEvents())
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const clearEvents = () => {
    clearMonitoringEvents()
    setMonitoringEvents([])
    setPerformanceStats(getPerformanceStats())
  }

  const getFunctionIcon = (functionName: string) => {
    const icons: { [key: string]: any } = {
      'auth-manager': User,
      'service-manager': Database,
      'booking-manager': Clock,
      'communication-hub': MessageSquare,
      'analytics-engine': BarChart3
    }
    return icons[functionName] || Zap
  }

  const getStatusColor = (success: boolean) => {
    return success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edge Functions Monitor</h2>
          <p className="text-muted-foreground">
            Real-time monitoring and performance tracking for your Edge Functions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(healthStatus).map(([functionName, isHealthy]) => {
          const Icon = getFunctionIcon(functionName)
          return (
            <Card key={functionName} className={isHealthy ? 'border-green-200' : 'border-red-200'}>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <Icon className="h-4 w-4" />
                  <CardTitle className="text-sm capitalize">
                    {functionName.replace('-', ' ')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {isHealthy ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <Badge variant={isHealthy ? 'default' : 'destructive'}>
                    {isHealthy ? 'Healthy' : 'Unhealthy'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceStats.totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              All time function calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceStats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Successful executions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Calls</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceStats.failedCalls}</div>
            <p className="text-xs text-muted-foreground">
              Failed executions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(performanceStats.averageDuration)}</div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>
                Latest Edge Function calls and their results
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={clearEvents}>
              Clear Events
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {monitoringEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No events recorded yet</p>
                <p className="text-sm">Events will appear here as you use Edge Functions</p>
              </div>
            ) : (
              monitoringEvents.slice(-10).reverse().map((event, index) => {
                const Icon = getFunctionIcon(event.functionName)
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">
                          {event.functionName.replace('-', ' ')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {event.action} • {formatTimestamp(event.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(event.success)}>
                        {event.success ? 'Success' : 'Failed'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(event.duration)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common operations and testing functions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => edgeFunctions.getUserProfile()}
            >
              Test Auth Manager
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => edgeFunctions.getServices()}
            >
              Test Service Manager
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => edgeFunctions.getBookings()}
            >
              Test Booking Manager
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => edgeFunctions.getDashboardAnalytics()}
            >
              Test Analytics Engine
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
