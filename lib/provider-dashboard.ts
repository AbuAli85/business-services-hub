import { getSupabaseClient } from './supabase'

export interface ProviderDashboardStats {
  total_earnings: number
  monthly_earnings: number
  active_bookings: number
  active_services: number
  avg_rating: number
  response_rate: number
  completion_rate: number
  monthly_growth: number
}

export interface RecentBooking {
  id: string
  title: string
  description: string
  status: string
  scheduled_date: string
  end_date: string
  total_amount: number
  currency: string
  created_at: string
  client_name: string
  client_email: string
  client_id: string
  provider_id: string
  service_title: string
  milestone_count: number
  completed_milestones: number
}

export interface TopService {
  id: string
  title: string
  description: string
  price: number
  currency: string
  status: string
  booking_count: number
  total_earnings: number
  avg_rating: number
  completion_rate: number
}

export interface MonthlyEarnings {
  month_year: string
  earnings: number
  booking_count: number
}

export class ProviderDashboardService {
  static async getDashboardStats(providerId: string): Promise<ProviderDashboardStats> {
    const supabase = await getSupabaseClient()
    
    try {
      // Try RPC function first
      const { data, error } = await supabase
        .rpc('get_provider_dashboard', { pid: providerId })
        .single()
      
      if (error) {
        console.warn('RPC function failed, falling back to direct queries:', error)
        return await this.getDashboardStatsFallback(providerId)
      }
      
      return data as ProviderDashboardStats
    } catch (error) {
      console.warn('RPC function failed, falling back to direct queries:', error)
      return await this.getDashboardStatsFallback(providerId)
    }
  }

  private static async getDashboardStatsFallback(providerId: string): Promise<ProviderDashboardStats> {
    const supabase = await getSupabaseClient()
    
    // Get bookings data
    const { data: bookings } = await supabase
      .from('bookings')
      .select('total_amount, created_at, status')
      .eq('provider_id', providerId)
    
    // Get services data
    const { data: services } = await supabase
      .from('services')
      .select('id, status')
    
    // Get reviews data
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('provider_id', providerId)
    
    // Calculate stats
    const totalEarnings = bookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    const monthlyEarnings = bookings?.filter(b => {
      const bookingDate = new Date(b.created_at)
      return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear
    }).reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0
    
    const activeBookings = bookings?.filter(b => b.status !== 'cancelled').length || 0
    const activeServices = services?.filter(s => s.status === 'active').length || 0
    const avgRating = reviews?.length ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length : 0
    
    const responseRate = bookings?.length ? 
      bookings.filter(b => b.status !== 'pending').length / bookings.length : 0
    
    const completionRate = bookings?.length ? 
      bookings.filter(b => b.status === 'completed').length / bookings.length : 0
    
    // Calculate monthly growth (simplified - compare current month to previous month)
    const currentMonthEarnings = monthlyEarnings
    const previousMonthEarnings = 0 // This would need to be calculated from previous month data
    const monthlyGrowth = previousMonthEarnings > 0 ? 
      ((currentMonthEarnings - previousMonthEarnings) / previousMonthEarnings) * 100 : 0
    
    return {
      total_earnings: totalEarnings,
      monthly_earnings: monthlyEarnings,
      active_bookings: activeBookings,
      active_services: activeServices,
      avg_rating: avgRating,
      response_rate: responseRate,
      completion_rate: completionRate,
      monthly_growth: monthlyGrowth
    }
  }

  static async getRecentBookings(providerId: string, limit: number = 10): Promise<RecentBooking[]> {
    const supabase = await getSupabaseClient()
    
    try {
      const { data, error } = await supabase
        .rpc('get_provider_recent_bookings', { 
          pid: providerId, 
          limit_count: limit 
        })
      
      if (error) {
        console.warn('RPC function failed, falling back to direct queries:', error)
        return await this.getRecentBookingsFallback(providerId, limit)
      }
      
      return (data || []) as RecentBooking[]
    } catch (error) {
      console.warn('RPC function failed, falling back to direct queries:', error)
      return await this.getRecentBookingsFallback(providerId, limit)
    }
  }

