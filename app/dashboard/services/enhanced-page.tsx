'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { 
  Plus, 
  Edit, 
  Eye, 
  Package, 
  Star, 
  Clock, 
  Banknote, 
  TrendingUp, 
  Calendar,
  Search,
  CheckCircle,
  RefreshCw,
  Grid3X3,
  List,
  Filter,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Users,
  Activity,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  Award,
  AlertCircle,
  TrendingDown,
  MessageSquare,
  Share2,
  Download,
  Settings
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getServiceCardImageUrl } from '@/lib/service-images'
import { getSupabaseClient } from '@/lib/supabase'
import { getUserAuth, hasRoleV2 } from '@/lib/user-auth'
import { formatCurrency } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'

interface Service {
  id: string
  title: string
  description: string
  category: string
  basePrice: number
  currency: string
  status: string
  rating: number
  reviewCount: number
  bookingCount: number
  revenue: number
  featured: boolean
  providerName: string
  providerId: string
  createdAt: string
  updatedAt: string
  coverImageUrl?: string
}

interface ServiceStats {
  total: number
  active: number
  inactive: number
  totalBookings: number
  totalRevenue: number
  avgRating: number
  todayBookings: number
  weeklyBookings: number
  growthRate: number
  conversionRate: number
}

interface ChartData {
  date: string
  bookings: number
  revenue: number
  views: number
}

