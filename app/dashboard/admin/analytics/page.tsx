'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseClient } from '@/lib/supabase'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  DollarSign, 
  Building2,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Award,
  Clock
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AnalyticsData {
  totalUsers: number
  totalServices: number
  totalBookings: number
  totalRevenue: number
  monthlyGrowth: number
  userRetention: number
  averageRating: number
  topCategories: Array<{
    name: string
    count: number
    percentage: number
  }>
  recentActivity: Array<{
    type: string
    description: string
    timestamp: string
    impact: 'positive' | 'negative' | 'neutral'
  }>
  // Digital Marketing specific analytics
  digitalMarketingMetrics: {
    totalServices: number;
    averageDeliveryTime: string;
    averageRevisions: number;
    packageDistribution: {
      basic: number;
      professional: number;
      enterprise: number;
    };
    topServices: string[];
    averagePackagePrice: number;
    completionRate: number;
  };
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30')
  const [selectedMetric, setSelectedMetric] = useState('overview')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      // Mock analytics data for now
      const mockAnalytics: AnalyticsData = {
        totalUsers: 1247,
        totalServices: 89,
        totalBookings: 342,
        totalRevenue: 45600,
        monthlyGrowth: 12.5,
        userRetention: 87.3,
        averageRating: 4.6,
        topCategories: [
          { name: 'Digital Marketing', count: 23, percentage: 25.8 },
          { name: 'Web Development', count: 18, percentage: 20.2 },
          { name: 'Legal Services', count: 15, percentage: 16.9 },
          { name: 'Accounting', count: 12, percentage: 13.5 },
          { name: 'IT Services', count: 8, percentage: 9.0 }
        ],
        // Digital Marketing specific analytics
        digitalMarketingMetrics: {
          totalServices: 23,
          averageDeliveryTime: '14.2 days',
          averageRevisions: 2.1,
          packageDistribution: {
            basic: 8,
            professional: 12,
            enterprise: 3
          },
          topServices: [
            'SEO Optimization',
            'Social Media Management',
            'Content Marketing',
            'PPC Campaigns',
            'Website Redesign'
          ],
          averagePackagePrice: 1250,
          completionRate: 94.2
        },
        recentActivity: [
          {
            type: 'user_signup',
            description: '15 new users joined this week',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            impact: 'positive'
          },
          {
            type: 'service_creation',
            description: '8 new services added',
            timestamp: new Date(Date.now() - 172800000).toISOString(),
            impact: 'positive'
          },
          {
            type: 'booking_completed',
            description: '23 bookings completed',
            timestamp: new Date(Date.now() - 259200000).toISOString(),
            impact: 'positive'
          }
        ]
      }

      setAnalytics(mockAnalytics)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setLoading(false)
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive':
        return 'text-green-600'
      case 'negative':
        return 'text-red-600'
      case 'neutral':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium mb-2">No analytics data available</p>
        <p className="text-sm">Analytics will appear here once data is collected</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Platform Analytics</h1>
            <p className="text-emerald-100 text-lg mb-4">
              Comprehensive insights into platform performance and user behavior
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span>1,247 Total Users</span>
              </div>
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>+12.5% Growth</span>
              </div>
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                <span>OMR 45,600 Revenue</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center space-x-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="secondary"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Navigation */}
      <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Button 
          variant={selectedMetric === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedMetric('overview')}
          className="rounded-md"
        >
          Overview
        </Button>
        <Button 
          variant={selectedMetric === 'users' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedMetric('users')}
          className="rounded-md"
        >
          Users
        </Button>
        <Button 
          variant={selectedMetric === 'revenue' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedMetric('revenue')}
          className="rounded-md"
        >
          Revenue
        </Button>
        <Button 
          variant={selectedMetric === 'services' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedMetric('services')}
          className="rounded-md"
        >
          Services
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers.toLocaleString()}</div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-xs text-green-600">+{analytics.monthlyGrowth}% this month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Services</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalServices}</div>
            <p className="text-xs text-muted-foreground">
              Across all categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              All time bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">OMR {analytics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total platform earnings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Retention</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.userRetention}%</div>
            <p className="text-xs text-muted-foreground">
              Monthly retention rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageRating}/5.0</div>
            <p className="text-xs text-muted-foreground">
              Platform-wide rating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.monthlyGrowth}%</div>
            <p className="text-xs text-muted-foreground">
              Monthly user growth
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Top Service Categories</CardTitle>
          <CardDescription>
            Most popular service categories by volume
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topCategories.map((category, index) => (
              <div key={category.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{category.name}</p>
                    <p className="text-sm text-gray-500">{category.count} services</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">{category.percentage}%</div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Digital Marketing Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Digital Marketing Analytics
          </CardTitle>
          <CardDescription>
            Performance metrics for digital marketing services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">{analytics.digitalMarketingMetrics.totalServices}</div>
              <div className="text-sm text-blue-700">Total Services</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-900">{analytics.digitalMarketingMetrics.averageDeliveryTime}</div>
              <div className="text-sm text-green-700">Avg. Delivery</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-900">{analytics.digitalMarketingMetrics.averageRevisions}</div>
              <div className="text-sm text-purple-700">Avg. Revisions</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-900">{analytics.digitalMarketingMetrics.completionRate}%</div>
              <div className="text-sm text-orange-700">Completion Rate</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Package Distribution */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Package Distribution</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Basic</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(analytics.digitalMarketingMetrics.packageDistribution.basic / analytics.digitalMarketingMetrics.totalServices) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{analytics.digitalMarketingMetrics.packageDistribution.basic}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Professional</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${(analytics.digitalMarketingMetrics.packageDistribution.professional / analytics.digitalMarketingMetrics.totalServices) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{analytics.digitalMarketingMetrics.packageDistribution.professional}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Enterprise</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${(analytics.digitalMarketingMetrics.packageDistribution.enterprise / analytics.digitalMarketingMetrics.totalServices) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{analytics.digitalMarketingMetrics.packageDistribution.enterprise}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Top Services */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Top Digital Marketing Services</h4>
              <div className="space-y-2">
                {analytics.digitalMarketingMetrics.topServices.map((service, index) => (
                  <div key={service} className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-xs">{index + 1}</span>
                    </div>
                    <span className="text-gray-700">{service}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Platform Activity</CardTitle>
          <CardDescription>
            Latest platform events and their impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 border rounded-lg">
                <div className={`w-2 h-2 rounded-full ${
                  activity.impact === 'positive' ? 'bg-green-500' :
                  activity.impact === 'negative' ? 'bg-red-500' : 'bg-gray-500'
                }`}></div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.description}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <Badge className={getImpactColor(activity.impact)}>
                  {activity.impact}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
