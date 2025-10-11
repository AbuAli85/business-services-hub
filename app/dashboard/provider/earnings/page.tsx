'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseClient } from '@/lib/supabase'
import { realtimeManager } from '@/lib/realtime'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  BarChart3,
  PieChart,
  Target,
  Award,
  CreditCard,
  Banknote,
  RefreshCw,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'

interface Earning {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed'
  source: 'service' | 'package' | 'consultation'
  booking_id: string
  created_at: string
  service_title: string
  client_name: string
}

interface EarningStats {
  totalEarnings: number
  monthlyEarnings: number
  pendingPayments: number
  completedPayments: number
  averagePerService: number
  growthRate: number
  topEarningMonth: string
  totalServices: number
  weeklyEarnings: number
  todayEarnings: number
  successRate: number
}

interface Invoice {
  id: string
  booking_id: string
  client_id: string
  provider_id: string
  amount: number
  currency: string
  status: 'draft' | 'issued' | 'paid' | 'void'
  created_at: string
  invoice_pdf_url?: string | null
  bookings?: { services?: { title?: string } | null } | null
  clients?: { full_name?: string } | null
}

interface ChartDataPoint {
  date: string
  earnings: number
  count: number
  pending: number
}

export default function EarningsPage() {
  const router = useRouter()
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<EarningStats>({
    totalEarnings: 0,
    monthlyEarnings: 0,
    pendingPayments: 0,
    completedPayments: 0,
    averagePerService: 0,
    growthRate: 0,
    topEarningMonth: '',
    totalServices: 0,
    weeklyEarnings: 0,
    todayEarnings: 0,
    successRate: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState('30')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRealTimeActive, setIsRealTimeActive] = useState(false)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])

  // Fetch earnings data
  const fetchEarningsData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      else setRefreshing(true)

      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch payments as earnings for this provider
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount, currency, status, booking_id, created_at, client_id')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false })

      let liveEarnings: Earning[] = []
      if (!paymentsError && paymentsData) {
        // Fetch related data separately to avoid complex joins
        const enrichedPayments = await Promise.all(
          (paymentsData || []).map(async (p: any) => {
            try {
              // Get booking and service info
              const { data: booking } = await supabase
                .from('bookings')
                .select('service_id')
                .eq('id', p.booking_id)
                .single()
              
              let serviceTitle = 'Service'
              if (booking?.service_id) {
                const { data: service } = await supabase
                  .from('services')
                  .select('title')
                  .eq('id', booking.service_id)
                  .single()
                serviceTitle = service?.title || 'Service'
              }
              
              // Get client name
              const { data: client } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', p.client_id || '')
                .single()
              
              return {
                ...p,
                service_title: serviceTitle,
                client_name: client?.full_name || 'Client'
              }
            } catch (error) {
              console.error('Error enriching payment:', error)
              return {
                ...p,
                service_title: 'Service',
                client_name: 'Client'
              }
            }
          })
        )

        liveEarnings = enrichedPayments.map((p: any) => ({
          id: p.id,
          amount: p.amount || 0,
          currency: (p.currency || 'OMR').toUpperCase(),
          status: (p.status === 'succeeded' || p.status === 'paid') ? 'completed' : (p.status === 'processing' ? 'pending' : 'failed'),
          source: 'service',
          booking_id: p.booking_id,
          created_at: p.created_at,
          service_title: p.service_title,
          client_name: p.client_name
        }))
      }

      setEarnings(liveEarnings)

      // Fetch invoices for this provider
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('id, booking_id, client_id, provider_id, amount, currency, status, created_at, invoice_pdf_url')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false })
      
      // Enrich invoices with related data separately
      const enrichedInvoices = await Promise.all(
        (invoicesData || []).map(async (invoice: any) => {
          try {
            // Get booking and service info
            const { data: booking } = await supabase
              .from('bookings')
              .select('service_id')
              .eq('id', invoice.booking_id)
              .single()
            
            let serviceTitle = 'Service'
            if (booking?.service_id) {
              const { data: service } = await supabase
                .from('services')
                .select('title')
                .eq('id', booking.service_id)
                .single()
              serviceTitle = service?.title || 'Service'
            }
            
            // Get client name
            const { data: client } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', invoice.client_id)
              .single()
            
            return {
              ...invoice,
              service_title: serviceTitle,
              client_name: client?.full_name || 'Unknown Client'
            }
          } catch (error) {
            console.error('Error enriching invoice:', error)
            return {
              ...invoice,
              service_title: 'Service',
              client_name: 'Unknown Client'
            }
          }
        })
      )
      
      setInvoices(enrichedInvoices as any)

      // If no payments exist, calculate earnings from invoices and bookings
      if (liveEarnings.length === 0 && enrichedInvoices.length > 0) {
        console.log('⚠️ No payments found, calculating earnings from invoices')
        
        // Use invoices as earnings source
        liveEarnings = enrichedInvoices.map((invoice: any) => ({
          id: invoice.id,
          amount: invoice.amount || 0,
          currency: (invoice.currency || 'OMR').toUpperCase(),
          status: invoice.status === 'paid' ? 'completed' : (invoice.status === 'issued' ? 'pending' : 'failed'),
          source: 'service' as const,
          booking_id: invoice.booking_id,
          created_at: invoice.created_at,
          service_title: invoice.service_title || 'Service',
          client_name: invoice.client_name || 'Client'
        }))
        
        setEarnings(liveEarnings)
      }
      
      // If still no earnings, try to get from bookings with amounts
      if (liveEarnings.length === 0) {
        console.log('⚠️ No invoices found, checking bookings for amounts')
        
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('id, total_amount, amount, currency, status, created_at, service_id, client_id')
          .eq('provider_id', user.id)
          .order('created_at', { ascending: false })
        
        if (bookingsData && bookingsData.length > 0) {
          console.log('✅ Found', bookingsData.length, 'bookings with amounts')
          
          const earningsFromBookings = await Promise.all(
            bookingsData.map(async (booking: any) => {
              try {
                const { data: service } = await supabase
                  .from('services')
                  .select('title')
                  .eq('id', booking.service_id)
                  .single()
                
                const { data: client } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', booking.client_id)
                  .single()
                
                return {
                  id: booking.id,
                  amount: booking.total_amount || booking.amount || 0,
                  currency: (booking.currency || 'OMR').toUpperCase(),
                  status: booking.status === 'completed' ? 'completed' : (booking.status === 'pending' ? 'pending' : 'completed') as 'completed' | 'pending' | 'failed',
                  source: 'service' as const,
                  booking_id: booking.id,
                  created_at: booking.created_at,
                  service_title: service?.title || 'Service',
                  client_name: client?.full_name || 'Client'
                }
              } catch (error) {
                console.error('Error processing booking:', error)
                return null
              }
            })
          )
          
          const validEarnings = earningsFromBookings.filter(e => e !== null && e.amount > 0) as Earning[]
          liveEarnings = validEarnings
          setEarnings(liveEarnings)
          console.log('✅ Set earnings from bookings:', liveEarnings.length, 'items')
        }
      }

      // Calculate comprehensive stats
      const now = new Date()
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const last60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

      // Calculate completed earnings (payments received)
      const completedEarnings = liveEarnings
        .filter(e => e.status === 'completed')
        .reduce((sum, e) => sum + e.amount, 0)
      
      // Calculate total revenue (all bookings including pending)
      const totalRevenue = liveEarnings
        .reduce((sum, e) => sum + e.amount, 0)
      
      // Use total revenue to match dashboard (includes pending)
      const totalEarnings = totalRevenue
      
      console.log('📊 Earnings breakdown:', {
        completed: completedEarnings,
        totalRevenue: totalRevenue,
        totalEarnings: totalEarnings,
        earningsCount: liveEarnings.length
      })

      // Monthly earnings - include all bookings (completed + pending) to match dashboard
      const monthlyEarnings = liveEarnings
        .filter(e => new Date(e.created_at) > last30Days)
        .reduce((sum, e) => sum + e.amount, 0)

      const previousMonthEarnings = liveEarnings
        .filter(e => 
          new Date(e.created_at) > last60Days && 
          new Date(e.created_at) <= last30Days)
        .reduce((sum, e) => sum + e.amount, 0)

      // Weekly earnings - include all bookings to match dashboard
      const weeklyEarnings = liveEarnings
        .filter(e => new Date(e.created_at) > last7Days)
        .reduce((sum, e) => sum + e.amount, 0)

      // Today's earnings - include all bookings to match dashboard
      const todayEarnings = liveEarnings
        .filter(e => new Date(e.created_at) >= today)
        .reduce((sum, e) => sum + e.amount, 0)

      const pendingPayments = liveEarnings
        .filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + e.amount, 0)

      const completedPayments = liveEarnings
        .filter(e => e.status === 'completed')
        .length

      const totalTransactions = liveEarnings.length
      const successRate = totalTransactions > 0 
        ? (completedPayments / totalTransactions) * 100 
        : 0

      const growthRate = previousMonthEarnings > 0
        ? ((monthlyEarnings - previousMonthEarnings) / previousMonthEarnings) * 100
        : monthlyEarnings > 0 ? 100 : 0

      // Generate chart data
      const chartDataMap = new Map<string, ChartDataPoint>()
      const days = parseInt(timeRange)
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        chartDataMap.set(dateStr, {
          date: dateStr,
          earnings: 0,
          count: 0,
          pending: 0
        })
      }

      liveEarnings.forEach(earning => {
        const earningDate = new Date(earning.created_at)
        if (earningDate > new Date(now.getTime() - days * 24 * 60 * 60 * 1000)) {
          const dateStr = earningDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          const existing = chartDataMap.get(dateStr)
          if (existing) {
            if (earning.status === 'completed') {
              existing.earnings += earning.amount
              existing.count += 1
            } else if (earning.status === 'pending') {
              existing.pending += earning.amount
            }
          }
        }
      })

      setChartData(Array.from(chartDataMap.values()))

      setStats({
        totalEarnings,
        monthlyEarnings,
        pendingPayments,
        completedPayments,
        averagePerService: completedPayments > 0 ? totalEarnings / completedPayments : 0,
        growthRate,
        topEarningMonth: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        totalServices: liveEarnings.length,
        weeklyEarnings,
        todayEarnings,
        successRate
      })

      setLastUpdated(new Date())
      setLoading(false)
      setRefreshing(false)
    } catch (error) {
      console.error('Error fetching earnings data:', error)
      setLoading(false)
      setRefreshing(false)
    }
  }, [timeRange])

  // Initial fetch
  useEffect(() => {
    fetchEarningsData()
  }, [fetchEarningsData])

  // Setup real-time subscriptions
  useEffect(() => {
    let mounted = true

    const setupRealtime = async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !mounted) return

        // Subscribe to payments
        const paymentsChannel = supabase
          .channel(`earnings-payments-${user.id}`)
          .on('postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'payments',
              filter: `provider_id=eq.${user.id}`
            },
            async (payload: any) => {
              console.log('💰 Real-time payment update:', payload)
              if (mounted) {
                await fetchEarningsData(false)
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED' && mounted) {
              console.log('✅ Subscribed to real-time payments')
              setIsRealTimeActive(true)
            }
          })

        // Subscribe to invoices
        const invoicesChannel = supabase
          .channel(`earnings-invoices-${user.id}`)
          .on('postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'invoices',
              filter: `provider_id=eq.${user.id}`
            },
            async (payload: any) => {
              console.log('📄 Real-time invoice update:', payload)
              if (mounted) {
                await fetchEarningsData(false)
              }
            }
          )
          .subscribe()

        return () => {
          mounted = false
          paymentsChannel.unsubscribe()
          invoicesChannel.unsubscribe()
        }
      } catch (error) {
        console.error('Failed to setup real-time subscriptions:', error)
      }
    }

    setupRealtime()

    return () => {
      mounted = false
    }
  }, [fetchEarningsData])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEarningsData(false)
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchEarningsData])

  // Filter earnings based on search and status
  const filteredEarnings = earnings.filter(earning => {
    const matchesSearch = searchQuery === '' || 
      (earning.service_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (earning.client_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || earning.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'service':
        return <BarChart3 className="h-4 w-4" />
      case 'package':
        return <PieChart className="h-4 w-4" />
      case 'consultation':
        return <Target className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'service':
        return 'Service'
      case 'package':
        return 'Package'
      case 'consultation':
        return 'Consultation'
      default:
        return source
    }
  }

  const exportEarnings = () => {
    const csvContent = [
      'Date,Service,Client,Amount,Status,Source',
      ...filteredEarnings.map(e => 
        `${formatDate(e.created_at)},${e.service_title},${e.client_name},${e.amount} ${e.currency},${e.status},${getSourceLabel(e.source)}`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `earnings-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Chart colors
  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6']

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
            <p className="text-gray-600">Loading your earnings data...</p>
          </div>
        </div>
        
        {/* Skeleton for stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                  <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Skeleton for charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="animate-pulse h-6 bg-gray-200 rounded w-40"></div>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse h-64 bg-gray-100 rounded"></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="animate-pulse h-6 bg-gray-200 rounded w-40"></div>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse h-64 bg-gray-100 rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Earnings Dashboard
            </h1>
            {isRealTimeActive && (
              <Badge className="bg-green-500 text-white border-0 animate-pulse">
                <Activity className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
          </div>
          <p className="text-gray-600 mt-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Real-time financial performance tracking
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 bg-white border-2">
              <Calendar className="h-4 w-4 mr-2" />
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
            onClick={() => fetchEarningsData(false)}
            variant="outline"
            className="border-2"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportEarnings} className="bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Last Updated Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-gray-500 flex items-center gap-2"
      >
        <Clock className="h-4 w-4" />
        Last updated: {lastUpdated.toLocaleTimeString()}
      </motion.div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-500 to-green-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Earnings</CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(stats.totalEarnings, 'OMR')}
              </div>
              <p className="text-xs opacity-80 mt-2">
                All time earnings
              </p>
              <div className="flex items-center mt-3 text-sm">
                {stats.growthRate >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                )}
                <span className="font-semibold">
                  {Math.abs(stats.growthRate).toFixed(1)}% {stats.growthRate >= 0 ? 'increase' : 'decrease'}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Monthly Earnings</CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(stats.monthlyEarnings, 'OMR')}
              </div>
              <p className="text-xs opacity-80 mt-2">
                Last 30 days
              </p>
              <div className="flex items-center mt-3 text-sm">
                <Award className="h-4 w-4 mr-1" />
                <span>Best: {stats.topEarningMonth}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Pending</CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(stats.pendingPayments, 'OMR')}
              </div>
              <p className="text-xs opacity-80 mt-2">
                Awaiting payment
              </p>
              <div className="flex items-center mt-3 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>{earnings.filter(e => e.status === 'pending').length} transactions</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Avg. Per Service</CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <BarChart3 className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(stats.averagePerService, 'OMR')}
              </div>
              <p className="text-xs opacity-80 mt-2">
                Average per transaction
              </p>
              <div className="flex items-center mt-3 text-sm">
                <Target className="h-4 w-4 mr-1" />
                <span>{stats.completedPayments} completed</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Additional Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Today's Earnings</span>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.todayEarnings, 'OMR')}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Weekly Earnings</span>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.weeklyEarnings, 'OMR')}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Success Rate</span>
                <CheckCircle className="h-4 w-4 text-purple-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.successRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Earnings Trend Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Earnings Trend
            </CardTitle>
            <CardDescription>
              Daily earnings and transaction volume over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: any) => [`${formatCurrency(value, 'OMR')}`, undefined]}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="earnings" 
                  stroke="#10b981" 
                  fillOpacity={1}
                  fill="url(#colorEarnings)"
                  name="Completed Earnings"
                />
                <Area 
                  type="monotone" 
                  dataKey="pending" 
                  stroke="#f59e0b" 
                  fillOpacity={1}
                  fill="url(#colorPending)"
                  name="Pending"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Earnings Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-600" />
                Payment Status
              </CardTitle>
              <CardDescription>Breakdown by payment status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-900">Completed</p>
                      <p className="text-sm text-green-700">{stats.completedPayments} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(stats.totalEarnings, 'OMR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-yellow-500 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-yellow-900">Pending</p>
                      <p className="text-sm text-yellow-700">
                        {earnings.filter(e => e.status === 'pending').length} transactions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-yellow-900">
                      {formatCurrency(stats.pendingPayments, 'OMR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-red-900">Failed</p>
                      <p className="text-sm text-red-700">
                        {earnings.filter(e => e.status === 'failed').length} transactions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-900">
                      {formatCurrency(
                        earnings
                          .filter(e => e.status === 'failed')
                          .reduce((sum, e) => sum + e.amount, 0),
                        'OMR'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.0 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Transaction Volume
              </CardTitle>
              <CardDescription>Daily transaction count</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Earnings History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
      >
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>
                  Detailed breakdown of all your earnings and payments
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 border-2">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredEarnings.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <DollarSign className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-900 mb-2">No transactions found</p>
                <p className="text-sm text-gray-500 mb-4">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters or search term'
                    : 'You haven\'t earned revenue yet. Start by promoting your services and getting bookings!'}
                </p>
                {!(searchQuery || statusFilter !== 'all') && (
                  <Button 
                    onClick={() => router.push('/dashboard/services')} 
                    variant="outline"
                    size="sm"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    View My Services
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredEarnings.slice(0, 10).map((earning, index) => (
                    <motion.div
                      key={earning.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 border-2 rounded-xl hover:bg-gray-50 hover:border-blue-300 transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl ${
                          earning.status === 'completed' ? 'bg-green-100' : 
                          earning.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                        }`}>
                          {getSourceIcon(earning.source)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{earning.service_title}</h4>
                          <p className="text-sm text-gray-600">Client: {earning.client_name}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {getSourceLabel(earning.source)}
                            </Badge>
                            <Badge className={`${getStatusColor(earning.status)} border text-xs`}>
                              {earning.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-xl font-bold ${
                          earning.status === 'completed' ? 'text-green-600' :
                          earning.status === 'pending' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {formatCurrency(earning.amount, earning.currency)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(earning.created_at)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredEarnings.length > 10 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">
                      Showing 10 of {filteredEarnings.length} transactions
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Invoices */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-blue-600" />
              Invoices
            </CardTitle>
            <CardDescription>Download receipts for your completed payments</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-12">
                <Banknote className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-900 mb-2">No invoices yet</p>
                <p className="text-sm text-gray-500">Invoices will appear here after successful payments.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.slice(0, 5).map((inv, index) => (
                  <motion.div 
                    key={inv.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 border-2 rounded-xl hover:bg-gray-50 hover:border-blue-300 transition-all duration-200"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-gray-900">{inv.bookings?.services?.title || 'Service'}</div>
                      <div className="text-sm text-gray-600">
                        {formatDate(inv.created_at)} • {inv.clients?.full_name || 'Client'} • #{inv.id.slice(0,8)}
                      </div>
                      <div className="text-xs">
                        <Badge className={
                          inv.status === 'paid' ? 'bg-green-100 text-green-800 border-green-200' :
                          inv.status === 'issued' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          inv.status === 'void' ? 'bg-red-100 text-red-800 border-red-200' : 
                          'bg-gray-100 text-gray-800 border-gray-200'
                        }>
                          {inv.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(inv.amount || 0, inv.currency || 'OMR')}
                        </div>
                      </div>
                      {inv.invoice_pdf_url ? (
                        <a 
                          href={inv.invoice_pdf_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          <Download className="h-4 w-4 mr-2" /> 
                          Download
                        </a>
                      ) : (
                        <Button variant="outline" disabled className="border-2">
                          <Download className="h-4 w-4 mr-2" /> 
                          Pending
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
