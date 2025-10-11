'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
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
  TrendingUp,
  Plus,
  Search,
  RefreshCw,
  Target,
  BarChart3,
  Users,
  DollarSign,
  Lightbulb,
  ArrowRight
} from 'lucide-react'
import { useSuggestions } from '@/hooks/useSuggestions'
import { formatCurrency } from '@/lib/dashboard-data'

export default function SuggestionsPage() {
  const { 
    suggestions, 
    serviceSuggestions, 
    userSuggestions, 
    businessSuggestions, 
    highPrioritySuggestions,
    loading, 
    error, 
    refreshSuggestions,
    getSuggestionStats 
  } = useSuggestions()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [selectedType, setSelectedType] = useState<'all' | 'service' | 'user' | 'business'>('all')

  const stats = getSuggestionStats()

  // Filter suggestions based on search and filters
  const filteredSuggestions = suggestions.filter(suggestion => {
    const matchesSearch = searchQuery === '' || 
      (suggestion.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (suggestion.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesPriority = selectedPriority === 'all' || suggestion.priority === selectedPriority
    const matchesType = selectedType === 'all' || suggestion.type === selectedType
    
    return matchesSearch && matchesPriority && matchesType
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'service': return <Package className="h-4 w-4" />
      case 'user': return <Users className="h-4 w-4" />
      case 'business': return <BarChart3 className="h-4 w-4" />
      default: return <Lightbulb className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'service': return 'text-blue-600 bg-blue-50'
      case 'user': return 'text-green-600 bg-green-50'
      case 'business': return 'text-purple-600 bg-purple-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading suggestions</p>
          <Button onClick={refreshSuggestions}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Smart Suggestions</h1>
            <p className="text-blue-100 text-lg mb-4">
              AI-powered recommendations to optimize your business performance
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Lightbulb className="h-4 w-4 mr-1" />
                <span>Total: {stats.total} suggestions</span>
              </div>
              <div className="flex items-center">
                <Target className="h-4 w-4 mr-1" />
                <span>High Priority: {stats.byPriority.high}</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span>Response Rate: {stats.responseRate}%</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={refreshSuggestions}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Service Suggestions</p>
                <p className="text-2xl font-bold">{stats.byType.service}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">User Suggestions</p>
                <p className="text-2xl font-bold">{stats.byType.user}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Business Suggestions</p>
                <p className="text-2xl font-bold">{stats.byType.business}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium">High Priority</p>
                <p className="text-2xl font-bold">{stats.byPriority.high}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suggestions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="service">Service</option>
              <option value="user">User</option>
              <option value="business">Business</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions List */}
      <div className="space-y-4">
        {filteredSuggestions.length > 0 ? (
          filteredSuggestions.map((suggestion) => (
            <Card key={suggestion.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`p-2 rounded-lg ${getTypeColor(suggestion.type)}`}>
                      {getTypeIcon(suggestion.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-lg">{suggestion.title}</h3>
                        <Badge className={getPriorityColor(suggestion.priority)}>
                          {suggestion.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.confidence}% confidence
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-3">{suggestion.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Target className="h-3 w-3 mr-1" />
                          {'category' in suggestion ? suggestion.category : 'General'}
                        </span>
                        {suggestion.metadata && Object.entries(suggestion.metadata).map(([key, value]) => (
                          <span key={key} className="flex items-center">
                            <span className="font-medium">{key}:</span> {String(value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {suggestion.actionUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(suggestion.actionUrl, '_blank')}
                      >
                        {suggestion.actionLabel || 'View Details'}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No suggestions found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || selectedPriority !== 'all' || selectedType !== 'all'
                  ? 'Try adjusting your filters to see more suggestions.'
                  : 'Suggestions will appear here as we analyze your business data.'}
              </p>
              <Button onClick={refreshSuggestions} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Suggestions
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