export default function EnhancedServicesPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<'provider' | 'client' | 'admin' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isProvider, setIsProvider] = useState(false)
  const [isClient, setIsClient] = useState(false)
  
  // Data states
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRealTimeActive, setIsRealTimeActive] = useState(false)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [ratingFilter, setRatingFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [featuredOnly, setFeaturedOnly] = useState(false)
  
  // Analytics data
  const [stats, setStats] = useState<ServiceStats>({
    total: 0,
    active: 0,
    inactive: 0,
    totalBookings: 0,
    totalRevenue: 0,
    avgRating: 0,
    todayBookings: 0,
    weeklyBookings: 0,
    growthRate: 0,
    conversionRate: 0
  })
  const [chartData, setChartData] = useState<ChartData[]>([])
  
  // Get user authentication
  useEffect(() => {
    (async () => {
      try {
        const authResult = await getUserAuth()
        if (!authResult.isAuthenticated || !authResult.user) return
        
        setUserId(authResult.user.id)
        setUserRole(authResult.role as any)
        
        const [providerCheck, clientCheck] = await Promise.all([
          hasRoleV2('provider'),
          hasRoleV2('client')
        ])
        
        setIsProvider(providerCheck)
        setIsClient(clientCheck)
      } catch (e) {
        console.error('Error getting user auth:', e)
      }
    })()
  }, [])

  // Fetch services data
  const fetchServicesData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      else setRefreshing(true)

      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Build query based on role
      let query = supabase
        .from('services')
        .select(`
          id,
          title,
          description,
          category,
          base_price,
          currency,
          status,
          featured,
          created_at,
          updated_at,
          cover_image_url,
          provider_id,
          profiles!services_provider_id_fkey (
            full_name
          )
        `)
        .order('created_at', { ascending: false })

      // Filter by role
      if (isProvider) {
        query = query.eq('provider_id', user.id)
      } else if (!isClient) {
        query = query.eq('status', 'active')
      }

      const { data: servicesData, error } = await query

      if (error) throw error

      // Fetch bookings data for stats
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, service_id, status, created_at, total_amount')
        .in('service_id', servicesData?.map(s => s.id) || [])

      // Fetch reviews for ratings
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('service_id, rating')
        .in('service_id', servicesData?.map(s => s.id) || [])

      // Process services with stats
      const processedServices: Service[] = (servicesData || []).map(service => {
        const serviceBookings = bookingsData?.filter(b => b.service_id === service.id) || []
        const serviceReviews = reviewsData?.filter(r => r.service_id === service.id) || []
        
        return {
          id: service.id,
          title: service?.title || 'Service',
          description: service.description,
          category: service.category,
          basePrice: service.base_price || 0,
          currency: service.currency || 'OMR',
          status: service.status || 'active',
          featured: service.featured || false,
          providerName: (service.profiles as any)?.full_name || 'Provider',
          providerId: service.provider_id,
          createdAt: service.created_at,
          updatedAt: service.updated_at,
          coverImageUrl: service.cover_image_url,
          bookingCount: serviceBookings.length,
          revenue: serviceBookings
            .filter(b => b.status === 'completed')
            .reduce((sum, b) => sum + (b.total_amount || 0), 0),
          rating: serviceReviews.length > 0
            ? serviceReviews.reduce((sum, r) => sum + r.rating, 0) / serviceReviews.length
            : 0,
          reviewCount: serviceReviews.length
        }
      })

      setServices(processedServices)

      // Calculate stats
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

      const totalBookings = processedServices.reduce((sum, s) => sum + s.bookingCount, 0)
      const totalRevenue = processedServices.reduce((sum, s) => sum + s.revenue, 0)
      const todayBookings = bookingsData?.filter(b => new Date(b.created_at) >= today).length || 0
      const weeklyBookings = bookingsData?.filter(b => new Date(b.created_at) >= weekAgo).length || 0
      const lastMonthBookings = bookingsData?.filter(b => 
        new Date(b.created_at) >= monthAgo && new Date(b.created_at) < weekAgo
      ).length || 0
      
      const growthRate = lastMonthBookings > 0
        ? ((weeklyBookings - lastMonthBookings) / lastMonthBookings) * 100
        : weeklyBookings > 0 ? 100 : 0

      const newStats: ServiceStats = {
        total: processedServices.length,
        active: processedServices.filter(s => s.status === 'active').length,
        inactive: processedServices.filter(s => s.status !== 'active').length,
        totalBookings,
        totalRevenue,
        avgRating: processedServices.length > 0
          ? processedServices.reduce((sum, s) => sum + s.rating, 0) / processedServices.length
          : 0,
        todayBookings,
        weeklyBookings,
        growthRate,
        conversionRate: processedServices.length > 0
          ? (totalBookings / (processedServices.length * 100)) * 100 // Mock calculation
          : 0
      }

      setStats(newStats)

      // Generate chart data (last 14 days)
      const chartDataPoints: ChartData[] = []
      for (let i = 13; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        const dayBookings = bookingsData?.filter(b => {
          const bookingDate = new Date(b.created_at)
          return bookingDate.toDateString() === date.toDateString()
        }) || []

        chartDataPoints.push({
          date: dateStr,
          bookings: dayBookings.length,
          revenue: dayBookings
            .filter(b => b.status === 'completed')
            .reduce((sum, b) => sum + (b.total_amount || 0), 0),
          views: Math.floor(Math.random() * 50) + 20 // Mock data
        })
      }

      setChartData(chartDataPoints)
      setLastUpdated(new Date())
      setLoading(false)
      setRefreshing(false)
    } catch (error) {
      console.error('Error fetching services data:', error)
      setLoading(false)
      setRefreshing(false)
    }
  }, [isProvider, isClient])

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchServicesData()
    }
  }, [userId, fetchServicesData])

  // Setup real-time subscriptions
  useEffect(() => {
    let mounted = true

    const setupRealtime = async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !mounted) return

        // Subscribe to services changes
        const servicesChannel = supabase
          .channel(`services-${user.id}`)
          .on('postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'services',
              filter: isProvider ? `provider_id=eq.${user.id}` : undefined
            },
            async () => {
              if (mounted) {
                await fetchServicesData(false)
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED' && mounted) {
              setIsRealTimeActive(true)
            }
          })

        // Subscribe to bookings changes
        const bookingsChannel = supabase
          .channel(`bookings-services-${user.id}`)
          .on('postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'bookings'
            },
            async () => {
              if (mounted) {
                await fetchServicesData(false)
              }
            }
          )
          .subscribe()

        return () => {
          mounted = false
          servicesChannel.unsubscribe()
          bookingsChannel.unsubscribe()
        }
      } catch (error) {
        console.error('Failed to setup real-time subscriptions:', error)
      }
    }

    setupRealtime()

    return () => {
      mounted = false
    }
  }, [fetchServicesData, isProvider, userId])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchServicesData(false)
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchServicesData])

  // Filter services
  const filteredServices = useMemo(() => {
    let filtered = services.filter(service => {
      const matchesSearch = searchTerm === '' || 
        (service.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (service.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (service.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (service.providerName || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || service.status === statusFilter
      const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter
      
      const matchesPrice = (() => {
        if (!priceRange.min && !priceRange.max) return true
        const price = service.basePrice
        const min = priceRange.min ? parseFloat(priceRange.min) : 0
        const max = priceRange.max ? parseFloat(priceRange.max) : Infinity
        return price >= min && price <= max
      })()
      
      const matchesRating = (() => {
        if (ratingFilter === 'all') return true
        const rating = service.rating || 0
        switch (ratingFilter) {
          case '5': return rating >= 5
          case '4': return rating >= 4 && rating < 5
          case '3': return rating >= 3 && rating < 4
          default: return true
        }
      })()
      
      const matchesFeatured = !featuredOnly || service.featured
      
      return matchesSearch && matchesStatus && matchesCategory && matchesPrice && matchesRating && matchesFeatured
    })

    // Sort services
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        case 'basePrice':
          aValue = a.basePrice
          bValue = b.basePrice
          break
        case 'title':
          aValue = a.title
          bValue = b.title
          break
        case 'rating':
          aValue = a.rating || 0
          bValue = b.rating || 0
          break
        case 'bookingCount':
          aValue = a.bookingCount || 0
          bValue = b.bookingCount || 0
          break
        default:
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [services, searchTerm, statusFilter, categoryFilter, sortBy, sortOrder, priceRange, ratingFilter, featuredOnly])

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = new Set(services.map(s => s.category).filter(Boolean))
    return Array.from(uniqueCategories).sort()
  }, [services])

  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading services...</p>
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
              {isProvider ? 'My Services' : 'Services Dashboard'}
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
            {isProvider 
              ? 'Manage your services with real-time analytics'
              : 'Browse and book professional services'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button 
            onClick={() => fetchServicesData(false)}
            variant="outline"
            className="border-2"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {isProvider && (
            <Button 
              onClick={() => router.push('/dashboard/provider/create-service')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Service
            </Button>
          )}
        </div>
      </motion.div>

      {/* Last Updated */}
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
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Services</CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-xs opacity-80 mt-2">
                {stats.active} active • {stats.inactive} inactive
              </p>
              <div className="flex items-center mt-3 text-sm">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span>{((stats.active / stats.total) * 100 || 0).toFixed(1)}% active</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-500 to-green-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Bookings</CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalBookings}</div>
              <p className="text-xs opacity-80 mt-2">
                {stats.todayBookings} today • {stats.weeklyBookings} this week
              </p>
              <div className="flex items-center mt-3 text-sm">
                {stats.growthRate >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                <span>{Math.abs(stats.growthRate).toFixed(1)}% vs last period</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {isProvider && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Total Revenue</CardTitle>
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatCurrency(stats.totalRevenue, 'OMR')}
                </div>
                <p className="text-xs opacity-80 mt-2">
                  From all services
                </p>
                <div className="flex items-center mt-3 text-sm">
                  <Target className="h-4 w-4 mr-1" />
                  <span>Avg: {formatCurrency(stats.totalRevenue / stats.totalBookings || 0, 'OMR')}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Avg Rating</CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Star className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.avgRating.toFixed(1)}⭐</div>
              <p className="text-xs opacity-80 mt-2">
                Across all services
              </p>
              <div className="flex items-center mt-3 text-sm">
                <Award className="h-4 w-4 mr-1" />
                <span>Excellence rating</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section - to be continued in next file due to length */}
      
      {/* Services will be rendered here */}
    </div>
  )
}

