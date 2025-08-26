'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Target, TrendingUp, Users, DollarSign, Clock, RefreshCw, 
  BarChart3, Calendar, Star, Eye, Edit, Plus, Zap, 
  Search, Filter, Activity, FileText, Award, Lightbulb
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'

interface DigitalMarketingService {
  id: string
  title: string
  description: string
  status: string
  base_price: number
  currency: string
  delivery_timeframe: string
  revision_policy: string
  views_count: number
  bookings_count: number
  rating: number
  created_at: string
  service_packages: {
    name: string
    price: number
    delivery_days: number
    revisions: number
    features: string[]
  }[]
}

interface DigitalMarketingStats {
  totalServices: number
  activeServices: number
  totalViews: number
  totalBookings: number
  averageRating: number
  totalRevenue: number
  averageDeliveryTime: string
  averageRevisions: number
  completionRate: number
}

export default function DigitalMarketingDashboard() {
  const [services, setServices] = useState<DigitalMarketingService[]>([])
  const [stats, setStats] = useState<DigitalMarketingStats>({
    totalServices: 0,
    activeServices: 0,
    totalViews: 0,
    totalBookings: 0,
    averageRating: 0,
    totalRevenue: 0,
    averageDeliveryTime: '0 days',
    averageRevisions: 0,
    completionRate: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchDigitalMarketingData()
  }, [])

  const fetchDigitalMarketingData = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Fetch digital marketing services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select(`
          *,
          service_packages (*)
        `)
        .eq('provider_id', user.id)
        .eq('category', 'Digital Marketing')

      if (servicesError) {
        console.error('Error fetching services:', servicesError)
        return
      }

      setServices(servicesData || [])

      // Calculate stats
      if (servicesData && servicesData.length > 0) {
        const totalViews = servicesData.reduce((sum, service) => sum + (service.views_count || 0), 0)
        const totalBookings = servicesData.reduce((sum, service) => sum + (service.bookings_count || 0), 0)
        const totalRevenue = servicesData.reduce((sum, service) => sum + service.base_price, 0)
        const averageRating = servicesData.reduce((sum, service) => sum + (service.rating || 0), 0) / servicesData.length
        
        // Calculate delivery time and revisions from packages
        let totalDeliveryDays = 0
        let totalRevisions = 0
        let packageCount = 0
        
        servicesData.forEach(service => {
          if (service.service_packages) {
            service.service_packages.forEach(pkg => {
              totalDeliveryDays += pkg.delivery_days
              totalRevisions += pkg.revisions
              packageCount++
            })
          }
        })

        const averageDeliveryTime = packageCount > 0 ? `${Math.round(totalDeliveryDays / packageCount)} days` : '0 days'
        const averageRevisions = packageCount > 0 ? Math.round((totalRevisions / packageCount) * 10) / 10 : 0

        setStats({
          totalServices: servicesData.length,
          activeServices: servicesData.filter(s => s.status === 'active').length,
          totalViews,
          totalBookings,
          averageRating: Math.round(averageRating * 10) / 10,
          totalRevenue,
          averageDeliveryTime,
          averageRevisions,
          completionRate: totalBookings > 0 ? Math.round((totalBookings / (totalBookings + 5)) * 100) : 0
        })
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching digital marketing data:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">Loading your digital marketing dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Target className="h-10 w-10 text-blue-600" />
                Digital Marketing Dashboard
              </h1>
              <p className="text-gray-600 text-lg">Manage and optimize your digital marketing services</p>
            </div>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="mr-2 h-5 w-5" />
              Add New Service
            </Button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Services</p>
                    <p className="text-2xl font-bold text-blue-900">{stats.totalServices}</p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-full">
                    <Target className="h-6 w-6 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Total Views</p>
                    <p className="text-2xl font-bold text-green-900">{stats.totalViews}</p>
                  </div>
                  <div className="p-3 bg-green-200 rounded-full">
                    <Eye className="h-6 w-6 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-purple-900">{formatCurrency(stats.totalRevenue, 'OMR')}</p>
                  </div>
                  <div className="p-3 bg-purple-200 rounded-full">
                    <DollarSign className="h-6 w-6 text-purple-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Avg. Rating</p>
                    <p className="text-2xl font-bold text-orange-900">{stats.averageRating.toFixed(1)}/5.0</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`h-3 w-3 ${star <= stats.averageRating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-orange-200 rounded-full">
                    <Star className="h-6 w-6 text-orange-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-lg">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="services" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Target className="h-4 w-4 mr-2" />
              Services
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <TrendingUp className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Lightbulb className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Digital Marketing Performance */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-900">{stats.averageDeliveryTime}</div>
                      <div className="text-xs text-blue-700">Avg. Delivery</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-900">{stats.averageRevisions}</div>
                      <div className="text-xs text-green-700">Avg. Revisions</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-900">{stats.completionRate}%</div>
                      <div className="text-xs text-purple-700">Completion Rate</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-lg font-bold text-orange-900">{stats.totalBookings}</div>
                      <div className="text-xs text-orange-700">Total Bookings</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-600" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Service
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Existing Service
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Your Digital Marketing Services</CardTitle>
                <CardDescription>
                  Manage and optimize your service offerings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.map((service) => (
                    <Card key={service.id} className="hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{service.title}</CardTitle>
                          <Badge className={service.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {service.status}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">{service.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          {service.delivery_timeframe}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <RefreshCw className="h-4 w-4" />
                          {service.revision_policy}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-lg">{formatCurrency(service.base_price, service.currency)}</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>
                  Track your digital marketing service performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">Performance analytics coming soon</p>
                  <p className="text-sm">Detailed performance metrics and charts will be available here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>AI-Powered Insights</CardTitle>
                <CardDescription>
                  Get intelligent recommendations to improve your services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">AI insights coming soon</p>
                  <p className="text-sm">Smart recommendations and optimization tips will be available here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
