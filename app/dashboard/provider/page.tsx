'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
// Layout-level sidebar and header are provided by app/dashboard/layout.tsx
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
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { SessionStatusIndicator } from '@/components/ui/session-status-indicator'
import { ProviderDashboardErrorBoundary } from '@/components/dashboard/dashboard-error-boundary'
import { logger } from '@/lib/logger'

export default function ProviderDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  // Sidebar and header are provided by the shared dashboard layout
  
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
      logger.error('Error loading user and data:', err)
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
      logger.error('Error loading dashboard data:', err)
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
      logger.error('Error refreshing dashboard:', err)
      toast.error('Failed to refresh dashboard')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
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
        </div>
      </main>
    )
  }

  if (error || !stats) {
    return (
      <main className="p-6">
        <div className="max-w-3xl mx-auto">
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
        </div>
      </main>
    )
  }

  return (
    <ProviderDashboardErrorBoundary>
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Provider Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here's what's happening with your business.</p>
          </div>
          <div className="flex items-center space-x-3">
            <SessionStatusIndicator showDetails={true} />
            <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
          {/* Welcome Section with Enhanced Design */}
          <div className="mb-10 sm:mb-12">
            <div className="relative">
              {/* Enhanced Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-purple-50/60 rounded-3xl -m-6 sm:-m-8 lg:-m-10"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-3xl -m-6 sm:-m-8 lg:-m-10"></div>
              <div className="relative bg-white/80 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/30 shadow-2xl p-6 sm:p-8 lg:p-10">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          Business Overview
                        </h1>
                        <p className="text-gray-600 mt-1 text-sm sm:text-base lg:text-lg">Monitor your performance and grow your business</p>
                      </div>
                    </div>
                    
                    {/* Enhanced Quick Stats Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-6 sm:mt-8">
                      <div className="group text-center p-4 sm:p-5 bg-gradient-to-br from-white/70 to-white/50 rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-1">{stats?.total_earnings ? formatCurrency(stats.total_earnings) : 'OMR 0'}</div>
                        <div className="text-sm font-medium text-gray-700">Total Earnings</div>
                        <div className="w-8 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mx-auto mt-2"></div>
                      </div>
                      <div className="group text-center p-4 sm:p-5 bg-gradient-to-br from-white/70 to-white/50 rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="text-xl sm:text-2xl font-bold text-green-600 mb-1">{stats?.active_bookings || 0}</div>
                        <div className="text-sm font-medium text-gray-700">Active Bookings</div>
                        <div className="w-8 h-1 bg-gradient-to-r from-green-500 to-green-600 rounded-full mx-auto mt-2"></div>
                      </div>
                      <div className="group text-center p-4 sm:p-5 bg-gradient-to-br from-white/70 to-white/50 rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="text-xl sm:text-2xl font-bold text-purple-600 mb-1">{stats?.active_services || 0}</div>
                        <div className="text-sm font-medium text-gray-700">Active Services</div>
                        <div className="w-8 h-1 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full mx-auto mt-2"></div>
                      </div>
                      <div className="group text-center p-4 sm:p-5 bg-gradient-to-br from-white/70 to-white/50 rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="text-xl sm:text-2xl font-bold text-orange-600 mb-1">{stats?.avg_rating ? stats.avg_rating.toFixed(1) : 'N/A'}</div>
                        <div className="text-sm font-medium text-gray-700">Avg Rating</div>
                        <div className="w-8 h-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full mx-auto mt-2"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 lg:space-y-3 lg:space-x-0 xl:space-y-0 xl:space-x-3">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-green-100/80 backdrop-blur-sm rounded-full border border-green-200/50">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-700">Live Dashboard</span>
            </div>
            <Button 
              onClick={handleRefresh} 
              disabled={refreshing}
              variant="outline"
              size="sm"
                      className="bg-white/80 backdrop-blur-sm border-white/40 hover:bg-white/90 text-sm shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                      {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button>
                  </div>
                </div>
              </div>
          </div>
        </div>

          {/* KPI Grid with Quick Actions and Smart Alerts */}
          <section className="mb-10 sm:mb-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50/40 via-gray-50/30 to-slate-100/40 rounded-3xl -m-4"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
              <div className="relative">
                <EnhancedKPIGrid 
                  data={stats} 
                  alerts={{
                    unreadMessages: undefined,
                    pendingBookings: recentBookings.filter(b => b.status === 'pending').length,
                    hasServices: (stats.active_services || 0) > 0
                  }}
                />
              </div>
            </div>
          </section>

          {/* Performance Metrics */}
          <section className="mb-10 sm:mb-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-indigo-50/30 to-blue-100/40 rounded-3xl -m-4"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
              <div className="relative">
                <EnhancedPerformanceMetrics 
                  data={stats}
                  breakdown={topServices.map(s => ({
                    service: s.title,
                    completion_rate: s.completion_rate || 0,
                    response_rate: undefined,
                  }))}
                  insights={[
                    ...topServices
                      .filter(s => (s.completion_rate || 0) < 0.7)
                      .slice(0, 2)
                      .map(s => `Low completion rate for ${s.title} – improve delivery timelines.`),
                    ...topServices
                      .filter(s => (s.avg_rating || 0) < 3.5)
                      .slice(0, 1)
                      .map(s => `Satisfaction is below target for ${s.title} – collect feedback and optimize scope.`)
                  ]}
                />
              </div>
            </div>
          </section>

          {/* Earnings Chart */}
          <section className="mb-10 sm:mb-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50/40 via-emerald-50/30 to-green-100/40 rounded-3xl -m-4"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
              <div className="relative">
                <AdvancedEarningsChart data={monthlyEarnings} />
              </div>
            </div>
          </section>

          {/* Recent Bookings + Top Services */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-8 sm:gap-10 mb-10 sm:mb-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/40 via-pink-50/30 to-purple-100/40 rounded-3xl -m-4"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
              <div className="relative">
                <PremiumRecentBookings bookings={recentBookings} />
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50/40 via-amber-50/30 to-orange-100/40 rounded-3xl -m-4"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
              <div className="relative">
                <EliteTopServices services={topServices} />
              </div>
            </div>
          </section>

          {/* Monthly Goals & Achievements */}
          <section className="mb-10 sm:mb-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-purple-50/30 to-indigo-100/40 rounded-3xl -m-4"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
              <div className="relative">
                <MonthlyGoals data={stats} />
              </div>
            </div>
          </section>

          {/* Quick Actions removed (now inside KPI section) */}

      </div>
    </main>
    </ProviderDashboardErrorBoundary>
  )
}