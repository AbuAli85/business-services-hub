'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Package, 
  Calendar,
  RefreshCw,
  Download,
  Eye,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'

interface AnalyticsData {
  totalUsers: number
  totalServices: number
  totalRevenue: number
  totalBookings: number
  userGrowth: number
  revenueGrowth: number
  bookingGrowth: number
  serviceGrowth: number
  recentActivity: Array<{
    id: string
    type: 'user' | 'service' | 'booking' | 'revenue'
    message: string
    timestamp: Date
    value?: number
  }>
}

interface RealtimeAnalyticsProps {
  className?: string
}

export function RealtimeAnalytics({ className }: RealtimeAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData>({
    totalUsers: 0,
    totalServices: 0,
    totalRevenue: 0,
    totalBookings: 0,
    userGrowth: 0,
    revenueGrowth: 0,
    bookingGrowth: 0,
    serviceGrowth: 0,
    recentActivity: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Simulate real-time data updates
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Generate realistic data with some randomness
      const baseData = {
        totalUsers: 5000 + Math.floor(Math.random() * 100),
        totalServices: 800 + Math.floor(Math.random() * 50),
        totalRevenue: 150000 + Math.floor(Math.random() * 10000),
        totalBookings: 15000 + Math.floor(Math.random() * 1000),
        userGrowth: 5 + Math.random() * 10,
        revenueGrowth: 8 + Math.random() * 15,
        bookingGrowth: 12 + Math.random() * 20,
        serviceGrowth: 3 + Math.random() * 8,
        recentActivity: [
          {
            id: '1',
            type: 'user' as const,
            message: 'New user registration: Ahmed Al-Rashid',
            timestamp: new Date(Date.now() - Math.random() * 3600000),
            value: 1
          },
          {
            id: '2',
            type: 'service' as const,
            message: 'Service approved: Digital Marketing by TechStart Oman',
            timestamp: new Date(Date.now() - Math.random() * 3600000),
            value: 1
          },
          {
            id: '3',
            type: 'booking' as const,
            message: 'New booking: Legal Services consultation',
            timestamp: new Date(Date.now() - Math.random() * 3600000),
            value: 1
          },
          {
            id: '4',
            type: 'revenue' as const,
            message: 'Payment received: OMR 2,500',
            timestamp: new Date(Date.now() - Math.random() * 3600000),
            value: 2500
          }
        ]
      }
      
      setData(baseData)
      setLastUpdated(new Date())
      setIsLoading(false)
    }

    fetchData()
    
    // Update data every 30 seconds
    const interval = setInterval(fetchData, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency: 'OMR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-OM').format(num)
  }

  const getGrowthIcon = (growth: number) => {
    return growth > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    )
  }

  const getGrowthColor = (growth: number) => {
    return growth > 0 ? 'text-green-600' : 'text-red-600'
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <Users className="h-4 w-4 text-blue-500" />
      case 'service':
        return <Package className="h-4 w-4 text-purple-500" />
      case 'booking':
        return <Calendar className="h-4 w-4 text-green-500" />
      case 'revenue':
        return <DollarSign className="h-4 w-4 text-yellow-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const stats = [
    {
      title: 'Total Users',
      value: formatNumber(data.totalUsers),
      growth: data.userGrowth,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Services',
      value: formatNumber(data.totalServices),
      growth: data.serviceGrowth,
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(data.totalRevenue),
      growth: data.revenueGrowth,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Bookings',
      value: formatNumber(data.totalBookings),
      growth: data.bookingGrowth,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Real-time Analytics</h2>
          <p className="text-gray-600">Live dashboard updates every 30 seconds</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Badge>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {isLoading ? (
                      <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
              <div className="flex items-center mt-4">
                {isLoading ? (
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <>
                    {getGrowthIcon(stat.growth)}
                    <span className={`text-sm font-medium ml-2 ${getGrowthColor(stat.growth)}`}>
                      {stat.growth > 0 ? '+' : ''}{stat.growth.toFixed(1)}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last month</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))
            ) : (
              data.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">
                      {activity.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {activity.value && (
                    <Badge variant="outline" className="text-xs">
                      {activity.type === 'revenue' ? formatCurrency(activity.value) : `+${activity.value}`}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <BarChart3 className="h-8 w-8 mx-auto mb-3 text-blue-600" />
            <h3 className="font-medium text-gray-900 mb-2">Detailed Reports</h3>
            <p className="text-sm text-gray-600">View comprehensive analytics and reports</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <PieChart className="h-8 w-8 mx-auto mb-3 text-purple-600" />
            <h3 className="font-medium text-gray-900 mb-2">Category Analysis</h3>
            <p className="text-sm text-gray-600">Breakdown by service categories</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Eye className="h-8 w-8 mx-auto mb-3 text-green-600" />
            <h3 className="font-medium text-gray-900 mb-2">Live Monitoring</h3>
            <p className="text-sm text-gray-600">Real-time system monitoring</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
