import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  DollarSign,
  Calendar,
  Users
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface BookingSummaryStatsProps {
  stats: {
    total: number
    completed: number
    inProgress: number
    pending: number
    approved: number
    totalRevenue: number
    projectedBillings: number
    avgCompletionTime: number
    pendingApproval: number
    readyToLaunch: number
  }
  currency?: string
  className?: string
}

export function BookingSummaryStats({ 
  stats, 
  currency = 'OMR',
  className = ''
}: BookingSummaryStatsProps) {
  const formatAmount = (amount: number) => formatCurrency(amount, currency)
  
  return (
    <Card className={`mb-6 ${className}`}>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Total Bookings */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Bookings</div>
          </div>

          {/* Approved */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>

          {/* In Progress */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>

          {/* Pending */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>

          {/* Total Revenue */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {formatAmount(stats.totalRevenue)}
            </div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </div>

          {/* Completion Rate */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-600">Completion Rate</div>
          </div>
        </div>

        {/* Additional Metrics Row */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {formatAmount(stats.projectedBillings)}
              </div>
              <div className="text-sm text-gray-600">Projected Billings</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {stats.avgCompletionTime} days
              </div>
              <div className="text-sm text-gray-600">Avg. Completion Time</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {stats.pendingApproval}
              </div>
              <div className="text-sm text-gray-600">Pending Approval</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
