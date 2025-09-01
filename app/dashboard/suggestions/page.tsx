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
  const [showMockData, setShowMockData] = useState(false)

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
        console.error('API Error Response:', data)
        const errorMessage = data.details || data.error || 'Failed to load suggestions'
        throw new Error(errorMessage)
      }

      console.log('API Success Response:', data)
      setSuggestions(data.suggestions || [])
    } catch (error) {
      console.error('Error loading suggestions:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load service suggestions'
      
      // In development, don't show error toast if it's just an empty result
      if (!errorMessage.includes('fetch') && !errorMessage.includes('500')) {
        console.log('API request succeeded but returned empty suggestions')
      } else {
        toast.error(`Failed to load suggestions: ${errorMessage}`)
      }
    } finally {
      setLoading(false)
    }
  }
  
  // Mock data for demonstration
  const getMockSuggestions = (): ServiceSuggestion[] => [
    {
      id: 'mock-1',
      provider_id: 'provider-1',
      client_id: 'client-1',
      suggested_service_id: 'service-1',
      suggestion_reason: 'Based on your recent website development project, I believe SEO optimization would significantly boost your online visibility and drive more traffic to your site.',
      priority: 'high',
      status: 'pending',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      suggested_service: {
        id: 'service-1',
        title: 'SEO Optimization & Analytics',
        description: 'Comprehensive SEO audit and optimization with monthly reporting and analytics setup.',
        base_price: 150,
        currency: 'OMR',
        category: 'Digital Marketing'
      },
      provider: {
        id: 'provider-1',
        full_name: 'Sarah Digital Marketing',
        email: 'sarah@digitalexperts.om',
        avatar_url: '/avatars/sarah.jpg'
      }
    },
    {
      id: 'mock-2',
      provider_id: 'provider-2',
      client_id: 'client-1',
      suggested_service_id: 'service-2',
      suggestion_reason: 'Your business would benefit greatly from professional branding. A cohesive brand identity will help you stand out in the competitive market.',
      priority: 'medium',
      status: 'viewed',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      viewed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      suggested_service: {
        id: 'service-2',
        title: 'Complete Branding Package',
        description: 'Logo design, brand guidelines, business cards, and social media templates.',
        base_price: 300,
        currency: 'OMR',
        category: 'Design & Branding'
      },
      provider: {
        id: 'provider-2',
        full_name: 'Ahmed Creative Studio',
        email: 'ahmed@creativestudio.om',
        avatar_url: '/avatars/ahmed.jpg'
      }
    },
    {
      id: 'mock-3',
      provider_id: 'provider-3',
      client_id: 'client-1',
      suggested_service_id: 'service-3',
      suggestion_reason: 'Given your expanding business operations, implementing a comprehensive social media strategy will help you engage with customers and build brand loyalty.',
      priority: 'medium',
      status: 'accepted',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      responded_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      suggested_service: {
        id: 'service-3',
        title: 'Social Media Management',
        description: 'Monthly social media content creation, posting schedule, and community management.',
        base_price: 120,
        currency: 'OMR',
        category: 'Digital Marketing'
      },
      provider: {
        id: 'provider-3',
        full_name: 'Noor Social Media',
        email: 'noor@socialmedia.om',
        avatar_url: '/avatars/noor.jpg'
      }
    }
  ]

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

  const displaySuggestions = showMockData && suggestions.length === 0 ? getMockSuggestions() : suggestions
  
  const filteredSuggestions = displaySuggestions.filter(suggestion => {
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
            {/* Header skeleton */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
              <div>
                <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-80"></div>
              </div>
            </div>
            
            {/* Stats cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-12 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Tabs skeleton */}
            <div className="mb-6">
              <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
            </div>
            
            {/* Content skeleton */}
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                  <div className="h-32 bg-gray-200 rounded mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="flex gap-2">
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                </div>
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
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                  <Package className="h-8 w-8 text-white" />
                </div>
                Service Suggestions
              </h1>
              <p className="text-gray-600 text-lg">
                Personalized service recommendations from trusted providers
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4 lg:mt-0">
              <Button 
                variant="outline"
                onClick={() => setShowMockData(!showMockData)}
                className="border-green-200 text-green-700 hover:bg-green-50"
              >
                <Eye className="h-4 w-4 mr-2" />
                {showMockData ? 'Hide Demo' : 'View Demo'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push('/dashboard/services')}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Package className="h-4 w-4 mr-2" />
                Browse All Services
              </Button>
              <Button 
                onClick={() => router.push('/dashboard/messages')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Providers
              </Button>
            </div>
          </div>
          
          {/* Debug info - temporary */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-3 bg-gray-100 border border-gray-300 rounded-lg text-xs">
              <strong>Debug Info:</strong> Real suggestions: {suggestions.length}, 
              Showing mock: {showMockData && suggestions.length === 0 ? 'Yes' : 'No'}, 
              Display suggestions: {displaySuggestions.length}
            </div>
          )}
          
          {/* Info banner */}
          {showMockData && suggestions.length === 0 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Eye className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-green-900 mb-1">Demo Mode Active</h3>
                  <p className="text-sm text-green-700">
                    You're viewing sample service suggestions to demonstrate how the interface works. 
                    Real suggestions will appear here when providers send them to you.
                  </p>
                </div>
              </div>
            </div>
          )}
          {!showMockData && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">How to get suggestions</h3>
                  <p className="text-sm text-blue-700">
                    Service providers will send you personalized recommendations based on your inquiries, bookings, and expressed needs. 
                    You can also request specific suggestions by contacting providers directly.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Suggestions</p>
                  <p className="text-3xl font-bold text-blue-900">{displaySuggestions.length}</p>
                  <p className="text-xs text-blue-600 mt-1">All time received</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-xl">
                  <Package className="h-8 w-8 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">Pending</p>
                  <p className="text-3xl font-bold text-orange-900">
                    {displaySuggestions.filter(s => s.status === 'pending').length}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">Awaiting response</p>
                </div>
                <div className="p-3 bg-orange-200 rounded-xl">
                  <Clock className="h-8 w-8 text-orange-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Accepted</p>
                  <p className="text-3xl font-bold text-green-900">
                    {displaySuggestions.filter(s => s.status === 'accepted').length}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Successfully converted</p>
                </div>
                <div className="p-3 bg-green-200 rounded-xl">
                  <CheckCircle className="h-8 w-8 text-green-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Response Rate</p>
                  <p className="text-3xl font-bold text-purple-900">
                    {displaySuggestions.length > 0 
                      ? Math.round((displaySuggestions.filter(s => s.status === 'accepted' || s.status === 'declined').length / displaySuggestions.length) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-purple-600 mt-1">Overall engagement</p>
                </div>
                <div className="p-3 bg-purple-200 rounded-xl">
                  <TrendingUp className="h-8 w-8 text-purple-700" />
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
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-12 text-center">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">No suggestions found</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      {activeTab === 'all' 
                        ? "Service providers haven't suggested any services for you yet. Service suggestions help you discover relevant services based on your needs."
                        : `No ${activeTab} suggestions found. Try checking other tabs or contact providers directly.`
                      }
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button 
                        onClick={() => router.push('/dashboard/services')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Browse Services
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => router.push('/dashboard/messages')}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Contact Providers
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* How it works section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      How Service Suggestions Work
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <User className="h-6 w-6 text-blue-600" />
                        </div>
                        <h4 className="font-medium text-gray-900 mb-2">Provider Reviews Your Needs</h4>
                        <p className="text-sm text-gray-600">Service providers analyze your requirements from previous bookings or inquiries</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Package className="h-6 w-6 text-green-600" />
                        </div>
                        <h4 className="font-medium text-gray-900 mb-2">Personalized Recommendations</h4>
                        <p className="text-sm text-gray-600">You receive tailored service suggestions that match your specific needs and budget</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <CheckCircle className="h-6 w-6 text-purple-600" />
                        </div>
                        <h4 className="font-medium text-gray-900 mb-2">Accept or Decline</h4>
                        <p className="text-sm text-gray-600">Review suggestions and accept the ones that interest you to start the booking process</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Popular Services as alternatives */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Popular Services You Might Like
                    </CardTitle>
                    <CardDescription>
                      While you wait for personalized suggestions, check out these popular services
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { title: "SEO Optimization", category: "Digital Marketing", price: "OMR 150", rating: 4.8 },
                        { title: "Logo Design", category: "Design & Branding", price: "OMR 75", rating: 4.9 },
                        { title: "Website Development", category: "Web Development", price: "OMR 300", rating: 4.7 },
                        { title: "Content Writing", category: "Content Creation", price: "OMR 50", rating: 4.6 },
                        { title: "Social Media Management", category: "Digital Marketing", price: "OMR 120", rating: 4.8 },
                        { title: "Business Consulting", category: "Consulting", price: "OMR 200", rating: 4.9 }
                      ].map((service, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer">
                          <h5 className="font-medium text-gray-900 mb-1">{service.title}</h5>
                          <p className="text-xs text-gray-500 mb-2">{service.category}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-green-600">{service.price}</span>
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-600 ml-1">{service.rating}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-center">
                      <Button 
                        variant="outline"
                        onClick={() => router.push('/dashboard/services')}
                      >
                        View All Services
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
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
