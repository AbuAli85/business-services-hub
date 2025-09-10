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
  Building2, 
  Star, 
  TrendingUp, 
  Eye, 
  Calendar,
  DollarSign,
  Award,
  Target,
  Zap,
  MoreHorizontal
} from 'lucide-react'

interface TopService {
  id: string
  title: string
  description: string
  category: string
  status: string
  base_price: number
  currency: string
  cover_image_url?: string
  created_at: string
  updated_at?: string
  provider_id: string
  views_count?: number
  total_bookings?: number
  total_earnings?: number
  rating?: number
  tags?: string[]
  duration?: string
  deliverables?: string[]
}

interface EliteTopServicesProps {
  services: TopService[]
  className?: string
}

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  draft: 'bg-blue-100 text-blue-800 border-blue-200',
}

export function EliteTopServices({ services, className }: EliteTopServicesProps) {
  const [sortBy, setSortBy] = useState<'earnings' | 'bookings' | 'rating' | 'views'>('earnings')

  const sortedServices = [...services].sort((a, b) => {
    switch (sortBy) {
      case 'earnings':
        return (b.total_earnings || 0) - (a.total_earnings || 0)
      case 'bookings':
        return (b.total_bookings || 0) - (a.total_bookings || 0)
      case 'rating':
        return (b.rating || 0) - (a.rating || 0)
      case 'views':
        return (b.views_count || 0) - (a.views_count || 0)
      default:
        return 0
    }
  })

  const getStatusColor = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || statusColors.inactive
  }

  const formatCurrency = (amount: number, currency: string = 'OMR') => {
    return `${amount.toLocaleString()} ${currency}`
  }

  return (
    <Card className={`border-0 shadow-xl bg-white/80 backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">Top Performing Services</CardTitle>
            <p className="text-gray-600 mt-1">Your most successful service offerings</p>
          </div>
          <Link href="/dashboard/services">
            <Button variant="outline" size="sm" className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80">
              Manage All
            </Button>
          </Link>
        </div>
        
        {/* Sort Options */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40 bg-white/60 backdrop-blur-sm border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="earnings">Total Earnings</SelectItem>
                <SelectItem value="bookings">Bookings Count</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="views">Views</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-gray-500">
            {sortedServices.length} services
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {sortedServices.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg font-medium">No services found</p>
              <p className="text-gray-400 text-sm">Create your first service to get started</p>
            </div>
          ) : (
            sortedServices.map((service, index) => (
              <Link key={service.id} href={`/dashboard/services/${service.id}`}>
                <div className="group p-6 border border-gray-200 rounded-2xl hover:shadow-xl transition-all duration-300 cursor-pointer bg-white/60 backdrop-blur-sm hover:bg-white/80">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          {service.cover_image_url ? (
                            <img src={service.cover_image_url} alt={service.title} className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="h-6 w-6 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                              {service.title}
                            </h4>
                            <Badge className={`${getStatusColor(service.status)} text-xs border`}>
                              {service.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{service.description}</p>
                        </div>
                        <div className="flex items-center space-x-1 text-yellow-500">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="text-sm font-medium text-gray-900">
                            {service.rating ? service.rating.toFixed(1) : 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(service.total_earnings || 0, service.currency)}
                            </p>
                            <p className="text-xs text-gray-500">Earnings</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{service.total_bookings || 0}</p>
                            <p className="text-xs text-gray-500">Bookings</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Eye className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{service.views_count || 0}</p>
                            <p className="text-xs text-gray-500">Views</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Target className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{service.category}</p>
                            <p className="text-xs text-gray-500">Category</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Performance Indicators */}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span>Rank #{index + 1}</span>
                          </div>
                          {service.tags && service.tags.length > 0 && (
                            <div className="flex items-center space-x-1">
                              {service.tags.slice(0, 2).map((tag, tagIndex) => (
                                <Badge key={tagIndex} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {service.tags.length > 2 && (
                                <span className="text-xs text-gray-500">+{service.tags.length - 2} more</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Base Price</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(service.base_price, service.currency)}
                            </p>
                          </div>
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
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
