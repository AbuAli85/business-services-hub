'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CollapsibleSidebar } from '@/components/dashboard/collapsible-sidebar'
import { Topbar } from '@/components/dashboard/topbar'
import { EnhancedKPIGrid, EnhancedPerformanceMetrics } from '@/components/dashboard/enhanced-kpi-cards'
import { AdvancedEarningsChart } from '@/components/dashboard/advanced-earnings-chart'
import { PremiumRecentBookings } from '@/components/dashboard/premium-recent-bookings'
import { EliteTopServices } from '@/components/dashboard/elite-top-services'
import { MonthlyGoals } from '@/components/dashboard/monthly-goals'
import { ProviderDashboardService, ProviderDashboardStats, RecentBooking, TopService, MonthlyEarnings } from '@/lib/provider-dashboard'
import { getSupabaseClient } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  RefreshCw, 
  AlertCircle,
  TrendingUp,
  Award,
  Target,
  Zap
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProviderDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // Dashboard data
  const [stats, setStats] = useState<ProviderDashboardStats | null>(null)
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [topServices, setTopServices] = useState<TopService[]>([])
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarnings[]>([])

  useEffect(() => {
    loadUserAndData()
  }, [])

  const loadUserAndData = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = await getSupabaseClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/auth/sign-in')
        return
      }

      setUserId(user.id)
      await loadDashboardData(user.id)
    } catch (err) {
      console.error('Error loading user and data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const loadDashboardData = async (providerId: string) => {
    try {
      const data = await ProviderDashboardService.getAllDashboardData(providerId)
      
      setStats(data.stats)
      setRecentBookings(data.recentBookings)
      setTopServices(data.topServices)
      setMonthlyEarnings(data.monthlyEarnings)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      throw err
    }
  }

  const handleRefresh = async () => {
    if (!userId) return
    
    try {
      setRefreshing(true)
      await loadDashboardData(userId)
      toast.success('Dashboard refreshed')
    } catch (err) {
      console.error('Error refreshing dashboard:', err)
      toast.error('Failed to refresh dashboard')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <CollapsibleSidebar 
          collapsed={sidebarCollapsed} 
          setCollapsed={setSidebarCollapsed} 
        />
        
        <div className="flex flex-col flex-1">
          <Topbar 
            title="Provider Dashboard" 
            subtitle="Loading your dashboard..." 
          />
          
          <main className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                  <div className="absolute inset-0 rounded-full border-2 border-blue-200"></div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">Loading Dashboard</p>
                  <p className="text-sm text-gray-600">Preparing your business insights...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <CollapsibleSidebar 
          collapsed={sidebarCollapsed} 
          setCollapsed={setSidebarCollapsed} 
        />
        
        <div className="flex flex-col flex-1">
          <Topbar 
            title="Provider Dashboard" 
            subtitle="Error loading dashboard" 
          />
          
          <main className="flex-1 overflow-y-auto p-6">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
                  <p className="text-gray-600 mb-6 max-w-md">{error || 'Failed to load dashboard data'}</p>
                  <Button onClick={loadUserAndData} variant="outline" className="bg-white hover:bg-gray-50">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <CollapsibleSidebar 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1">
        {/* Topbar */}
        <Topbar 
          title="Provider Dashboard" 
          subtitle="Welcome back! Here's what's happening with your business." 
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Welcome Section */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Business Overview
                </h1>
                <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Monitor your performance and grow your business</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-white/20">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Live</span>
                </div>
                <Button 
                  onClick={handleRefresh} 
                  disabled={refreshing}
                  variant="outline"
                  size="sm"
                  className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80 text-xs sm:text-sm"
                >
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                  <span className="sm:hidden">{refreshing ? '...' : '↻'}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* KPI Grid */}
          <section className="mb-8">
            <EnhancedKPIGrid data={stats} />
          </section>

          {/* Performance Metrics */}
          <section className="mb-8">
            <EnhancedPerformanceMetrics data={stats} />
          </section>

          {/* Earnings Chart */}
          <section className="mb-8">
            <AdvancedEarningsChart data={monthlyEarnings} />
          </section>

          {/* Recent Bookings + Top Services */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <PremiumRecentBookings bookings={recentBookings} />
            <EliteTopServices services={topServices} />
          </section>

          {/* Monthly Goals & Achievements */}
          <section className="mb-8">
            <MonthlyGoals data={stats} />
          </section>

          {/* Quick Actions */}
          <section className="mb-8">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
                    <p className="text-gray-600">Streamline your workflow</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => router.push('/dashboard/provider/create-service')}
                    className="h-16 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold">Create Service</div>
                      <div className="text-sm opacity-90">Add new offering</div>
                    </div>
                  </Button>
                  <Button 
                    onClick={() => router.push('/dashboard/bookings')}
                    className="h-16 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold">View Bookings</div>
                      <div className="text-sm opacity-90">Manage projects</div>
                    </div>
                  </Button>
                  <Button 
                    onClick={() => router.push('/dashboard/analytics')}
                    className="h-16 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold">Analytics</div>
                      <div className="text-sm opacity-90">View insights</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  )
}