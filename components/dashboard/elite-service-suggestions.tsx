'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Target, 
  User, 
  Wallet, 
  Clock,
  Eye,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
  Star,
  Zap,
  MoreHorizontal,
  MessageSquare,
  Calendar
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ServiceSuggestion {
  id: string
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
  suggestion_reason: string
  priority: string
  status: string
  created_at: string
}

interface EliteServiceSuggestionsProps {
  suggestions: ServiceSuggestion[]
  className?: string
}

const priorityConfig = {
  low: { 
    color: 'bg-gray-100 text-gray-800 border-gray-200', 
    icon: Clock,
    bgColor: 'bg-gradient-to-r from-gray-50 to-slate-50'
  },
  medium: { 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    icon: AlertCircle,
    bgColor: 'bg-gradient-to-r from-blue-50 to-sky-50'
  },
  high: { 
    color: 'bg-orange-100 text-orange-800 border-orange-200', 
    icon: TrendingUp,
    bgColor: 'bg-gradient-to-r from-orange-50 to-amber-50'
  },
  urgent: { 
    color: 'bg-red-100 text-red-800 border-red-200', 
    icon: Zap,
    bgColor: 'bg-gradient-to-r from-red-50 to-rose-50'
  },
}

const statusConfig = {
  pending: { 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    icon: Clock
  },
  accepted: { 
    color: 'bg-green-100 text-green-800 border-green-200', 
    icon: CheckCircle
  },
  declined: { 
    color: 'bg-red-100 text-red-800 border-red-200', 
    icon: XCircle
  },
}

export function EliteServiceSuggestions({ suggestions, className }: EliteServiceSuggestionsProps) {
  const [sortBy, setSortBy] = useState<'priority' | 'price' | 'date' | 'provider'>('priority')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const getPriorityConfig = (priority: string) => {
    return priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium
  }

  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500'
      case 'high':
        return 'border-l-orange-500'
      case 'medium':
        return 'border-l-blue-500'
      default:
        return 'border-l-gray-500'
    }
  }

  const sortedSuggestions = [...suggestions].sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
    
    switch (sortBy) {
      case 'priority':
        return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
      case 'price':
        return b.suggested_service.base_price - a.suggested_service.base_price
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'provider':
        return a.provider.full_name.localeCompare(b.provider.full_name)
      default:
        return 0
    }
  })

  const filteredSuggestions = sortedSuggestions.filter(suggestion => 
    priorityFilter === 'all' || suggestion.priority === priorityFilter
  )

  return (
    <Card className={`border-0 shadow-xl bg-white/80 backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">Service Suggestions</CardTitle>
            <p className="text-gray-600 mt-1">Personalized recommendations from providers</p>
          </div>
          <Link href="/services">
            <Button variant="outline" size="sm" className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80">
              Browse All
            </Button>
          </Link>
        </div>
        
        {/* Sort and Filter Options */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40 bg-white/60 backdrop-blur-sm border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="provider">Provider</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-40 bg-white/60 backdrop-blur-sm border-white/20">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="text-sm text-gray-500">
            {filteredSuggestions.length} suggestions
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {filteredSuggestions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg font-medium">No service suggestions found</p>
              <p className="text-gray-400 text-sm">Try adjusting your filters or browse services directly</p>
            </div>
          ) : (
            filteredSuggestions.map((suggestion) => {
              const priorityConfig = getPriorityConfig(suggestion.priority)
              const statusConfig = getStatusConfig(suggestion.status)
              
              return (
                <Link key={suggestion.id} href={`/services/${suggestion.suggested_service.id}`}>
                  <div className={`group p-6 border border-gray-200 rounded-2xl hover:shadow-xl transition-all duration-300 cursor-pointer bg-white/60 backdrop-blur-sm hover:bg-white/80 border-l-4 ${getPriorityColor(suggestion.priority)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                            <Target className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                {suggestion.suggested_service.title}
                              </h4>
                              <Badge className={`${priorityConfig.color} text-xs border`}>
                                <priorityConfig.icon className="h-3 w-3 mr-1" />
                                {suggestion.priority}
                              </Badge>
                              <Badge className={`${statusConfig.color} text-xs border`}>
                                <statusConfig.icon className="h-3 w-3 mr-1" />
                                {suggestion.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 truncate">by {suggestion.provider.full_name}</p>
                          </div>
                          <div className="flex items-center space-x-1 text-yellow-500">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="text-sm font-medium text-gray-900">4.9</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <Wallet className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{formatCurrency(suggestion.suggested_service.base_price, suggestion.suggested_service.currency || 'OMR')}</p>
                              <p className="text-xs text-gray-500">Price</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{suggestion.provider.full_name}</p>
                              <p className="text-xs text-gray-500">Provider</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Calendar className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{new Date(suggestion.created_at).toLocaleDateString()}</p>
                              <p className="text-xs text-gray-500">Suggested</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Target className="h-4 w-4 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{suggestion.suggested_service.category}</p>
                              <p className="text-xs text-gray-500">Category</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Suggestion Reason */}
                        <div className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center space-x-2 mb-2">
                            <MessageSquare className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">Why this service?</span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{suggestion.suggestion_reason}</p>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center space-x-2">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={(e) => {
                                e.preventDefault()
                                // Handle accept suggestion
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.preventDefault()
                                // Handle decline suggestion
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>Priority: {suggestion.priority}</span>
                            <span>•</span>
                            <span>Status: {suggestion.status}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex-shrink-0">
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
