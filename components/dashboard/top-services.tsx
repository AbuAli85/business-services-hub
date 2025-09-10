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
  Briefcase, 
  Star, 
  Banknote, 
  Calendar,
  TrendingUp,
  Eye,
  ArrowUpDown
} from 'lucide-react'

interface TopService {
  id: string
  title: string
  description: string
  price: number
  currency: string
  status: string
  booking_count: number
  total_earnings: number
  avg_rating: number
  completion_rate: number
}

interface TopServicesProps {
  services: TopService[]
  className?: string
}

type SortOption = 'bookings' | 'earnings' | 'rating' | 'completion'

export function TopServices({ services, className }: TopServicesProps) {
  const [sortBy, setSortBy] = useState<SortOption>('bookings')

  const sortedServices = [...services].sort((a, b) => {
    switch (sortBy) {
      case 'bookings':
        return b.booking_count - a.booking_count
      case 'earnings':
        return b.total_earnings - a.total_earnings
      case 'rating':
        return b.avg_rating - a.avg_rating
      case 'completion':
        return b.completion_rate - a.completion_rate
      default:
        return 0
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSortLabel = (option: SortOption) => {
    switch (option) {
      case 'bookings':
        return 'Most Bookings'
      case 'earnings':
        return 'Highest Earnings'
      case 'rating':
        return 'Best Rated'
      case 'completion':
        return 'Best Completion'
      default:
        return 'Most Bookings'
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Top Performing Services</CardTitle>
          <Link href="/dashboard/services">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>
        
        {/* Sort Options */}
        <div className="mt-4">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bookings">Most Bookings</SelectItem>
              <SelectItem value="earnings">Highest Earnings</SelectItem>
              <SelectItem value="rating">Best Rated</SelectItem>
              <SelectItem value="completion">Best Completion</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {sortedServices.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No services found</p>
            </div>
          ) : (
            sortedServices.map((service, index) => (
              <Link key={service.id} href={`/dashboard/services/${service.id}`}>
                <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {service.title}
                          </h4>
                        </div>
                        <Badge className={`${getStatusColor(service.status)} text-xs`}>
                          {service.status}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                        {service.description}
                      </p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{service.booking_count}</p>
                            <p className="text-gray-500">Bookings</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Banknote className="h-3 w-3 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">
                              ${service.total_earnings.toLocaleString()}
                            </p>
                            <p className="text-gray-500">Earnings</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Star className="h-3 w-3 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {service.avg_rating ? service.avg_rating.toFixed(1) : 'N/A'}
                            </p>
                            <p className="text-gray-500">Rating</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-3 w-3 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {(service.completion_rate * 100).toFixed(0)}%
                            </p>
                            <p className="text-gray-500">Completion</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4 flex-shrink-0">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
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
