'use client'

import './kpi-cards-styles.css'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Tooltip,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { 
  Wallet, 
  Calendar, 
  CheckCircle, 
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Award,
  Zap,
  Clock,
  MessageSquare
} from 'lucide-react'
import { calculateCompletionRate } from '@/lib/metrics'

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
        {/* Enhanced Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white to-transparent rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white to-transparent rounded-full translate-y-12 -translate-x-12"></div>
          <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-gradient-to-br from-white/30 to-transparent rounded-full -translate-x-8 -translate-y-8"></div>
        </div>
        
        {/* Animated Border */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
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

interface ClientStats {
  totalBookings: number
  activeBookings: number
  completedBookings: number
  totalSpent: number
  monthlySpent: number
  averageRating: number
  totalReviews: number
  favoriteProviders: number
}

interface KPIGridProps {
  data: ClientStats
}

export function EnhancedClientKPIGrid({ data }: KPIGridProps) {
  const formatCurrency = (amount: number) => {
    return `OMR ${amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  const completionRate = calculateCompletionRate({ completed: data.completedBookings, total: data.totalBookings })

  const calculateMonthlyGrowth = () => {
    // Simple calculation - in real app, compare with previous month
    return data.monthlySpent > 0 ? 12 : 0
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Your Service Overview</h2>
          <p className="text-sm sm:text-base text-gray-600">Track your bookings at a glance</p>
        </div>
        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live data</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <EnhancedKPICard
          title="Active Bookings"
          value={data.activeBookings}
          icon={Clock}
          tooltip="Currently active bookings in progress"
          className="bg-gradient-to-br from-blue-50 to-sky-100 border-blue-200"
          gradient="from-blue-500 to-sky-600"
        />
        
        <EnhancedKPICard
          title="Project Completion Rate"
          value={`${completionRate}%`}
          icon={CheckCircle}
          tooltip="Percentage of completed bookings"
          className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200"
          gradient="from-purple-500 to-violet-600"
        />
        
        {data.totalReviews > 0 && data.averageRating > 0 ? (
          <EnhancedKPICard
            title="Average Rating"
            value={`${data.averageRating.toFixed(1)} / 5`}
            icon={Star}
            tooltip="Average rating from your reviews"
            className="bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-200"
            gradient="from-yellow-500 to-amber-600"
          />
        ) : null}
      </div>
    </div>
  )
}

export function EnhancedClientPerformanceMetrics({ data }: KPIGridProps) {
  const calculateSuccessRate = () => {
    if (data.totalBookings === 0) return 0
    return (data.completedBookings / data.totalBookings) * 100
  }

  const calculateMonthlyGrowth = () => {
    // Simple calculation - in real app, compare with previous month
    return data.monthlySpent > 0 ? 12 : 0
  }

  return (
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full -translate-y-20 translate-x-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-100 to-pink-100 rounded-full translate-y-16 -translate-x-16"></div>
      </div>
      
      <CardContent className="p-4 sm:p-6 lg:p-8 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-2 sm:gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Performance Analytics</h3>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Track your service engagement and satisfaction</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500 bg-gray-100/50 px-3 py-1 rounded-full">
            <Target className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Last 30 days</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Success Rate</span>
              </div>
              <span className="text-2xl font-bold text-green-600">
                {calculateSuccessRate().toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
              <div 
                ref={(node) => {
                  if (node) {
                    node.style.setProperty('--progress-width', `${Math.min(calculateSuccessRate(), 100)}%`)
                  }
                }}
                className="kpi-progress-bar kpi-progress-bar--green"
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Performance</span>
              <span className={`font-medium ${
                calculateSuccessRate() >= 90 ? 'text-green-600' : 
                calculateSuccessRate() >= 70 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {calculateSuccessRate() >= 90 ? 'Excellent' : 
                 calculateSuccessRate() >= 70 ? 'Good' : 'Needs Improvement'}
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Monthly Growth</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                +{calculateMonthlyGrowth()}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
              <div 
                ref={(node) => {
                  if (node) {
                    node.style.setProperty('--progress-width', `${Math.min(calculateMonthlyGrowth(), 100)}%`)
                  }
                }}
                className="kpi-progress-bar kpi-progress-bar--blue"
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Trend</span>
              <span className={`font-medium ${
                calculateMonthlyGrowth() >= 10 ? 'text-green-600' : 
                calculateMonthlyGrowth() >= 0 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {calculateMonthlyGrowth() >= 10 ? 'Excellent' : 
                 calculateMonthlyGrowth() >= 0 ? 'Good' : 'Declining'}
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Star className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Review Activity</span>
              </div>
              <span className="text-2xl font-bold text-purple-600">
                {data.totalReviews}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
              <div 
                ref={(node) => {
                  if (node) {
                    node.style.setProperty('--progress-width', `${Math.min((data.totalReviews / Math.max(data.totalBookings, 1)) * 100, 100)}%`)
                  }
                }}
                className="kpi-progress-bar kpi-progress-bar--purple"
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Engagement</span>
              <span className={`font-medium ${
                data.totalReviews >= data.totalBookings * 0.8 ? 'text-green-600' : 
                data.totalReviews >= data.totalBookings * 0.5 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {data.totalReviews >= data.totalBookings * 0.8 ? 'Excellent' : 
                 data.totalReviews >= data.totalBookings * 0.5 ? 'Good' : 'Needs Improvement'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
