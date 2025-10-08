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
      console.log('🔍 Attempting RPC function for provider stats:', providerId)
      
      // Try RPC function first
      const { data, error } = await supabase
        .rpc('get_provider_dashboard', { pid: providerId })
        .single()
      
      if (error) {
        console.warn('RPC function failed, falling back to direct queries:', error)
        return await this.getDashboardStatsFallback(providerId)
      }
      
      console.log('✅ RPC function succeeded, returning data:', data)
      return data as ProviderDashboardStats
    } catch (error) {
      console.warn('RPC function failed with exception, falling back to direct queries:', error)
      return await this.getDashboardStatsFallback(providerId)
    }
  }

  private static async getDashboardStatsFallback(providerId: string): Promise<ProviderDashboardStats> {
    const supabase = await getSupabaseClient()
    
    try {
      // Get bookings data with all possible amount fields
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('total_amount, amount, total_price, created_at, status, approval_status')
        .eq('provider_id', providerId)
      
      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError)
      }
      
      // Get services data for this provider
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id, status')
        .eq('provider_id', providerId)
      
      if (servicesError) {
        console.error('Error fetching services:', servicesError)
      }
      
      // Get reviews data
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', providerId)
      
      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError)
      }
      
      // Helper function to get amount from booking (try multiple fields)
      const getBookingAmount = (booking: any) => {
        return booking.total_amount || booking.amount || booking.total_price || 0
      }
      
      // Calculate stats with proper error handling
      const totalEarnings = bookings?.reduce((sum, b) => sum + getBookingAmount(b), 0) || 0
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      
      const monthlyEarnings = bookings?.filter(b => {
        const bookingDate = new Date(b.created_at)
        return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear
      }).reduce((sum, b) => sum + getBookingAmount(b), 0) || 0
      
      // Count active bookings (not cancelled, not draft)
      const activeBookings = bookings?.filter(b => 
        b.status !== 'cancelled' && 
        b.status !== 'draft' && 
        b.approval_status !== 'cancelled'
      ).length || 0
      
      const activeServices = services?.filter(s => s.status === 'active').length || 0
      const avgRating = reviews?.length ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length : 0
      
      // Response rate: bookings that have been responded to (not pending)
      const responseRate = bookings?.length ? 
        bookings.filter(b => b.status !== 'pending' && b.approval_status !== 'pending').length / bookings.length : 0
      
      // Completion rate: include multiple completion statuses
      const completionRate = bookings?.length ? 
        bookings.filter(b => 
          b.status === 'completed' || 
          b.status === 'delivered' || 
          b.status === 'finished' ||
          b.approval_status === 'completed'
        ).length / bookings.length : 0
      
      // Calculate monthly growth (compare current month to previous month)
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear
      
      const previousMonthEarnings = bookings?.filter(b => {
        const bookingDate = new Date(b.created_at)
        return bookingDate.getMonth() === previousMonth && bookingDate.getFullYear() === previousYear
      }).reduce((sum, b) => sum + getBookingAmount(b), 0) || 0
      
      const monthlyGrowth = previousMonthEarnings > 0 ? 
        ((monthlyEarnings - previousMonthEarnings) / previousMonthEarnings) * 100 : 
        (monthlyEarnings > 0 ? 100 : 0) // If no previous month but current month has earnings, show 100% growth
      
      console.log('📊 Dashboard stats calculated:', {
        totalEarnings,
        monthlyEarnings,
        activeBookings,
        completionRate,
        bookingsCount: bookings?.length || 0
      })
      
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
    } catch (error) {
      console.error('Error in getDashboardStatsFallback:', error)
      // Return default values on error
      return {
        total_earnings: 0,
        monthly_earnings: 0,
        active_bookings: 0,
        active_services: 0,
        avg_rating: 0,
        response_rate: 0,
        completion_rate: 0,
        monthly_growth: 0
      }
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
    
    // Get client and service details for each booking
    const enrichedBookings = await Promise.all(bookings.map(async (booking) => {
      // Get client details
      const { data: clientData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', booking.client_id)
        .single()

      // Get service details
      const { data: serviceData } = await supabase
        .from('services')
        .select('title')
        .eq('id', booking.service_id)
        .single()

      // Get milestone count
      const { count: milestoneCount } = await supabase
        .from('milestones')
        .select('*', { count: 'exact', head: true })
        .eq('booking_id', booking.id)

      // Get completed milestone count
      const { count: completedMilestoneCount } = await supabase
        .from('milestones')
        .select('*', { count: 'exact', head: true })
        .eq('booking_id', booking.id)
        .eq('status', 'completed')

      return {
        id: booking.id,
        title: booking.title || 'Untitled Booking',
        description: booking.description || '',
        status: booking.status || 'pending',
        scheduled_date: booking.start_time ? new Date(booking.start_time).toISOString() : '',
        end_date: booking.end_time ? new Date(booking.end_time).toISOString() : '',
        total_amount: booking.total_amount || 0,
        currency: booking.currency || 'OMR',
        created_at: booking.created_at,
        client_name: clientData?.full_name || 'Unknown Client',
        client_email: clientData?.email || '',
        client_id: booking.client_id || '',
        provider_id: booking.provider_id || '',
        service_title: serviceData?.title || 'Unknown Service',
        milestone_count: milestoneCount || 0,
        completed_milestones: completedMilestoneCount || 0
      }
    }))

    return enrichedBookings
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
      .eq('provider_id', providerId)
      .limit(limit)
    
    if (!services) return []
    
    // Enrich services with real booking and earnings data
    const enrichedServices = await Promise.all(services.map(async (service) => {
      // Get booking count for this service
      const { count: bookingCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', service.id)

      // Get total earnings from bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('total_amount')
        .eq('service_id', service.id)
        .in('status', ['completed', 'delivered'])

      const totalEarnings = bookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0

      // Get average rating from reviews
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('service_id', service.id)

      const avgRating = reviews?.length ? 
        reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length : 0

      // Calculate completion rate
      const { count: completedBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', service.id)
        .in('status', ['completed', 'delivered'])

      const completionRate = bookingCount && bookingCount > 0 ? 
        (completedBookings || 0) / bookingCount : 0

      return {
        id: service.id,
        title: service.title || 'Untitled Service',
        description: service.description || '',
        price: service.price || 0,
        currency: service.currency || 'OMR',
        status: service.status || 'inactive',
        booking_count: bookingCount || 0,
        total_earnings: totalEarnings,
        avg_rating: avgRating,
        completion_rate: completionRate
      }
    }))

    return enrichedServices
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
    
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('total_amount, amount, total_price, created_at')
        .eq('provider_id', providerId)
        .gte('created_at', new Date(Date.now() - monthsBack * 30 * 24 * 60 * 60 * 1000).toISOString())
      
      if (error) {
        console.error('Error fetching monthly earnings:', error)
        return []
      }
      
      if (!bookings) return []
      
      // Helper function to get amount from booking (try multiple fields)
      const getBookingAmount = (booking: any) => {
        return booking.total_amount || booking.amount || booking.total_price || 0
      }
      
      // Group by month
      const monthlyData = new Map<string, { earnings: number; count: number }>()
      
      bookings.forEach(booking => {
        const date = new Date(booking.created_at)
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { earnings: 0, count: 0 })
        }
        
        const data = monthlyData.get(monthKey)!
        data.earnings += getBookingAmount(booking)
        data.count += 1
      })
      
      return Array.from(monthlyData.entries()).map(([month_year, data]) => ({
        month_year,
        earnings: data.earnings,
        booking_count: data.count
      })).sort((a, b) => new Date(a.month_year).getTime() - new Date(b.month_year).getTime())
    } catch (error) {
      console.error('Error in getMonthlyEarningsFallback:', error)
      return []
    }
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

      console.log('✅ Provider dashboard service: Data loaded successfully', {
        stats: result.stats,
        recentBookingsCount: result.recentBookings.length,
        topServicesCount: result.topServices.length,
        monthlyEarningsCount: result.monthlyEarnings.length
      })
      return result
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error)
      
      // Log which specific operations failed
      const [statsResult, recentBookingsResult, topServicesResult, monthlyEarningsResult] = await Promise.allSettled([
        this.getDashboardStats(providerId),
        this.getRecentBookings(providerId, 5),
        this.getTopServices(providerId, 3),
        this.getMonthlyEarnings(providerId, 6)
      ])
      
      console.error('Individual operation results:', {
        stats: statsResult.status,
        recentBookings: recentBookingsResult.status,
        topServices: topServicesResult.status,
        monthlyEarnings: monthlyEarningsResult.status
      })
      
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
