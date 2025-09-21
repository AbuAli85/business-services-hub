/**
 * Suggestion Engine
 * Provides intelligent recommendations for services, users, and business insights
 */

export interface ServiceSuggestion {
  id: string
  type: 'service' | 'user' | 'business'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  category: string
  confidence: number // 0-100
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, any>
}

export interface UserSuggestion {
  id: string
  type: 'user_engagement' | 'user_retention' | 'user_growth'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  targetUserId?: string
  targetUserName?: string
  confidence: number
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, any>
}

export interface BusinessSuggestion {
  id: string
  type: 'revenue' | 'efficiency' | 'growth' | 'quality'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  impact: 'high' | 'medium' | 'low'
  effort: 'high' | 'medium' | 'low'
  confidence: number
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, any>
}

export type Suggestion = ServiceSuggestion | UserSuggestion | BusinessSuggestion

class SuggestionEngine {
  private suggestions: Suggestion[] = []
  private lastGenerated: Date | null = null

  // Generate all suggestions based on current data
  generateSuggestions(data: {
    users: any[]
    services: any[]
    bookings: any[]
    invoices: any[]
  }): Suggestion[] {
    this.suggestions = []
    
    // Generate service suggestions
    this.generateServiceSuggestions(data)
    
    // Generate user suggestions
    this.generateUserSuggestions(data)
    
    // Generate business suggestions
    this.generateBusinessSuggestions(data)
    
    // Sort by priority and confidence
    this.suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return b.confidence - a.confidence
    })
    
    this.lastGenerated = new Date()
    return this.suggestions
  }

  private generateServiceSuggestions(data: {
    users: any[]
    services: any[]
    bookings: any[]
    invoices: any[]
  }) {
    const { services, bookings } = data

    // Suggest popular service categories
    const categoryStats = this.analyzeServiceCategories(services, bookings)
    
    // High-demand category suggestion
    const topCategory = categoryStats[0]
    if (topCategory && topCategory.percentage > 30) {
      this.suggestions.push({
        id: 'service-category-demand',
        type: 'service',
        title: `High Demand: ${topCategory.name} Services`,
        description: `${topCategory.name} services represent ${topCategory.percentage.toFixed(1)}% of all bookings. Consider adding more providers in this category.`,
        priority: 'high',
        category: topCategory.name,
        confidence: 85,
        actionUrl: '/dashboard/admin/services',
        actionLabel: 'Manage Services',
        metadata: { category: topCategory.name, percentage: topCategory.percentage }
      })
    }

    // Underperforming services suggestion
    const underperformingServices = services.filter(service => 
      (service.bookingCount || 0) < 2 && service.status === 'active'
    )
    
    if (underperformingServices.length > 0) {
      this.suggestions.push({
        id: 'underperforming-services',
        type: 'service',
        title: 'Underperforming Services Need Attention',
        description: `${underperformingServices.length} services have fewer than 2 bookings. Consider reviewing their descriptions, pricing, or marketing.`,
        priority: 'medium',
        category: 'Performance',
        confidence: 75,
        actionUrl: '/dashboard/admin/services',
        actionLabel: 'Review Services',
        metadata: { count: underperformingServices.length }
      })
    }

    // New service opportunity
    const recentBookings = bookings.filter(booking => 
      new Date(booking.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    )
    
    if (recentBookings.length > 5) {
      this.suggestions.push({
        id: 'new-service-opportunity',
        type: 'service',
        title: 'High Activity - Consider New Services',
        description: `${recentBookings.length} bookings in the last week. This high activity suggests demand for additional service categories.`,
        priority: 'medium',
        category: 'Growth',
        confidence: 70,
        actionUrl: '/dashboard/admin/services',
        actionLabel: 'Add Service',
        metadata: { recentBookings: recentBookings.length }
      })
    }
  }

  private generateUserSuggestions(data: {
    users: any[]
    services: any[]
    bookings: any[]
    invoices: any[]
  }) {
    const { users, bookings } = data

    // Inactive users suggestion
    const inactiveUsers = users.filter(user => {
      const lastActive = new Date(user.lastActive)
      const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceActive > 30 && user.status === 'active'
    })

    if (inactiveUsers.length > 0) {
      this.suggestions.push({
        id: 'inactive-users',
        type: 'user_retention',
        title: 'Re-engage Inactive Users',
        description: `${inactiveUsers.length} users haven't been active in over 30 days. Consider sending re-engagement emails or special offers.`,
        priority: 'high',
        confidence: 90,
        actionUrl: '/dashboard/admin/users',
        actionLabel: 'Manage Users',
        metadata: { inactiveCount: inactiveUsers.length, targetUserId: inactiveUsers[0]?.id, targetUserName: inactiveUsers[0]?.fullName }
      } as UserSuggestion)
    }

    // High-value client suggestion
    const clientBookings = bookings.reduce((acc, booking) => {
      if (!acc[booking.clientId]) {
        acc[booking.clientId] = { count: 0, total: 0, name: booking.clientName }
      }
      acc[booking.clientId].count++
      acc[booking.clientId].total += booking.totalAmount
      return acc
    }, {} as Record<string, { count: number; total: number; name: string }>)

    const highValueClient = Object.entries(clientBookings)
      .sort(([,a], [,b]) => (b as any).total - (a as any).total)[0] as [string, { count: number; total: number; name: string }]

    if (highValueClient && highValueClient[1].total > 1000) {
      this.suggestions.push({
        id: 'high-value-client',
        type: 'user_engagement',
        title: 'High-Value Client Opportunity',
        description: `${highValueClient[1].name} has spent ${highValueClient[1].total} OMR across ${highValueClient[1].count} bookings. Consider offering premium services or loyalty benefits.`,
        priority: 'medium',
        confidence: 80,
        actionUrl: '/dashboard/admin/users',
        actionLabel: 'View Client',
        metadata: { totalSpent: highValueClient[1].total, bookingCount: highValueClient[1].count, targetUserId: highValueClient[0], targetUserName: highValueClient[1].name }
      } as UserSuggestion)
    }

    // New user onboarding
    const newUsers = users.filter(user => {
      const createdDate = new Date(user.createdAt)
      const daysSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceCreated < 7 && user.status === 'active'
    })

    if (newUsers.length > 0) {
      this.suggestions.push({
        id: 'new-user-onboarding',
        type: 'user_growth',
        title: 'New Users Need Onboarding',
        description: `${newUsers.length} new users joined this week. Ensure they have a smooth onboarding experience and understand the platform.`,
        priority: 'high',
        confidence: 95,
        actionUrl: '/dashboard/admin/users',
        actionLabel: 'View New Users',
        metadata: { newUserCount: newUsers.length }
      } as UserSuggestion)
    }
  }

  private generateBusinessSuggestions(data: {
    users: any[]
    services: any[]
    bookings: any[]
    invoices: any[]
  }) {
    const { bookings, invoices } = data

    // Revenue optimization
    const totalRevenue = invoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.amount, 0)

    const pendingRevenue = invoices
      .filter(invoice => invoice.status === 'sent')
      .reduce((sum, invoice) => sum + invoice.amount, 0)

    if (pendingRevenue > totalRevenue * 0.3) {
      this.suggestions.push({
        id: 'revenue-optimization',
        type: 'revenue',
        title: 'Revenue Collection Opportunity',
        description: `You have ${pendingRevenue} OMR in pending invoices (${((pendingRevenue / (totalRevenue + pendingRevenue)) * 100).toFixed(1)}% of total). Implement automated payment reminders to improve cash flow.`,
        priority: 'high',
        impact: 'high',
        effort: 'medium',
        confidence: 85,
        actionUrl: '/dashboard/admin/invoices',
        actionLabel: 'Manage Invoices',
        metadata: { pendingRevenue, totalRevenue }
      } as BusinessSuggestion)
    }

    // Booking completion rate
    const completedBookings = bookings.filter(booking => booking.status === 'completed').length
    const completionRate = bookings.length > 0 ? (completedBookings / bookings.length) * 100 : 0

    if (completionRate < 80) {
      this.suggestions.push({
        id: 'completion-rate-improvement',
        type: 'efficiency',
        title: 'Improve Booking Completion Rate',
        description: `Current completion rate is ${completionRate.toFixed(1)}%. Consider implementing better project management tools or clearer expectations to improve completion rates.`,
        priority: 'medium',
        impact: 'high',
        effort: 'high',
        confidence: 75,
        actionUrl: '/dashboard/admin/bookings',
        actionLabel: 'Review Bookings',
        metadata: { completionRate, totalBookings: bookings.length }
      } as BusinessSuggestion)
    }

    // Growth opportunity
    const monthlyGrowth = this.calculateMonthlyGrowth(bookings)
    
    if (monthlyGrowth > 20) {
      this.suggestions.push({
        id: 'growth-acceleration',
        type: 'growth',
        title: 'Accelerate Growth Momentum',
        description: `You're experiencing ${monthlyGrowth.toFixed(1)}% monthly growth. Consider scaling operations, adding more providers, or expanding service categories to capitalize on this momentum.`,
        priority: 'medium',
        impact: 'high',
        effort: 'high',
        confidence: 80,
        actionUrl: '/dashboard/admin/analytics',
        actionLabel: 'View Analytics',
        metadata: { monthlyGrowth }
      } as BusinessSuggestion)
    }

    // Quality improvement
    const averageRating = this.calculateAverageRating(data.services)
    
    if (averageRating < 4.5) {
      this.suggestions.push({
        id: 'quality-improvement',
        type: 'quality',
        title: 'Enhance Service Quality',
        description: `Average service rating is ${averageRating.toFixed(1)}/5. Consider implementing quality assurance processes, provider training, or customer feedback systems.`,
        priority: 'high',
        impact: 'high',
        effort: 'medium',
        confidence: 90,
        actionUrl: '/dashboard/admin/services',
        actionLabel: 'Review Quality',
        metadata: { averageRating }
      } as BusinessSuggestion)
    }
  }

  private analyzeServiceCategories(services: any[], bookings: any[]) {
    const categoryStats: Record<string, { name: string; count: number; percentage: number; bookings: number }> = {}
    
    services.forEach(service => {
      const category = service.category
      if (!categoryStats[category]) {
        categoryStats[category] = { name: category, count: 0, percentage: 0, bookings: 0 }
      }
      categoryStats[category].count++
    })

    bookings.forEach(booking => {
      const service = services.find(s => s.id === booking.serviceId)
      if (service && categoryStats[service.category]) {
        categoryStats[service.category].bookings++
      }
    })

    // Calculate percentages
    const totalServices = services.length
    Object.values(categoryStats).forEach(category => {
      category.percentage = (category.count / totalServices) * 100
    })

    return Object.values(categoryStats).sort((a, b) => b.bookings - a.bookings)
  }

  private calculateMonthlyGrowth(bookings: any[]): number {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    const currentMonthBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.createdAt)
      return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear
    }).length

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
    
    const lastMonthBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.createdAt)
      return bookingDate.getMonth() === lastMonth && bookingDate.getFullYear() === lastMonthYear
    }).length

    if (lastMonthBookings === 0) return currentMonthBookings > 0 ? 100 : 0
    
    return ((currentMonthBookings - lastMonthBookings) / lastMonthBookings) * 100
  }

  private calculateAverageRating(services: any[]): number {
    const ratedServices = services.filter(service => service.rating && service.rating > 0)
    if (ratedServices.length === 0) return 0
    
    const totalRating = ratedServices.reduce((sum, service) => sum + service.rating, 0)
    return totalRating / ratedServices.length
  }

  // Get suggestions by type
  getSuggestionsByType(type: 'service' | 'user' | 'business'): Suggestion[] {
    return this.suggestions.filter(suggestion => suggestion.type === type)
  }

  // Get high priority suggestions
  getHighPrioritySuggestions(): Suggestion[] {
    return this.suggestions.filter(suggestion => suggestion.priority === 'high')
  }

  // Get all suggestions
  getAllSuggestions(): Suggestion[] {
    return this.suggestions
  }

  // Get suggestion statistics
  getSuggestionStats() {
    const total = this.suggestions.length
    const byPriority = {
      high: this.suggestions.filter(s => s.priority === 'high').length,
      medium: this.suggestions.filter(s => s.priority === 'medium').length,
      low: this.suggestions.filter(s => s.priority === 'low').length
    }
    const byType = {
      service: this.suggestions.filter(s => s.type === 'service').length,
      user: this.suggestions.filter(s => s.type === 'user').length,
      business: this.suggestions.filter(s => s.type === 'business').length
    }

    return {
      total,
      byPriority,
      byType,
      lastGenerated: this.lastGenerated,
      responseRate: total > 0 ? 100 : 0 // Since we always generate suggestions
    }
  }
}

// Export singleton instance
export const suggestionEngine = new SuggestionEngine()