  private static async getRecentBookingsFallback(providerId: string, limit: number): Promise<RecentBooking[]> {
    const supabase = await getSupabaseClient()
    
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        id,
        title,
        description,
        status,
        start_time,
        end_time,
        total_amount,
        currency,
        created_at,
        client_id,
        provider_id,
        service_id
      `)
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (!bookings) return []
    
    return bookings.map(booking => ({
      id: booking.id,
      title: booking.title || 'Untitled Booking',
      description: booking.description || '',
      status: booking.status || 'pending',
      scheduled_date: booking.start_time ? new Date(booking.start_time).toISOString() : '',
      end_date: booking.end_time ? new Date(booking.end_time).toISOString() : '',
      total_amount: booking.total_amount || 0,
      currency: booking.currency || 'OMR',
      created_at: booking.created_at,
      client_name: 'Client', // Simplified for now
      client_email: 'client@example.com',
      client_id: booking.client_id || '',
      provider_id: booking.provider_id || '',
      service_title: 'Service', // Simplified for now
      milestone_count: 0, // Will be populated separately if needed
      completed_milestones: 0
    }))
  }

  static async getTopServices(providerId: string, limit: number = 5): Promise<TopService[]> {
    const supabase = await getSupabaseClient()
    
    try {
      const { data, error } = await supabase
        .rpc('get_provider_top_services', { 
          pid: providerId, 
          limit_count: limit 
        })
      
      if (error) {
        console.warn('RPC function failed, falling back to direct queries:', error)
        return await this.getTopServicesFallback(providerId, limit)
      }
      
      return (data || []) as TopService[]
    } catch (error) {
      console.warn('RPC function failed, falling back to direct queries:', error)
      return await this.getTopServicesFallback(providerId, limit)
    }
  }

  private static async getTopServicesFallback(providerId: string, limit: number): Promise<TopService[]> {
    const supabase = await getSupabaseClient()
    
    const { data: services } = await supabase
      .from('services')
      .select(`
        id,
        title,
        description,
        price,
        currency,
        status
      `)
      .limit(limit)
    
    if (!services) return []
    
    return services.map(service => ({
      id: service.id,
      title: service.title || 'Untitled Service',
      description: service.description || '',
      price: service.price || 0,
      currency: service.currency || 'OMR',
      status: service.status || 'inactive',
      booking_count: 0, // Will be populated separately if needed
      total_earnings: 0,
      avg_rating: 0,
      completion_rate: 0
    }))
  }

  static async getMonthlyEarnings(providerId: string, monthsBack: number = 12): Promise<MonthlyEarnings[]> {
    const supabase = await getSupabaseClient()
    
    try {
      const { data, error } = await supabase
        .rpc('get_provider_monthly_earnings', { 
          pid: providerId, 
          months_back: monthsBack 
        })
      
      if (error) {
        console.warn('RPC function failed, falling back to direct queries:', error)
        return await this.getMonthlyEarningsFallback(providerId, monthsBack)
      }
      
      return (data || []) as MonthlyEarnings[]
    } catch (error) {
      console.warn('RPC function failed, falling back to direct queries:', error)
      return await this.getMonthlyEarningsFallback(providerId, monthsBack)
    }
  }

  private static async getMonthlyEarningsFallback(providerId: string, monthsBack: number): Promise<MonthlyEarnings[]> {
    const supabase = await getSupabaseClient()
    
    const { data: bookings } = await supabase
      .from('bookings')
      .select('total_amount, created_at')
      .eq('provider_id', providerId)
      .gte('created_at', new Date(Date.now() - monthsBack * 30 * 24 * 60 * 60 * 1000).toISOString())
    
    if (!bookings) return []
    
    // Group by month
    const monthlyData = new Map<string, { earnings: number; count: number }>()
    
    bookings.forEach(booking => {
      const date = new Date(booking.created_at)
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { earnings: 0, count: 0 })
      }
      
      const data = monthlyData.get(monthKey)!
      data.earnings += booking.total_amount || 0
      data.count += 1
    })
    
    return Array.from(monthlyData.entries()).map(([month_year, data]) => ({
      month_year,
      earnings: data.earnings,
      booking_count: data.count
    })).sort((a, b) => new Date(a.month_year).getTime() - new Date(b.month_year).getTime())
  }

  static async getAllDashboardData(providerId: string) {
    try {
      console.log('📊 Provider dashboard service: Loading all data for', providerId)
      
      // Add individual timeouts to each query to prevent one slow query from blocking everything
      const timeoutPromise = (promise: Promise<any>, name: string, timeoutMs: number) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`${name} timeout after ${timeoutMs}ms`)), timeoutMs)
          )
        ])
      }
      
      // Use shorter timeouts for faster loading
      const [stats, recentBookings, topServices, monthlyEarnings] = await Promise.allSettled([
        timeoutPromise(this.getDashboardStats(providerId), 'Stats', 3000),
        timeoutPromise(this.getRecentBookings(providerId, 5), 'Recent Bookings', 3000), // Reduced limit
        timeoutPromise(this.getTopServices(providerId, 3), 'Top Services', 3000), // Reduced limit
        timeoutPromise(this.getMonthlyEarnings(providerId, 6), 'Monthly Earnings', 3000) // Reduced months
      ])

      // Extract values from settled promises, using defaults if failed
      const defaultStats: ProviderDashboardStats = {
        total_earnings: 0,
        monthly_earnings: 0,
        active_bookings: 0,
        active_services: 0,
        avg_rating: 0,
        response_rate: 0,
        completion_rate: 0,
        monthly_growth: 0
      }

      const result = {
        stats: stats.status === 'fulfilled' ? stats.value : defaultStats,
        recentBookings: recentBookings.status === 'fulfilled' ? recentBookings.value : [],
        topServices: topServices.status === 'fulfilled' ? topServices.value : [],
        monthlyEarnings: monthlyEarnings.status === 'fulfilled' ? monthlyEarnings.value : []
      }

      console.log('✅ Provider dashboard service: Data loaded successfully')
      return result
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error)
      // Return empty data instead of throwing
      return {
        stats: {
          total_earnings: 0,
          monthly_earnings: 0,
          active_bookings: 0,
          active_services: 0,
          avg_rating: 0,
          response_rate: 0,
          completion_rate: 0,
          monthly_growth: 0
        },
        recentBookings: [],
        topServices: [],
        monthlyEarnings: []
      }
    }
  }
}
