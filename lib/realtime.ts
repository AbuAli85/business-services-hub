import { getSupabaseClient } from './supabase'

export interface Notification {
  id: string
  user_id: string
  type: 'booking' | 'payment' | 'message' | 'system'
  title: string
  message: string
  metadata?: any
  priority: 'low' | 'normal' | 'high'
  read: boolean
  created_at: string
}

export interface BookingUpdate {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: any
  old?: any
}

export interface MessageUpdate {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: any
  old?: any
}

export class RealtimeManager {
  private supabase: any = null
  private subscriptions: Map<string, any> = new Map()
  private listeners: Map<string, Set<Function>> = new Map()
  private initialized: boolean = false

  constructor() {
    // Initialize will be called when first needed
  }

  // Initialize the Supabase client
  private async initialize() {
    if (this.initialized) return
    
    try {
      this.supabase = await getSupabaseClient()
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize Supabase client for realtime:', error)
      throw error
    }
  }

  // Subscribe to notifications for a specific user
  async subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    await this.initialize()
    
    const channelKey = `notifications:${userId}`
    
    if (this.subscriptions.has(channelKey)) {
      this.subscriptions.get(channelKey).unsubscribe()
    }

    try {
      const subscription = this.supabase
        .channel(channelKey)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notifications',
            filter: `user_id = '${userId}'`
          },
          (payload: any) => {
            callback(payload.new as Notification)
          }
        )
        .subscribe()

      this.subscriptions.set(channelKey, subscription)
      return subscription
    } catch (error) {
      console.error('Failed to subscribe to notifications:', error)
      throw error
    }
  }

  // Subscribe to booking updates for a specific user
  async subscribeToBookings(userId: string, callback: (update: BookingUpdate) => void) {
    await this.initialize()
    
    const channelKey = `bookings:${userId}`
    
    if (this.subscriptions.has(channelKey)) {
      this.subscriptions.get(channelKey).unsubscribe()
    }

    try {
      const subscription = this.supabase
        .channel(channelKey)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'bookings',
            filter: `client_id = '${userId}' OR provider_id = '${userId}'`
          },
          (payload: any) => {
            callback({
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old
            })
          }
        )
        .subscribe()

      this.subscriptions.set(channelKey, subscription)
      return subscription
    } catch (error) {
      console.error('Failed to subscribe to bookings:', error)
      throw error
    }
  }

  // Subscribe to message updates for a specific user
  async subscribeToMessages(userId: string, callback: (update: MessageUpdate) => void) {
    await this.initialize()
    
    const channelKey = `messages:${userId}`
    
    if (this.subscriptions.has(channelKey)) {
      this.subscriptions.get(channelKey).unsubscribe()
    }

    try {
      const subscription = this.supabase
        .channel(channelKey)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'messages',
            filter: `sender_id = '${userId}' OR receiver_id = '${userId}'`
          },
          (payload: any) => {
            callback({
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old
            })
          }
        )
        .subscribe()

      this.subscriptions.set(channelKey, subscription)
      return subscription
    } catch (error) {
      console.error('Failed to subscribe to messages:', error)
      throw error
    }
  }

  // Subscribe to service updates for a specific provider
  async subscribeToServices(providerId: string, callback: (update: any) => void) {
    await this.initialize()
    
    const channelKey = `services:${providerId}`
    
    if (this.subscriptions.has(channelKey)) {
      this.subscriptions.get(channelKey).unsubscribe()
    }

    try {
      const subscription = this.supabase
        .channel(channelKey)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'services',
            filter: `provider_id = '${providerId}'`
          },
          (payload: any) => {
            callback(payload)
          }
        )
        .subscribe()

      this.subscriptions.set(channelKey, subscription)
      return subscription
    } catch (error) {
      console.error('Failed to subscribe to services:', error)
      throw error
    }
  }

  // Subscribe to payment updates
  async subscribeToPayments(userId: string, callback: (update: any) => void) {
    await this.initialize()
    
    const channelKey = `payments:${userId}`
    
    if (this.subscriptions.has(channelKey)) {
      this.subscriptions.get(channelKey).unsubscribe()
    }

    try {
      const subscription = this.supabase
        .channel(channelKey)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'payments',
            filter: `booking_id IN (SELECT id FROM bookings WHERE client_id = '${userId}' OR provider_id = '${userId}')`
          },
          (payload: any) => {
            callback(payload)
          }
        )
        .subscribe()

      this.subscriptions.set(channelKey, subscription)
      return subscription
    } catch (error) {
      console.error('Failed to subscribe to payments:', error)
      throw error
    }
  }

  // Subscribe to service suggestions for a specific user
  async subscribeToServiceSuggestions(userId: string, callback: (update: any) => void) {
    await this.initialize()
    
    const channelKey = `suggestions:${userId}`
    
    if (this.subscriptions.has(channelKey)) {
      this.subscriptions.get(channelKey).unsubscribe()
    }

    try {
      const subscription = this.supabase
        .channel(channelKey)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'service_suggestions',
            filter: `client_id = '${userId}' OR provider_id = '${userId}'`
          },
          (payload: any) => {
            callback({
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old
            })
          }
        )
        .subscribe()

      this.subscriptions.set(channelKey, subscription)
      return subscription
    } catch (error) {
      console.error('Failed to subscribe to service suggestions:', error)
      throw error
    }
  }

  // Add event listener for a specific event type
  addEventListener(eventType: string, callback: Function) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(callback)
  }

  // Remove event listener
  removeEventListener(eventType: string, callback: Function) {
    const listeners = this.listeners.get(eventType)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  // Emit event to all listeners
  private emit(eventType: string, data: any) {
    const listeners = this.listeners.get(eventType)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  // Unsubscribe from a specific channel
  unsubscribe(channel: string) {
    const subscription = this.subscriptions.get(channel)
    if (subscription) {
      subscription.unsubscribe()
      this.subscriptions.delete(channel)
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe())
    this.subscriptions.clear()
    this.listeners.clear()
  }

  // Get subscription status
  isSubscribed(channel: string): boolean {
    return this.subscriptions.has(channel)
  }

  // Get all active subscriptions
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys())
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager()

// Export hook for React components
export const useRealtime = () => {
  return realtimeManager
}
