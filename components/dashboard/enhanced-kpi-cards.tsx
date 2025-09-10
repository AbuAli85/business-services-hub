'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Tooltip,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { 
  Wallet, 
  Calendar, 
  Briefcase, 
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Award,
  Zap
} from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  change?: number
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon: React.ComponentType<{ className?: string }>
  tooltip?: string
  className?: string
  gradient?: string
  iconColor?: string
}

function EnhancedKPICard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon, 
  tooltip,
  className,
  gradient = "from-blue-500 to-blue-600",
  iconColor = "text-blue-600"
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
        return 'text-green-600 bg-green-50 border-green-200'
      case 'decrease':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const cardContent = (
    <Card className={`h-32 sm:h-36 hover:shadow-2xl transition-all duration-300 border-0 shadow-lg group hover:-translate-y-1 ${className}`}>
      <CardContent className="p-4 sm:p-6 h-full flex flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white to-transparent rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white to-transparent rounded-full translate-y-12 -translate-x-12"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-2 truncate">{title}</p>
              <p className="text-3xl font-bold text-gray-900 truncate">{value}</p>
            </div>
            <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center flex-shrink-0 ml-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              <Icon className={`h-7 w-7 text-white`} />
            </div>
          </div>
          
          {change !== undefined && (
            <div className="flex items-center space-x-2">
              {getChangeIcon()}
              <Badge className={`text-xs font-semibold px-3 py-1 rounded-full border ${getChangeColor()}`}>
                {change > 0 ? '+' : ''}{change}%
              </Badge>
            </div>
          )}
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

export function EnhancedKPIGrid({ data }: KPIGridProps) {
  const formatCurrency = (amount: number) => {
    return `OMR ${amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Key Performance Indicators</h2>
          <p className="text-sm sm:text-base text-gray-600">Your business metrics at a glance</p>
        </div>
        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live data</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <EnhancedKPICard
          title="Total Earnings"
          value={formatCurrency(data.total_earnings)}
          change={data.monthly_growth}
          changeType={data.monthly_growth > 0 ? 'increase' : data.monthly_growth < 0 ? 'decrease' : 'neutral'}
          icon={Wallet}
          tooltip="Total earnings from all completed bookings"
          className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200"
          gradient="from-green-500 to-emerald-600"
        />
        
        <EnhancedKPICard
          title="Active Bookings"
          value={data.active_bookings}
          icon={Calendar}
          tooltip="Currently active bookings in progress"
          className="bg-gradient-to-br from-blue-50 to-sky-100 border-blue-200"
          gradient="from-blue-500 to-sky-600"
        />
        
        <EnhancedKPICard
          title="Active Services"
          value={data.active_services}
          icon={Briefcase}
          tooltip="Number of services currently available"
          className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200"
          gradient="from-purple-500 to-violet-600"
        />
        
        <EnhancedKPICard
          title="Average Rating"
          value={data.avg_rating ? `${data.avg_rating.toFixed(1)} ★` : 'N/A'}
          icon={Star}
          tooltip="Average rating from client reviews"
          className="bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-200"
          gradient="from-yellow-500 to-amber-600"
        />
      </div>
    </div>
  )
}

export function EnhancedPerformanceMetrics({ data }: KPIGridProps) {
  return (
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-2 sm:gap-4">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Performance Analytics</h3>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Track your business performance over time</p>
          </div>
          <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
            <Target className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Last 30 days</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Response Rate</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {(data.response_rate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(data.response_rate * 100, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Performance</span>
              <span className={`font-medium ${
                data.response_rate >= 0.95 ? 'text-green-600' : 
                data.response_rate >= 0.8 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {data.response_rate >= 0.95 ? 'Excellent' : 
                 data.response_rate >= 0.8 ? 'Good' : 'Needs Improvement'}
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Award className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Completion Rate</span>
              </div>
              <span className="text-2xl font-bold text-green-600">
                {(data.completion_rate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(data.completion_rate * 100, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Performance</span>
              <span className={`font-medium ${
                data.completion_rate >= 0.9 ? 'text-green-600' : 
                data.completion_rate >= 0.7 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {data.completion_rate >= 0.9 ? 'Excellent' : 
                 data.completion_rate >= 0.7 ? 'Good' : 'Needs Improvement'}
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Zap className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Monthly Growth</span>
              </div>
              <span className={`text-2xl font-bold ${data.monthly_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.monthly_growth >= 0 ? '+' : ''}{data.monthly_growth.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-700 ease-out ${
                  data.monthly_growth >= 0 
                    ? 'bg-gradient-to-r from-green-500 to-green-600' 
                    : 'bg-gradient-to-r from-red-500 to-red-600'
                }`}
                style={{ width: `${Math.min(Math.abs(data.monthly_growth), 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Trend</span>
              <span className={`font-medium ${
                data.monthly_growth >= 10 ? 'text-green-600' : 
                data.monthly_growth >= 0 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {data.monthly_growth >= 10 ? 'Excellent' : 
                 data.monthly_growth >= 0 ? 'Good' : 'Declining'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
