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
  XCircle
} from 'lucide-react'
import { safeFormatDate } from '@/lib/date-utils'

interface RecentBooking {
  id: string
  title: string
  description: string
  status: string
  scheduled_date: string
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

interface RecentBookingsProps {
  bookings: RecentBooking[]
  className?: string
}

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  in_progress: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
  completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle },
}

export function RecentBookings({ bookings, className }: RecentBookingsProps) {
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

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Recent Bookings</CardTitle>
          <Link href="/dashboard/bookings">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
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
      
      <CardContent>
        <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No bookings found</p>
            </div>
          ) : (
            filteredBookings.map((booking) => {
              const statusConfig = getStatusConfig(booking.status)
              const progressPercentage = getProgressPercentage(booking.completed_milestones, booking.milestone_count)
              
              return (
                <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`}>
                  <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {booking.title}
                          </h4>
                          <Badge className={`${statusConfig.color} text-xs`}>
                            <statusConfig.icon className="h-3 w-3 mr-1" />
                            {booking.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-gray-600">
                          <div className="flex items-center space-x-2">
                            <User className="h-3 w-3" />
                            <span className="truncate">{booking.client_name}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-3 w-3" />
                            <span>{safeFormatDate(booking.scheduled_date, 'dd MMM yyyy')}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Wallet className="h-3 w-3" />
                            <span>{booking.total_amount} {booking.currency}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Clock className="h-3 w-3" />
                            <span>{booking.service_title}</span>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        {booking.milestone_count > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>{progressPercentage}% ({booking.completed_milestones}/{booking.milestone_count})</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4 flex-shrink-0">
                        <Button variant="ghost" size="sm">
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
