// Edge Functions Integration Utility
// Provides centralized access to all Edge Functions with monitoring and error handling

import { getSupabaseClient } from './supabase'

export interface EdgeFunctionResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  details?: string[]
  timestamp: string
  functionName: string
  action: string
  duration?: number
}

export interface MonitoringEvent {
  functionName: string
  action: string
  success: boolean
  duration: number
  timestamp: string
  error?: string
  userId?: string
  userRole?: string
}

class EdgeFunctionManager {
  private baseUrl: string
  private monitoringEvents: MonitoringEvent[] = []
  private isMonitoringEnabled: boolean = true

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '') || ''
    // Ensure monitoringEvents is always initialized
    this.monitoringEvents = []
  }

  // Enable/disable monitoring
  setMonitoringEnabled(enabled: boolean) {
    this.isMonitoringEnabled = enabled
  }

  // Get monitoring events
  getMonitoringEvents(): MonitoringEvent[] {
    if (!this.monitoringEvents) {
      this.monitoringEvents = []
    }
    return [...this.monitoringEvents]
  }

  // Clear monitoring events
  clearMonitoringEvents() {
    if (!this.monitoringEvents) {
      this.monitoringEvents = []
    }
    this.monitoringEvents = []
  }

  // Record monitoring event
  private recordEvent(event: Omit<MonitoringEvent, 'timestamp'>) {
    if (!this.isMonitoringEnabled) return

    // Ensure monitoringEvents is initialized
    if (!this.monitoringEvents) {
      this.monitoringEvents = []
    }

    const monitoringEvent: MonitoringEvent = {
      ...event,
      timestamp: new Date().toISOString()
    }

    this.monitoringEvents.push(monitoringEvent)
    
    // Keep only last 100 events
    if (this.monitoringEvents.length > 100) {
      this.monitoringEvents = this.monitoringEvents.slice(-100)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Edge Function Event:', monitoringEvent)
    }
  }

  // Get access token from session
  private async getAccessToken(): Promise<string> {
    const supabase = await getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('No access token found. Please log in again.')
    }
    
    return session.access_token
  }

  // Generic Edge Function caller
  async callFunction<T = any>(
    functionName: string,
    action: string,
    data: any = {},
    options: { timeout?: number; retries?: number } = {}
  ): Promise<EdgeFunctionResponse<T>> {
    const startTime = Date.now()
    const { timeout = 10000, retries = 1 } = options

    try {
      const accessToken = await this.getAccessToken()
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(`${this.baseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ action, ...data }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const duration = Date.now() - startTime

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const error = errorData.error || `HTTP ${response.status}: ${response.statusText}`
        
        this.recordEvent({
          functionName,
          action,
          success: false,
          duration,
          error
        })

        return {
          success: false,
          error,
          details: errorData.details,
          timestamp: new Date().toISOString(),
          functionName,
          action,
          duration
        }
      }

      const result = await response.json()
      
      this.recordEvent({
        functionName,
        action,
        success: true,
        duration
      })

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        functionName,
        action,
        duration
      }

    } catch (error: any) {
      const duration = Date.now() - startTime
      const errorMessage = error.name === 'AbortError' 
        ? 'Request timeout' 
        : error.message || 'Unknown error'

      this.recordEvent({
        functionName,
        action,
        success: false,
        duration,
        error: errorMessage
      })

      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        functionName,
        action,
        duration
      }
    }
  }

  // Service Management Functions
  async createService(serviceData: any): Promise<EdgeFunctionResponse> {
    return this.callFunction('service-manager', 'services', { data: serviceData })
  }

  async getServices(filters?: any): Promise<EdgeFunctionResponse> {
    return this.callFunction('service-manager', 'services', { filters })
  }

  async updateService(serviceId: string, updateData: any): Promise<EdgeFunctionResponse> {
    return this.callFunction('service-manager', 'service', { id: serviceId, ...updateData })
  }

  async deleteService(serviceId: string): Promise<EdgeFunctionResponse> {
    return this.callFunction('service-manager', 'service', { id: serviceId })
  }

  // Booking Management Functions
  async createBooking(bookingData: any): Promise<EdgeFunctionResponse> {
    return this.callFunction('booking-manager', 'bookings', { data: bookingData })
  }

  async getBookings(filters?: any): Promise<EdgeFunctionResponse> {
    return this.callFunction('booking-manager', 'bookings', { filters })
  }

  async updateBookingStatus(bookingId: string, status: string): Promise<EdgeFunctionResponse> {
    return this.callFunction('booking-manager', 'status', { id: bookingId, status })
  }

  async getBookingWorkflow(bookingId: string): Promise<EdgeFunctionResponse> {
    return this.callFunction('booking-manager', 'workflow', { id: bookingId })
  }

  // Authentication & User Management Functions
  async getUserProfile(): Promise<EdgeFunctionResponse> {
    return this.callFunction('auth-manager', 'profile')
  }

  async updateUserProfile(profileData: any): Promise<EdgeFunctionResponse> {
    return this.callFunction('auth-manager', 'profile', profileData)
  }

  async getUserRole(): Promise<EdgeFunctionResponse> {
    return this.callFunction('auth-manager', 'role')
  }

  async getUserPermissions(): Promise<EdgeFunctionResponse> {
    return this.callFunction('auth-manager', 'permissions')
  }

  // Communication Functions
  async sendMessage(messageData: any): Promise<EdgeFunctionResponse> {
    return this.callFunction('communication-hub', 'messages', { data: messageData })
  }

  async getConversations(): Promise<EdgeFunctionResponse> {
    return this.callFunction('communication-hub', 'conversations')
  }

  async sendNotification(notificationData: any): Promise<EdgeFunctionResponse> {
    return this.callFunction('communication-hub', 'send-notification', { data: notificationData })
  }

  // Analytics Functions
  async getDashboardAnalytics(): Promise<EdgeFunctionResponse> {
    return this.callFunction('analytics-engine', 'dashboard')
  }

  async getRevenueAnalytics(filters?: any): Promise<EdgeFunctionResponse> {
    return this.callFunction('analytics-engine', 'revenue', { filters })
  }

  async getPerformanceMetrics(): Promise<EdgeFunctionResponse> {
    return this.callFunction('analytics-engine', 'performance')
  }

  // Health Check
  async healthCheck(): Promise<{ [key: string]: boolean }> {
    const functions = [
      'auth-manager',
      'service-manager', 
      'booking-manager',
      'communication-hub',
      'analytics-engine'
    ]

    const results: { [key: string]: boolean } = {}
    
    for (const func of functions) {
      try {
        const result = await this.callFunction(func, 'health', {}, { timeout: 5000 })
        results[func] = result.success
      } catch {
        results[func] = false
      }
    }

    return results
  }

  // Get performance statistics
  getPerformanceStats() {
    // Ensure we're accessing the instance property
    if (!this.monitoringEvents) {
      this.monitoringEvents = []
    }
    
    const events = this.monitoringEvents
    const totalCalls = events.length
    const successfulCalls = events.filter(e => e.success).length
    const failedCalls = totalCalls - successfulCalls
    const avgDuration = events.reduce((sum, e) => sum + e.duration, 0) / totalCalls || 0

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      successRate: totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0,
      averageDuration: Math.round(avgDuration),
      recentEvents: events.slice(-10)
    }
  }
}

// Export singleton instance
export const edgeFunctions = new EdgeFunctionManager()

// Export individual functions for convenience - bind them to the instance
export const {
  createService,
  getServices,
  updateService,
  deleteService,
  createBooking,
  getBookings,
  updateBookingStatus,
  getBookingWorkflow,
  getUserProfile,
  updateUserProfile,
  getUserRole,
  getUserPermissions,
  sendMessage,
  getConversations,
  sendNotification,
  getDashboardAnalytics,
  getRevenueAnalytics,
  getPerformanceMetrics,
  healthCheck
} = edgeFunctions

// Export methods that need to maintain 'this' context
export const getPerformanceStats = edgeFunctions.getPerformanceStats.bind(edgeFunctions)
export const getMonitoringEvents = edgeFunctions.getMonitoringEvents.bind(edgeFunctions)
export const clearMonitoringEvents = edgeFunctions.clearMonitoringEvents.bind(edgeFunctions)
export const setMonitoringEnabled = edgeFunctions.setMonitoringEnabled.bind(edgeFunctions)
