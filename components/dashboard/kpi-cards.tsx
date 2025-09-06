'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change !== undefined && (
              <div className="flex items-center space-x-1 mt-2">
                {getChangeIcon()}
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${getChangeColor()}`}>
                  {change > 0 ? '+' : ''}{change}%
                </span>
              </div>
            )}
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
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

export function KPIGrid({ data }: KPIGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <KPICard
        title="Total Earnings"
        value={`$${data.total_earnings.toLocaleString()}`}
        change={data.monthly_growth}
        changeType={data.monthly_growth > 0 ? 'increase' : data.monthly_growth < 0 ? 'decrease' : 'neutral'}
        icon={DollarSign}
        tooltip="Total earnings from all completed bookings"
      />
      
      <KPICard
        title="Active Bookings"
        value={data.active_bookings}
        icon={Calendar}
        tooltip="Currently active bookings in progress"
      />
      
      <KPICard
        title="Active Services"
        value={data.active_services}
        icon={Briefcase}
        tooltip="Number of services currently available"
      />
      
      <KPICard
        title="Average Rating"
        value={data.avg_rating ? data.avg_rating.toFixed(1) : 'N/A'}
        icon={Star}
        tooltip="Average rating from client reviews"
      />
    </div>
  )
}

export function PerformanceMetrics({ data }: KPIGridProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Response Rate</span>
              <span className="text-sm font-bold text-gray-900">
                {(data.response_rate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${data.response_rate * 100}%` }}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Completion Rate</span>
              <span className="text-sm font-bold text-gray-900">
                {(data.completion_rate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${data.completion_rate * 100}%` }}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Monthly Growth</span>
              <span className={`text-sm font-bold ${data.monthly_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.monthly_growth >= 0 ? '+' : ''}{data.monthly_growth.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  data.monthly_growth >= 0 ? 'bg-green-600' : 'bg-red-600'
                }`}
                style={{ width: `${Math.min(Math.abs(data.monthly_growth), 100)}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
