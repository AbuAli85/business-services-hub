'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Calendar, 
  User, 
  Wallet, 
  Clock,
  Filter,
  Search,
  Eye,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
  Star,
  MoreHorizontal
} from 'lucide-react'
import { safeFormatDate } from '@/lib/date-utils'

interface RecentBooking {
  id: string
  title: string
  description: string
  status: string
  start_date: string
  end_date: string
  total_amount: number
  currency: string
  created_at: string
  client_name: string
  client_email: string
  service_title: string
  milestone_count: number
  completed_milestones: number
}

interface PremiumRecentBookingsProps {
  bookings: RecentBooking[]
  className?: string
}

const statusConfig = {
  pending: { 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    icon: Clock,
    bgColor: 'bg-gradient-to-r from-yellow-50 to-amber-50'
  },
  in_progress: { 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    icon: AlertCircle,
    bgColor: 'bg-gradient-to-r from-blue-50 to-sky-50'
  },
  completed: { 
    color: 'bg-green-100 text-green-800 border-green-200', 
    icon: CheckCircle,
    bgColor: 'bg-gradient-to-r from-green-50 to-emerald-50'
  },
  cancelled: { 
    color: 'bg-red-100 text-red-800 border-red-200', 
    icon: XCircle,
    bgColor: 'bg-gradient-to-r from-red-50 to-rose-50'
  },
}

export function PremiumRecentBookings({ bookings, className }: PremiumRecentBookingsProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.service_title.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  }

  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0
    return Math.round((completed / total) * 100)
  }

  const getPriorityColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'border-l-blue-500'
      case 'pending':
        return 'border-l-yellow-500'
      case 'completed':
        return 'border-l-green-500'
      case 'cancelled':
        return 'border-l-red-500'
      default:
        return 'border-l-gray-500'
    }
  }

  return (
    <Card className={`border-0 shadow-xl bg-white/80 backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">Recent Bookings</CardTitle>
            <p className="text-gray-600 mt-1">Track your latest projects and client engagements</p>
          </div>
          <Link href="/dashboard/bookings">
            <Button variant="outline" size="sm" className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80">
              View All
            </Button>
          </Link>
        </div>
        
        {/* Enhanced Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search bookings, clients, or services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/60 backdrop-blur-sm border-white/20 focus:bg-white/80"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white/60 backdrop-blur-sm border-white/20">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg font-medium">No bookings found</p>
              <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredBookings.map((booking) => {
              const statusConfig = getStatusConfig(booking.status)
              const progressPercentage = getProgressPercentage(booking.completed_milestones, booking.milestone_count)
              
              return (
                <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`}>
                  <div className={`group p-6 border border-gray-200 rounded-2xl hover:shadow-xl transition-all duration-300 cursor-pointer bg-white/60 backdrop-blur-sm hover:bg-white/80 border-l-4 ${getPriorityColor(booking.status)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-3">
                          <h4 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {booking.title}
                          </h4>
                          <Badge className={`${statusConfig.color} text-xs border`}>
                            <statusConfig.icon className="h-3 w-3 mr-1" />
                            {booking.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{booking.client_name}</p>
                              <p className="text-xs text-gray-500">Client</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <Calendar className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{safeFormatDate(booking.start_date, 'dd MMM yyyy')}</p>
                              <p className="text-xs text-gray-500">Start Date</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Wallet className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{booking.total_amount} {booking.currency || 'OMR'}</p>
                              <p className="text-xs text-gray-500">Amount</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                              <Clock className="h-4 w-4 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{booking.service_title}</p>
                              <p className="text-xs text-gray-500">Service</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Enhanced Progress Bar */}
                        {booking.milestone_count > 0 && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                              <div className="flex items-center space-x-2">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">Project Progress</span>
                              </div>
                              <span className="font-semibold text-gray-900">{progressPercentage}% ({booking.completed_milestones}/{booking.milestone_count})</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                              <span>Milestones completed</span>
                              <span className="flex items-center space-x-1">
                                <Star className="h-3 w-3 text-yellow-500" />
                                <span>{progressPercentage >= 100 ? 'Project Complete!' : 'In Progress'}</span>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4 flex-shrink-0">
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="h-4 w-4" />
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
