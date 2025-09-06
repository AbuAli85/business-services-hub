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
  start_date: string
  end_date: string
  total_amount: number
  currency: string
  created_at: string
  client_name: string
  client_email: string
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
    
    const { data, error } = await supabase
      .rpc('get_provider_dashboard', { pid: providerId })
      .single()
    
    if (error) {
      console.error('Error fetching dashboard stats:', error)
      throw error
    }
    
    return data
  }

  static async getRecentBookings(providerId: string, limit: number = 10): Promise<RecentBooking[]> {
    const supabase = await getSupabaseClient()
    
    const { data, error } = await supabase
      .rpc('get_provider_recent_bookings', { 
        pid: providerId, 
        limit_count: limit 
      })
    
    if (error) {
      console.error('Error fetching recent bookings:', error)
      throw error
    }
    
    return data || []
  }

  static async getTopServices(providerId: string, limit: number = 5): Promise<TopService[]> {
    const supabase = await getSupabaseClient()
    
    const { data, error } = await supabase
      .rpc('get_provider_top_services', { 
        pid: providerId, 
        limit_count: limit 
      })
    
    if (error) {
      console.error('Error fetching top services:', error)
      throw error
    }
    
    return data || []
  }

  static async getMonthlyEarnings(providerId: string, monthsBack: number = 12): Promise<MonthlyEarnings[]> {
    const supabase = await getSupabaseClient()
    
    const { data, error } = await supabase
      .rpc('get_provider_monthly_earnings', { 
        pid: providerId, 
        months_back: monthsBack 
      })
    
    if (error) {
      console.error('Error fetching monthly earnings:', error)
      throw error
    }
    
    return data || []
  }

  static async getAllDashboardData(providerId: string) {
    try {
      const [stats, recentBookings, topServices, monthlyEarnings] = await Promise.all([
        this.getDashboardStats(providerId),
        this.getRecentBookings(providerId, 10),
        this.getTopServices(providerId, 5),
        this.getMonthlyEarnings(providerId, 12)
      ])

      return {
        stats,
        recentBookings,
        topServices,
        monthlyEarnings
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      throw error
    }
  }
}
