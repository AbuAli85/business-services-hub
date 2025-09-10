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
  Calendar, 
  User, 
  Wallet, 
  Clock,
  Eye,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
  Star,
  MapPin,
  Building2
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface RecentBooking {
  id: string
  service_title: string
  provider_name: string
  provider_company?: string
  status: string
  amount: number
  currency: string
  scheduled_date: string
  created_at: string
}

interface UpcomingBooking {
  id: string
  service_title: string
  provider_name: string
  scheduled_date: string
  scheduled_time: string
  location?: string
  status: string
}

interface PremiumClientBookingsProps {
  recentBookings: RecentBooking[]
  upcomingBookings: UpcomingBooking[]
  className?: string
}

const statusConfig = {
  pending: { 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    icon: Clock,
    bgColor: 'bg-gradient-to-r from-yellow-50 to-amber-50'
  },
  paid: { 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    icon: CheckCircle,
    bgColor: 'bg-gradient-to-r from-blue-50 to-sky-50'
  },
  in_progress: { 
    color: 'bg-purple-100 text-purple-800 border-purple-200', 
    icon: AlertCircle,
    bgColor: 'bg-gradient-to-r from-purple-50 to-violet-50'
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

export function PremiumClientBookings({ recentBookings, upcomingBookings, className }: PremiumClientBookingsProps) {
  const [activeTab, setActiveTab] = useState<'recent' | 'upcoming'>('recent')
  const [statusFilter, setStatusFilter] = useState('all')

  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  }

  const getPriorityColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'border-l-purple-500'
      case 'paid':
        return 'border-l-blue-500'
      case 'completed':
        return 'border-l-green-500'
      case 'cancelled':
        return 'border-l-red-500'
      default:
        return 'border-l-yellow-500'
    }
  }

  const filteredRecentBookings = recentBookings.filter(booking => 
    statusFilter === 'all' || booking.status === statusFilter
  )

  const filteredUpcomingBookings = upcomingBookings.filter(booking => 
    statusFilter === 'all' || booking.status === statusFilter
  )

  return (
    <Card className={`border-0 shadow-xl bg-white/80 backdrop-blur-sm h-full ${className}`}>
      <CardHeader className="pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">Your Bookings</CardTitle>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Track your service requests and upcoming appointments</p>
            </div>
          </div>
          <Link href="/dashboard/bookings">
            <Button variant="outline" size="sm" className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80 text-xs sm:text-sm">
              View All
            </Button>
          </Link>
        </div>
        
        {/* Tabs and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'recent' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Recent ({recentBookings.length})
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'upcoming' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Upcoming ({upcomingBookings.length})
            </button>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white/60 backdrop-blur-sm border-white/20">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {activeTab === 'recent' ? (
            filteredRecentBookings.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg font-medium">No recent bookings found</p>
                <p className="text-gray-400 text-sm">Try adjusting your filters or book a new service</p>
              </div>
            ) : (
              filteredRecentBookings.map((booking) => {
                const statusConfig = getStatusConfig(booking.status)
                
                return (
                  <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`}>
                    <div className={`group p-4 sm:p-6 border border-gray-200 rounded-xl sm:rounded-2xl hover:shadow-xl transition-all duration-300 cursor-pointer bg-white/60 backdrop-blur-sm hover:bg-white/80 border-l-4 ${getPriorityColor(booking.status)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                  {booking.service_title}
                                </h4>
                                <Badge className={`${statusConfig.color} text-xs border`}>
                                  <statusConfig.icon className="h-3 w-3 mr-1" />
                                  {booking.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 truncate">by {booking.provider_name}</p>
                            </div>
                            <div className="flex items-center space-x-1 text-yellow-500">
                              <Star className="h-4 w-4 fill-current" />
                              <span className="text-sm font-medium text-gray-900">4.8</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <Wallet className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{formatCurrency(booking.amount, booking.currency || 'OMR')}</p>
                                <p className="text-xs text-gray-500">Amount</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Calendar className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{formatDate(booking.scheduled_date)}</p>
                                <p className="text-xs text-gray-500">Date</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                <User className="h-4 w-4 text-purple-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{booking.provider_name}</p>
                                <p className="text-xs text-gray-500">Provider</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                <Building2 className="h-4 w-4 text-orange-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{booking.provider_company || 'Individual'}</p>
                                <p className="text-xs text-gray-500">Company</p>
                              </div>
                            </div>
                          </div>
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
            )
          ) : (
            filteredUpcomingBookings.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg font-medium">No upcoming bookings</p>
                <p className="text-gray-400 text-sm">Book a new service to get started</p>
              </div>
            ) : (
              filteredUpcomingBookings.map((booking) => {
                const statusConfig = getStatusConfig(booking.status)
                
                return (
                  <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`}>
                    <div className={`group p-4 sm:p-6 border border-gray-200 rounded-xl sm:rounded-2xl hover:shadow-xl transition-all duration-300 cursor-pointer bg-white/60 backdrop-blur-sm hover:bg-white/80 border-l-4 ${getPriorityColor(booking.status)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                              <Clock className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                  {booking.service_title}
                                </h4>
                                <Badge className={`${statusConfig.color} text-xs border`}>
                                  <statusConfig.icon className="h-3 w-3 mr-1" />
                                  {booking.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 truncate">with {booking.provider_name}</p>
                            </div>
                            <div className="flex items-center space-x-1 text-green-500">
                              <TrendingUp className="h-4 w-4" />
                              <span className="text-sm font-medium text-gray-900">Upcoming</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Calendar className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{formatDate(booking.scheduled_date)}</p>
                                <p className="text-xs text-gray-500">Date</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Clock className="h-4 w-4 text-purple-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{booking.scheduled_time}</p>
                                <p className="text-xs text-gray-500">Time</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <User className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{booking.provider_name}</p>
                                <p className="text-xs text-gray-500">Provider</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                <MapPin className="h-4 w-4 text-orange-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{booking.location || 'TBD'}</p>
                                <p className="text-xs text-gray-500">Location</p>
                              </div>
                            </div>
                          </div>
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
            )
          )}
        </div>
      </CardContent>
    </Card>
  )
}
