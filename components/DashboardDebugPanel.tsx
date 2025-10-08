'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bug, 
  Activity, 
  Database, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react'
import { requestLogger } from '@/lib/request-logger'

interface DashboardDebugPanelProps {
  componentName: string
  renderCount: number
  isVisible?: boolean
}

export function DashboardDebugPanel({ 
  componentName, 
  renderCount, 
  isVisible = process.env.NODE_ENV === 'development' 
}: DashboardDebugPanelProps) {
  const [activeRequests, setActiveRequests] = useState<any[]>([])
  const [memoryUsage, setMemoryUsage] = useState<any>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      setActiveRequests(requestLogger.getActiveRequests())
      
      // Get memory usage if available
      if ('memory' in performance) {
        setMemoryUsage((performance as any).memory)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) return null

  const getMemoryInfo = () => {
    if (!memoryUsage) return 'Not available'
    return {
      used: `${Math.round(memoryUsage.usedJSHeapSize / 1024 / 1024)}MB`,
      total: `${Math.round(memoryUsage.totalJSHeapSize / 1024 / 1024)}MB`,
      limit: `${Math.round(memoryUsage.jsHeapSizeLimit / 1024 / 1024)}MB`
    }
  }

  const memory = getMemoryInfo()

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 shadow-lg border-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Debug Panel
            </CardTitle>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => requestLogger.clear()}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <span>Renders:</span>
              <Badge variant={renderCount > 10 ? "destructive" : "secondary"}>
                {renderCount}
              </Badge>
            </div>
            
            <div className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              <span>Requests:</span>
              <Badge variant={activeRequests.length > 5 ? "destructive" : "secondary"}>
                {activeRequests.length}
              </Badge>
            </div>
          </div>

          {renderCount > 10 && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              High render count detected!
            </div>
          )}

          {isExpanded && (
            <Tabs defaultValue="performance" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="performance">Perf</TabsTrigger>
                <TabsTrigger value="requests">Requests</TabsTrigger>
                <TabsTrigger value="memory">Memory</TabsTrigger>
              </TabsList>
              
              <TabsContent value="performance" className="space-y-2 text-xs">
                <div>
                  <strong>Component:</strong> {componentName}
                </div>
                <div>
                  <strong>Render Count:</strong> {renderCount}
                </div>
                <div>
                  <strong>Status:</strong> {renderCount > 10 ? '⚠️ Unstable' : '✅ Stable'}
                </div>
              </TabsContent>
              
              <TabsContent value="requests" className="space-y-2">
                <div className="text-xs">
                  <strong>Active Requests:</strong> {activeRequests.length}
                </div>
                {activeRequests.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {activeRequests.map((req, index) => (
                      <div key={index} className="text-xs bg-gray-50 p-1 rounded">
                        <div className="font-mono">{req.method} {req.url}</div>
                        <div className="text-gray-500">
                          {Math.round(performance.now() - req.startTime)}ms
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="memory" className="space-y-2 text-xs">
                {typeof memory === 'object' ? (
                  <>
                    <div><strong>Used:</strong> {memory.used}</div>
                    <div><strong>Total:</strong> {memory.total}</div>
                    <div><strong>Limit:</strong> {memory.limit}</div>
                  </>
                ) : (
                  <div>{memory}</div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
