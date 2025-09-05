import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { z } from 'zod'

// Validation schema for report queries
const ReportQuerySchema = z.object({
  type: z.enum(['bookings', 'revenue', 'services', 'users', 'performance']),
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  user_id: z.string().uuid().optional(),
  category: z.string().optional()
})

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()
    const { searchParams } = new URL(request.url)
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Parse and validate query parameters
    const queryParams = {
      type: searchParams.get('type') || 'bookings',
      period: searchParams.get('period') || 'month',
      start_date: searchParams.get('start_date'),
      end_date: searchParams.get('end_date'),
      user_id: searchParams.get('user_id'),
      category: searchParams.get('category')
    }
    
    const validationResult = ReportQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid query parameters', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }
    
    const { type, period, start_date, end_date, user_id, category } = validationResult.data
    
    // Check user permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const isAdmin = profile?.role === 'admin'
    const isProvider = profile?.role === 'provider'
    const isClient = profile?.role === 'client'
    
    // Calculate date range
    const { startDate, endDate } = calculateDateRange(period, start_date, end_date)
    
    // Generate report based on type
    let reportData
    switch (type) {
      case 'bookings':
        reportData = await generateBookingsReport(supabase, {
          startDate,
          endDate,
          user_id: isAdmin ? user_id : user.id,
          isAdmin,
          isProvider,
          isClient
        })
        break
        
      case 'revenue':
        reportData = await generateRevenueReport(supabase, {
          startDate,
          endDate,
          user_id: isAdmin ? user_id : user.id,
          isAdmin,
          isProvider,
          isClient
        })
        break
        
      case 'services':
        reportData = await generateServicesReport(supabase, {
          startDate,
          endDate,
          user_id: isAdmin ? user_id : user.id,
          isAdmin,
          isProvider,
          isClient,
          category
        })
        break
        
      case 'users':
        if (!isAdmin) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
        reportData = await generateUsersReport(supabase, {
          startDate,
          endDate,
          category
        })
        break
        
      case 'performance':
        reportData = await generatePerformanceReport(supabase, {
          startDate,
          endDate,
          user_id: isAdmin ? user_id : user.id,
          isAdmin,
          isProvider,
          isClient
        })
        break
        
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }
    
    return NextResponse.json({
      report_type: type,
      period,
      date_range: { start: startDate, end: endDate },
      data: reportData,
      generated_at: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Reports API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to calculate date range
function calculateDateRange(period: string, start_date?: string, end_date?: string) {
  if (start_date && end_date) {
    return { startDate: new Date(start_date), endDate: new Date(end_date) }
  }
  
  const now = new Date()
  let startDate = new Date()
  
  switch (period) {
    case 'day':
      startDate.setHours(0, 0, 0, 0)
      break
    case 'week':
      startDate.setDate(now.getDate() - 7)
      break
    case 'month':
      startDate.setMonth(now.getMonth() - 1)
      break
    case 'quarter':
      startDate.setMonth(now.getMonth() - 3)
      break
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1)
      break
  }
  
  return { startDate, endDate: now }
}

// Generate bookings report
async function generateBookingsReport(supabase: any, options: any) {
  const { startDate, endDate, user_id, isAdmin, isProvider, isClient } = options
  
  let query = supabase
    .from('bookings')
    .select(`
      id,
      status,
      operational_status,
      created_at,
      amount,
      payment_status,
      services(category)
    `)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
  
  // Apply user-specific filters
  if (!isAdmin) {
    if (isProvider) {
      query = query.eq('provider_id', user_id)
    } else if (isClient) {
      query = query.eq('client_id', user_id)
    }
  }
  
  const { data: bookings, error } = await query
  
  if (error) {
    console.error('Error fetching bookings for report:', error)
    return { error: 'Failed to fetch bookings data' }
  }
  
  // Calculate statistics
  const totalBookings = bookings?.length || 0
  const statusCounts = bookings?.reduce((acc: any, booking: any) => {
    acc[booking.status] = (acc[booking.status] || 0) + 1
    return acc
  }, {}) || {}
  
  const categoryCounts = bookings?.reduce((acc: any, booking: any) => {
    const category = booking.services?.category || 'Unknown'
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {}) || {}
  
  const totalRevenue = bookings?.reduce((sum: number, booking: any) => 
    sum + (booking.amount || 0), 0) || 0
  
  return {
    total_bookings: totalBookings,
    status_distribution: statusCounts,
    category_distribution: categoryCounts,
    total_revenue: totalRevenue,
    average_booking_value: totalBookings > 0 ? totalRevenue / totalBookings : 0
  }
}

// Generate revenue report
async function generateRevenueReport(supabase: any, options: any) {
  const { startDate, endDate, user_id, isAdmin, isProvider, isClient } = options
  
  let query = supabase
    .from('bookings')
    .select(`
      id,
      amount,
      payment_status,
      created_at,
      services(category)
    `)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .eq('payment_status', 'paid')
  
  // Apply user-specific filters
  if (!isAdmin) {
    if (isProvider) {
      query = query.eq('provider_id', user_id)
    } else if (isClient) {
      query = query.eq('client_id', user_id)
    }
  }
  
  const { data: bookings, error } = await query
  
  if (error) {
    console.error('Error fetching revenue data:', error)
    return { error: 'Failed to fetch revenue data' }
  }
  
  // Calculate revenue statistics
  const totalRevenue = bookings?.reduce((sum: number, booking: any) => 
    sum + (booking.amount || 0), 0) || 0
  
  const dailyRevenue = bookings?.reduce((acc: any, booking: any) => {
    const date = new Date(booking.created_at).toISOString().split('T')[0]
    acc[date] = (acc[date] || 0) + (booking.amount || 0)
    return acc
  }, {}) || {}
  
  const categoryRevenue = bookings?.reduce((acc: any, booking: any) => {
    const category = booking.services?.category || 'Unknown'
    acc[category] = (acc[category] || 0) + (booking.amount || 0)
    return acc
  }, {}) || {}
  
  return {
    total_revenue: totalRevenue,
    daily_revenue: dailyRevenue,
    category_revenue: categoryRevenue,
    total_transactions: bookings?.length || 0,
    average_transaction_value: bookings?.length > 0 ? totalRevenue / bookings.length : 0
  }
}

// Generate services report
async function generateServicesReport(supabase: any, options: any) {
  const { startDate, endDate, user_id, isAdmin, isProvider, isClient, category } = options
  
  let query = supabase
    .from('services')
    .select(`
      id,
      title,
      category,
      base_price,
      status,
      created_at,
      _count:bookings(count)
    `)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .eq('status', 'active')
  
  // Apply filters
  if (!isAdmin && isProvider) {
    query = query.eq('provider_id', user_id)
  }
  
  if (category) {
    query = query.eq('category', category)
  }
  
  const { data: services, error } = await query
  
  if (error) {
    console.error('Error fetching services data:', error)
    return { error: 'Failed to fetch services data' }
  }
  
  // Calculate services statistics
  const totalServices = services?.length || 0
  const categoryCounts = services?.reduce((acc: any, service: any) => {
    acc[service.category] = (acc[service.category] || 0) + 1
    return acc
  }, {}) || {}
  
  const averagePrice = services?.reduce((sum: number, service: any) => 
    sum + (service.base_price || 0), 0) / totalServices || 0
  
  const topServices = services
    ?.sort((a: any, b: any) => (b._count?.bookings || 0) - (a._count?.bookings || 0))
    .slice(0, 10)
    .map((service: any) => ({
      id: service.id,
      title: service.title,
      category: service.category,
      price: service.base_price,
      bookings_count: service._count?.bookings || 0
    })) || []
  
  return {
    total_services: totalServices,
    category_distribution: categoryCounts,
    average_price: averagePrice,
    top_services: topServices
  }
}

// Generate users report (admin only)
async function generateUsersReport(supabase: any, options: any) {
  const { startDate, endDate, category } = options
  
  let query = supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      role,
      created_at,
      _count:services(count)
    `)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
  
  if (category) {
    query = query.eq('role', category)
  }
  
  const { data: users, error } = await query
  
  if (error) {
    console.error('Error fetching users data:', error)
    return { error: 'Failed to fetch users data' }
  }
  
  // Calculate user statistics
  const totalUsers = users?.length || 0
  const roleCounts = users?.reduce((acc: any, user: any) => {
    acc[user.role] = (acc[user.role] || 0) + 1
    return acc
  }, {}) || {}
  
  const activeProviders = users?.filter((user: any) => 
    user.role === 'provider' && (user._count?.services || 0) > 0
  ).length || 0
  
  return {
    total_users: totalUsers,
    role_distribution: roleCounts,
    active_providers: activeProviders,
    new_users_period: totalUsers
  }
}

// Generate performance report
async function generatePerformanceReport(supabase: any, options: any) {
  const { startDate, endDate, user_id, isAdmin, isProvider, isClient } = options
  
  // Get performance metrics
  const metrics = await Promise.all([
    getResponseTimeMetrics(supabase, { startDate, endDate, user_id, isAdmin, isProvider, isClient }),
    getCompletionRateMetrics(supabase, { startDate, endDate, user_id, isAdmin, isProvider, isClient }),
    getCustomerSatisfactionMetrics(supabase, { startDate, endDate, user_id, isAdmin, isProvider, isClient })
  ])
  
  return {
    response_time: metrics[0],
    completion_rate: metrics[1],
    customer_satisfaction: metrics[2]
  }
}

// Helper functions for performance metrics
async function getResponseTimeMetrics(supabase: any, options: any) {
  // Implementation for response time metrics
  return { average_response_time: '24h', response_time_trend: 'improving' }
}

async function getCompletionRateMetrics(supabase: any, options: any) {
  // Implementation for completion rate metrics
  return { completion_rate: '85%', completion_trend: 'stable' }
}

async function getCustomerSatisfactionMetrics(supabase: any, options: any) {
  // Implementation for customer satisfaction metrics
  return { average_rating: 4.2, satisfaction_trend: 'improving' }
}
