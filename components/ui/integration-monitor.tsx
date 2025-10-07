'use client'

import { useState, useEffect } from 'react'
import { useRefreshCallback } from '@/contexts/AutoRefreshContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Settings,
  Globe,
  Webhook,
  AlertCircle,
  Play,
  StopCircle,
  Eye,
  Download
} from 'lucide-react'
import { 
  edgeFunctions, 
  getPerformanceStats, 
  getMonitoringEvents,
  type MonitoringEvent 
} from '@/lib/edge-functions'

interface WebhookStats {
  webhook_name: string
  total_calls: number
  successful_calls: number
  failed_calls: number
  success_rate: number
  last_called: string
}

interface IntegrationStatus {
  edgeFunctions: { [key: string]: boolean }
  webhooks: WebhookStats[]
  overallHealth: 'healthy' | 'warning' | 'critical'
  lastSync: string
}

export function IntegrationMonitor() {
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null)
  const [webhookLogs, setWebhookLogs] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

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
      // Check Edge Functions health
      const edgeFunctionHealth = await edgeFunctions.healthCheck()
      
      // Get webhook statistics (this would come from your database)
      const webhookStats = await getWebhookStats()
      
      // Calculate overall health
      const overallHealth = calculateOverallHealth(edgeFunctionHealth, webhookStats)
      
      setIntegrationStatus({
        edgeFunctions: edgeFunctionHealth,
        webhooks: webhookStats,
        overallHealth,
        lastSync: new Date().toISOString()
      })
      
      // Get recent webhook logs
      const logs = await getWebhookLogs()
      setWebhookLogs(logs)
      
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const calculateOverallHealth = (edgeFunctions: { [key: string]: boolean }, webhooks: WebhookStats[]): 'healthy' | 'warning' | 'critical' => {
    const edgeFunctionHealth = Object.values(edgeFunctions).every(healthy => healthy)
    const webhookHealth = webhooks.every(webhook => webhook.success_rate >= 90)
    
    if (edgeFunctionHealth && webhookHealth) return 'healthy'
    if (edgeFunctionHealth || webhookHealth) return 'warning'
    return 'critical'
  }

  const getWebhookStats = async (): Promise<WebhookStats[]> => {
    // This would normally query your database
    // For now, return mock data
    return [
      {
        webhook_name: 'booking-created',
        total_calls: 45,
        successful_calls: 43,
        failed_calls: 2,
        success_rate: 95.6,
        last_called: new Date(Date.now() - 300000).toISOString()
      },
      {
        webhook_name: 'new-booking',
        total_calls: 45,
        successful_calls: 44,
        failed_calls: 1,
        success_rate: 97.8,
        last_called: new Date(Date.now() - 180000).toISOString()
      }
    ]
  }

  const getWebhookLogs = async (): Promise<any[]> => {
    // This would normally query your database
    // For now, return mock data
    return [
             {
         id: '1',
         webhook_url: 'https://hook.eu2.make.com/1unm44xv23srammipy0j1cauawrkzn32',
         event_type: 'service_created',
         status: 'sent',
         called_at: new Date(Date.now() - 300000).toISOString(),
         response_status: 200
       },
       {
         id: '2',
         webhook_url: 'https://hook.eu2.make.com/wb6i8h78k2uxwpq2qvd73lha0hs355ka',
         event_type: 'booking_created',
         status: 'sent',
         called_at: new Date(Date.now() - 180000).toISOString(),
         response_status: 200
       }
    ]
  }

  const testWebhook = async (webhookName: string) => {
    try {
      // This would call your database function to test the webhook
      console.log(`Testing webhook: ${webhookName}`)
      // await supabase.rpc('test_webhook', { webhook_name: webhookName, event_type: 'test' })
      alert(`Webhook test initiated for ${webhookName}`)
    } catch (error) {
      console.error('Error testing webhook:', error)
      alert('Failed to test webhook')
    }
  }

  const getHealthColor = (health: 'healthy' | 'warning' | 'critical') => {
    switch (health) {
      case 'healthy': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getHealthIcon = (health: 'healthy' | 'warning' | 'critical') => {
    switch (health) {
      case 'healthy': return CheckCircle
      case 'warning': return AlertTriangle
      case 'critical': return XCircle
      default: return AlertCircle
    }
  }

  if (!integrationStatus) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Integration Monitor</h2>
          <p className="text-muted-foreground">
            Monitor Edge Functions and Make.com integration health
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

      {/* Overall Health Status */}
      <Card className={`border-2 ${
        integrationStatus.overallHealth === 'healthy' ? 'border-green-200' :
        integrationStatus.overallHealth === 'warning' ? 'border-yellow-200' :
        'border-red-200'
      }`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {(() => {
                const Icon = getHealthIcon(integrationStatus.overallHealth)
                return <Icon className="h-6 w-6 text-green-600" />
              })()}
              <div>
                <CardTitle>Overall Integration Health</CardTitle>
                <CardDescription>
                  Last updated: {new Date(integrationStatus.lastSync).toLocaleString()}
                </CardDescription>
              </div>
            </div>
            <Badge className={getHealthColor(integrationStatus.overallHealth)}>
              {integrationStatus.overallHealth.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="edge-functions">Edge Functions</TabsTrigger>
          <TabsTrigger value="webhooks">Make.com Webhooks</TabsTrigger>
          <TabsTrigger value="logs">Integration Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Edge Functions Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <CardTitle>Edge Functions</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(integrationStatus.edgeFunctions).map(([func, healthy]) => (
                    <div key={func} className="flex items-center justify-between">
                      <span className="capitalize">{func.replace('-', ' ')}</span>
                      <Badge variant={healthy ? 'default' : 'destructive'}>
                        {healthy ? 'Healthy' : 'Unhealthy'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Webhooks Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Webhook className="h-5 w-5" />
                  <CardTitle>Make.com Webhooks</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {integrationStatus.webhooks.map((webhook) => (
                    <div key={webhook.webhook_name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{webhook.webhook_name}</span>
                        <Badge variant={webhook.success_rate >= 95 ? 'default' : 'secondary'}>
                          {webhook.success_rate}%
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {webhook.successful_calls}/{webhook.total_calls} successful
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Edge Functions Tab */}
        <TabsContent value="edge-functions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(integrationStatus.edgeFunctions).map(([functionName, isHealthy]) => {
              const Icon = functionName === 'auth-manager' ? User :
                          functionName === 'service-manager' ? Database :
                          functionName === 'booking-manager' ? Clock :
                          functionName === 'communication-hub' ? MessageSquare :
                          functionName === 'analytics-engine' ? BarChart3 : Zap
              
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
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-6">
          <div className="space-y-4">
            {integrationStatus.webhooks.map((webhook) => (
              <Card key={webhook.webhook_name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Webhook className="h-5 w-5" />
                      <div>
                        <CardTitle>{webhook.webhook_name}</CardTitle>
                        <CardDescription>
                          Success Rate: {webhook.success_rate}% | 
                          Last Called: {new Date(webhook.last_called).toLocaleString()}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testWebhook(webhook.webhook_name)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Test
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{webhook.total_calls}</div>
                      <div className="text-sm text-muted-foreground">Total Calls</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{webhook.successful_calls}</div>
                      <div className="text-sm text-muted-foreground">Successful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{webhook.failed_calls}</div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{webhook.success_rate}%</div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Integration Logs</CardTitle>
                  <CardDescription>
                    Latest webhook calls and integration events
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Logs
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {webhookLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No webhook logs yet</p>
                    <p className="text-sm">Logs will appear here as webhooks are called</p>
                  </div>
                ) : (
                  webhookLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center space-x-3">
                        <Webhook className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">
                            {log.event_type.replace('_', ' ')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(log.called_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                                                 <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                           {log.status}
                         </Badge>
                        <span className="text-xs text-muted-foreground">
                          {log.response_status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
