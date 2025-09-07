'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ImprovedKPIGrid, ImprovedPerformanceMetrics } from '@/components/dashboard/improved-kpi-cards'
import { EarningsChart } from '@/components/dashboard/earnings-chart'
import { RecentBookings } from '@/components/dashboard/recent-bookings'
import { TopServices } from '@/components/dashboard/top-services'
import { MonthlyGoals } from '@/components/dashboard/monthly-goals'
import { ProviderDashboardService, ProviderDashboardStats, RecentBooking, TopService, MonthlyEarnings } from '@/lib/provider-dashboard'
import { getSupabaseClient } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  RefreshCw, 
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProviderDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
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
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
            <p className="text-gray-600 mb-4">{error || 'Failed to load dashboard data'}</p>
            <Button onClick={loadUserAndData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-3xl font-bold text-gray-900">Provider Dashboard</h1>
              <p className="mt-2 text-gray-600">Welcome back! Here's what's happening with your business.</p>
            </div>
            <Button 
              onClick={handleRefresh} 
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="space-y-8">
          {/* KPI Grid */}
          <section>
            <ImprovedKPIGrid data={stats} />
          </section>

          {/* Performance Metrics */}
          <section>
            <ImprovedPerformanceMetrics data={stats} />
          </section>

          {/* Earnings Chart */}
          <section>
            <EarningsChart data={monthlyEarnings} />
          </section>

          {/* Recent Bookings + Top Services */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <RecentBookings bookings={recentBookings} />
            <TopServices services={topServices} />
          </section>

          {/* Monthly Goals & Achievements */}
          <section>
            <MonthlyGoals data={stats} />
          </section>
        </div>
      </div>
    </div>
  )
}