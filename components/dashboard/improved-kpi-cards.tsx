'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Tooltip,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { 
  DollarSign, 
  Calendar, 
  Briefcase, 
  Star,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  change?: number
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon: React.ComponentType<{ className?: string }>
  tooltip?: string
  className?: string
}

function KPICard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon, 
  tooltip,
  className 
}: KPICardProps) {
  const getChangeIcon = () => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="h-3 w-3 text-green-500" />
      case 'decrease':
        return <TrendingDown className="h-3 w-3 text-red-500" />
      default:
        return <Minus className="h-3 w-3 text-gray-400" />
    }
  }

  const getChangeColor = () => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600 bg-green-50'
      case 'decrease':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const cardContent = (
    <Card className={`h-32 hover:shadow-lg transition-all duration-200 border-0 shadow-sm ${className}`}>
      <CardContent className="p-6 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-600 mb-2 truncate">{title}</p>
            <p className="text-3xl font-bold text-gray-900 truncate">{value}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 ml-4">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        
        {change !== undefined && (
          <div className="flex items-center space-x-2 mt-3">
            {getChangeIcon()}
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getChangeColor()}`}>
              {change > 0 ? '+' : ''}{change}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip content={tooltip}>
          {cardContent}
        </Tooltip>
      </TooltipProvider>
    )
  }

  return cardContent
}

interface KPIGridProps {
  data: {
    total_earnings: number
    monthly_earnings: number
    active_bookings: number
    active_services: number
    avg_rating: number
    response_rate: number
    completion_rate: number
    monthly_growth: number
  }
}

export function ImprovedKPIGrid({ data }: KPIGridProps) {
  const formatCurrency = (amount: number) => {
    return `OMR ${amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <KPICard
        title="Total Earnings"
        value={formatCurrency(data.total_earnings)}
        change={data.monthly_growth}
        changeType={data.monthly_growth > 0 ? 'increase' : data.monthly_growth < 0 ? 'decrease' : 'neutral'}
        icon={DollarSign}
        tooltip="Total earnings from all completed bookings"
        className="bg-gradient-to-br from-green-50 to-green-100 border-green-200"
      />
      
      <KPICard
        title="Active Bookings"
        value={data.active_bookings}
        icon={Calendar}
        tooltip="Currently active bookings in progress"
        className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
      />
      
      <KPICard
        title="Active Services"
        value={data.active_services}
        icon={Briefcase}
        tooltip="Number of services currently available"
        className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
      />
      
      <KPICard
        title="Average Rating"
        value={data.avg_rating ? `${data.avg_rating.toFixed(1)} ★` : 'N/A'}
        icon={Star}
        tooltip="Average rating from client reviews"
        className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200"
      />
    </div>
  )
}

export function ImprovedPerformanceMetrics({ data }: KPIGridProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-gray-900">Performance Metrics</h3>
          <div className="text-sm text-gray-500">Last 30 days</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Response Rate</span>
              <span className="text-lg font-bold text-blue-600">
                {(data.response_rate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(data.response_rate * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500">
              {data.response_rate >= 0.95 ? 'Excellent' : data.response_rate >= 0.8 ? 'Good' : 'Needs Improvement'}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Completion Rate</span>
              <span className="text-lg font-bold text-green-600">
                {(data.completion_rate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(data.completion_rate * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500">
              {data.completion_rate >= 0.9 ? 'Excellent' : data.completion_rate >= 0.7 ? 'Good' : 'Needs Improvement'}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Monthly Growth</span>
              <span className={`text-lg font-bold ${data.monthly_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.monthly_growth >= 0 ? '+' : ''}{data.monthly_growth.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  data.monthly_growth >= 0 
                    ? 'bg-gradient-to-r from-green-500 to-green-600' 
                    : 'bg-gradient-to-r from-red-500 to-red-600'
                }`}
                style={{ width: `${Math.min(Math.abs(data.monthly_growth), 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500">
              {data.monthly_growth >= 10 ? 'Excellent' : data.monthly_growth >= 0 ? 'Good' : 'Declining'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
