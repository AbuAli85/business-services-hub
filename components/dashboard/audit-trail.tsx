'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  User, 
  Clock, 
  Edit, 
  Plus, 
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface AuditTrailProps {
  bookingId: string
  className?: string
}

interface AuditEntry {
  id: string
  entity_type: 'milestone' | 'task' | 'booking' | 'user'
  entity_id: string
  action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'assigned' | 'commented'
  old_values: Record<string, any>
  new_values: Record<string, any>
  user_id: string
  user_name: string
  user_email: string
  ip_address?: string
  user_agent?: string
  created_at: string
  metadata?: Record<string, any>
}

interface AuditSummary {
  totalEntries: number
  entriesByType: Record<string, number>
  entriesByAction: Record<string, number>
  entriesByUser: Record<string, number>
  recentActivity: AuditEntry[]
  topUsers: Array<{ user_name: string; count: number }>
}

export function AuditTrail({ bookingId, className }: AuditTrailProps) {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [auditSummary, setAuditSummary] = useState<AuditSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [filterUser, setFilterUser] = useState<string>('all')
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null)

  useEffect(() => {
    loadAuditTrail()
  }, [bookingId, searchTerm, filterType, filterAction, filterUser])

  const loadAuditTrail = async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      // Build query
      let query = supabase
        .from('audit_logs')
        .select(`
          id,
          entity_type,
          entity_id,
          action,
          old_values,
          new_values,
          user_id,
          user_name,
          user_email,
          ip_address,
          user_agent,
          created_at,
          metadata
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filterType !== 'all') {
        query = query.eq('entity_type', filterType)
      }
      if (filterAction !== 'all') {
        query = query.eq('action', filterAction)
      }
      if (filterUser !== 'all') {
        query = query.eq('user_id', filterUser)
      }

      const { data: entries, error } = await query

      if (error) throw error

      // Apply search filter
      const filteredEntries = searchTerm
        ? entries?.filter(entry => 
            (entry.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (entry.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (entry.entity_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            JSON.stringify(entry.old_values || {}).toLowerCase().includes(searchTerm.toLowerCase()) ||
            JSON.stringify(entry.new_values || {}).toLowerCase().includes(searchTerm.toLowerCase())
          ) || []
        : entries || []

      setAuditEntries(filteredEntries)

      // Calculate summary
      const summary = calculateAuditSummary(entries || [])
      setAuditSummary(summary)
    } catch (error) {
      console.error('Error loading audit trail:', error)
      toast.error('Failed to load audit trail')
    } finally {
      setLoading(false)
    }
  }

  const calculateAuditSummary = (entries: AuditEntry[]): AuditSummary => {
    const totalEntries = entries.length
    
    const entriesByType = entries.reduce((acc, entry) => {
      acc[entry.entity_type] = (acc[entry.entity_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const entriesByAction = entries.reduce((acc, entry) => {
      acc[entry.action] = (acc[entry.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const entriesByUser = entries.reduce((acc, entry) => {
      acc[entry.user_id] = (acc[entry.user_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const recentActivity = entries.slice(0, 10)

    const topUsers = Object.entries(entriesByUser)
      .map(([userId, count]) => {
        const user = entries.find(e => e.user_id === userId)
        return {
          user_name: user?.user_name || 'Unknown User',
          count
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      totalEntries,
      entriesByType,
      entriesByAction,
      entriesByUser,
      recentActivity,
      topUsers
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Plus className="h-4 w-4 text-green-600" />
      case 'updated':
        return <Edit className="h-4 w-4 text-blue-600" />
      case 'deleted':
        return <Trash2 className="h-4 w-4 text-red-600" />
      case 'status_changed':
        return <CheckCircle className="h-4 w-4 text-orange-600" />
      case 'assigned':
        return <User className="h-4 w-4 text-purple-600" />
      case 'commented':
        return <Info className="h-4 w-4 text-gray-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-100 text-green-800'
      case 'updated':
        return 'bg-blue-100 text-blue-800'
      case 'deleted':
        return 'bg-red-100 text-red-800'
      case 'status_changed':
        return 'bg-orange-100 text-orange-800'
      case 'assigned':
        return 'bg-purple-100 text-purple-800'
      case 'commented':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return 'N/A'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  const exportAuditTrail = async () => {
    try {
      const csvData = [
        ['Timestamp', 'User', 'Entity Type', 'Action', 'Entity ID', 'Old Values', 'New Values', 'IP Address']
      ]

      auditEntries.forEach(entry => {
        csvData.push([
          new Date(entry.created_at).toLocaleString(),
          entry.user_name,
          entry.entity_type,
          entry.action,
          entry.entity_id,
          JSON.stringify(entry.old_values),
          JSON.stringify(entry.new_values),
          entry.ip_address || 'N/A'
        ])
      })

      const csvContent = csvData.map(row => row.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-trail-${bookingId}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('Audit trail exported to CSV')
    } catch (error) {
      console.error('Error exporting audit trail:', error)
      toast.error('Failed to export audit trail')
    }
  }

  const getUniqueUsers = () => {
    const users = new Set(auditEntries.map(entry => entry.user_id))
    return Array.from(users).map(userId => {
      const user = auditEntries.find(e => e.user_id === userId)
      return { id: userId, name: user?.user_name || 'Unknown User' }
    })
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading audit trail...</span>
          </div>
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
              <History className="h-6 w-6 text-blue-600" />
              <CardTitle>Audit Trail</CardTitle>
            </div>
            <Button variant="outline" onClick={exportAuditTrail}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="entries" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="entries">Audit Entries</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="details">Entry Details</TabsTrigger>
            </TabsList>

            <TabsContent value="entries" className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Input
                    placeholder="Search audit entries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Entity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="booking">Booking</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="updated">Updated</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                    <SelectItem value="status_changed">Status Changed</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="commented">Commented</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {getUniqueUsers().map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Audit Entries List */}
              <div className="space-y-2">
                {auditEntries.map((entry) => (
                  <Card key={entry.id} className="hover:bg-gray-50 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getActionIcon(entry.action)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{entry.user_name}</span>
                              <Badge className={getActionColor(entry.action)}>
                                {entry.action.replace('_', ' ')}
                              </Badge>
                              <span className="text-sm text-gray-600">
                                {entry.entity_type}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(entry.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {entry.entity_id.substring(0, 8)}...
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedEntry(entry)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {auditEntries.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No audit entries found
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-6">
              {auditSummary && (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{auditSummary.totalEntries}</div>
                        <div className="text-sm text-gray-600">Total Entries</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{Object.keys(auditSummary.entriesByType).length}</div>
                        <div className="text-sm text-gray-600">Entity Types</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{Object.keys(auditSummary.entriesByAction).length}</div>
                        <div className="text-sm text-gray-600">Action Types</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{Object.keys(auditSummary.entriesByUser).length}</div>
                        <div className="text-sm text-gray-600">Active Users</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Entries by Type</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {Object.entries(auditSummary.entriesByType).map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between">
                              <span className="text-sm capitalize">{type}</span>
                              <Badge variant="outline">{count}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Top Users</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {auditSummary.topUsers.map((user, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-sm">{user.user_name}</span>
                              <Badge variant="outline">{user.count}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              {selectedEntry ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Entry Details</CardTitle>
                      <Button variant="outline" onClick={() => setSelectedEntry(null)}>
                        Close
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Basic Information</h4>
                        <div className="space-y-2 text-sm">
                          <div><strong>ID:</strong> {selectedEntry.id}</div>
                          <div><strong>User:</strong> {selectedEntry.user_name} ({selectedEntry.user_email})</div>
                          <div><strong>Action:</strong> {selectedEntry.action}</div>
                          <div><strong>Entity Type:</strong> {selectedEntry.entity_type}</div>
                          <div><strong>Entity ID:</strong> {selectedEntry.entity_id}</div>
                          <div><strong>Timestamp:</strong> {new Date(selectedEntry.created_at).toLocaleString()}</div>
                          {selectedEntry.ip_address && (
                            <div><strong>IP Address:</strong> {selectedEntry.ip_address}</div>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Changes</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="text-sm font-medium text-gray-600 mb-1">Old Values:</h5>
                            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                              {formatValue(selectedEntry.old_values)}
                            </pre>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-gray-600 mb-1">New Values:</h5>
                            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                              {formatValue(selectedEntry.new_values)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                    {selectedEntry.metadata && (
                      <div>
                        <h4 className="font-medium mb-2">Metadata</h4>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                          {formatValue(selectedEntry.metadata)}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Select an audit entry to view details
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
