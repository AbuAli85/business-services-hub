'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Package, 
  Clock, 
  User, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Eye,
  Star,
  AlertCircle,
  TrendingUp
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getSupabaseClient } from '@/lib/supabase'
import { formatDate, formatTime } from '@/lib/utils'

interface ServiceSuggestion {
  id: string
  provider_id: string
  client_id: string
  suggested_service_id: string
  original_booking_id?: string
  suggestion_reason: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'viewed' | 'accepted' | 'declined' | 'expired'
  expires_at?: string
  created_at: string
  updated_at: string
  viewed_at?: string
  responded_at?: string
  suggested_service: {
    id: string
    title: string
    description: string
    base_price: number
    currency: string
    category: string
  }
  provider: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
  original_booking?: {
    id: string
    title: string
    status: string
  }
}

export default function ServiceSuggestionsPage() {
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<ServiceSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [respondingTo, setRespondingTo] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
    loadSuggestions()
  }, [])

  async function checkAuth() {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/auth/sign-in')
        return
      }

      setUser(user)
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/auth/sign-in')
    }
  }

  async function loadSuggestions() {
    try {
      setLoading(true)
      const response = await fetch('/api/service-suggestions?type=received')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load suggestions')
      }

      setSuggestions(data.suggestions || [])
    } catch (error) {
      console.error('Error loading suggestions:', error)
      toast.error('Failed to load service suggestions')
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionResponse = async (suggestionId: string, status: 'accepted' | 'declined', notes?: string) => {
    try {
      setRespondingTo(suggestionId)
      const response = await fetch(`/api/service-suggestions?id=${suggestionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          response_notes: notes
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update suggestion')
      }

      // Update local state
      setSuggestions(prev => prev.map(suggestion => 
        suggestion.id === suggestionId 
          ? { ...suggestion, status, responded_at: new Date().toISOString() }
          : suggestion
      ))

      toast.success(`Suggestion ${status} successfully!`)
    } catch (error) {
      console.error('Error responding to suggestion:', error)
      toast.error('Failed to respond to suggestion')
    } finally {
      setRespondingTo(null)
    }
  }

  const handleMarkAsViewed = async (suggestionId: string) => {
    try {
      const response = await fetch(`/api/service-suggestions?id=${suggestionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'viewed'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark as viewed')
      }

      // Update local state
      setSuggestions(prev => prev.map(suggestion => 
        suggestion.id === suggestionId 
          ? { ...suggestion, status: 'viewed', viewed_at: new Date().toISOString() }
          : suggestion
      ))
    } catch (error) {
      console.error('Error marking as viewed:', error)
    }
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: 'Low', variant: 'secondary' as const, color: 'text-gray-600' },
      medium: { label: 'Medium', variant: 'default' as const, color: 'text-blue-600' },
      high: { label: 'High', variant: 'default' as const, color: 'text-orange-600' },
      urgent: { label: 'Urgent', variant: 'destructive' as const, color: 'text-red-600' }
    }

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
      viewed: { label: 'Viewed', variant: 'default' as const, icon: Eye },
      accepted: { label: 'Accepted', variant: 'default' as const, icon: CheckCircle },
      declined: { label: 'Declined', variant: 'destructive' as const, icon: XCircle },
      expired: { label: 'Expired', variant: 'secondary' as const, icon: AlertCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const filteredSuggestions = suggestions.filter(suggestion => {
    if (activeTab === 'all') return true
    if (activeTab === 'pending') return suggestion.status === 'pending'
    if (activeTab === 'viewed') return suggestion.status === 'viewed'
    if (activeTab === 'responded') return suggestion.status === 'accepted' || suggestion.status === 'declined'
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Service Suggestions</h1>
          <p className="text-gray-600">
            Service recommendations from your providers
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Suggestions</p>
                  <p className="text-2xl font-bold text-gray-900">{suggestions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {suggestions.filter(s => s.status === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Accepted</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {suggestions.filter(s => s.status === 'accepted').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Response Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {suggestions.length > 0 
                      ? Math.round((suggestions.filter(s => s.status === 'accepted' || s.status === 'declined').length / suggestions.length) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Suggestions</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="viewed">Viewed</TabsTrigger>
            <TabsTrigger value="responded">Responded</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            {filteredSuggestions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No suggestions found</h3>
                  <p className="text-gray-600">
                    {activeTab === 'all' 
                      ? "You haven't received any service suggestions yet."
                      : `No ${activeTab} suggestions found.`
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {filteredSuggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-3 mb-2">
                            <Package className="h-5 w-5 text-blue-600" />
                            {suggestion.suggested_service.title}
                          </CardTitle>
                          <CardDescription className="text-base">
                            {suggestion.suggested_service.description}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(suggestion.priority)}
                          {getStatusBadge(suggestion.status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Provider Info */}
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{suggestion.provider.full_name}</p>
                          <p className="text-sm text-gray-600">Provider</p>
                        </div>
                      </div>

                      {/* Suggestion Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Suggestion Reason</h4>
                          <p className="text-gray-600 text-sm">{suggestion.suggestion_reason}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Service Details</h4>
                          <div className="space-y-1 text-sm">
                            <p><span className="font-medium">Price:</span> {suggestion.suggested_service.base_price} {suggestion.suggested_service.currency}</p>
                            <p><span className="font-medium">Category:</span> {suggestion.suggested_service.category}</p>
                            <p><span className="font-medium">Suggested:</span> {formatDate(suggestion.created_at)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-gray-500">
                          {suggestion.status === 'pending' && (
                            <span>Received {formatDate(suggestion.created_at)}</span>
                          )}
                          {suggestion.status === 'viewed' && suggestion.viewed_at && (
                            <span>Viewed {formatDate(suggestion.viewed_at)}</span>
                          )}
                          {suggestion.responded_at && (
                            <span>Responded {formatDate(suggestion.responded_at)}</span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {suggestion.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAsViewed(suggestion.id)}
                                className="border-gray-300"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Mark as Viewed
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSuggestionResponse(suggestion.id, 'accepted')}
                                disabled={respondingTo === suggestion.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSuggestionResponse(suggestion.id, 'declined')}
                                disabled={respondingTo === suggestion.id}
                                className="border-red-300 text-red-700 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Decline
                              </Button>
                            </>
                          )}
                          
                          {suggestion.status === 'viewed' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleSuggestionResponse(suggestion.id, 'accepted')}
                                disabled={respondingTo === suggestion.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSuggestionResponse(suggestion.id, 'declined')}
                                disabled={respondingTo === suggestion.id}
                                className="border-red-300 text-red-700 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Decline
                              </Button>
                            </>
                          )}

                          {(suggestion.status === 'accepted' || suggestion.status === 'declined') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/services/${suggestion.suggested_service.id}`)}
                              className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              <Package className="h-4 w-4 mr-1" />
                              View Service
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
