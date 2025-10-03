/**
 * Realtime Subscription Optimizer
 * 
 * This module optimizes realtime subscriptions to reduce database load
 * and improve application performance based on the performance analysis
 * showing 92.8% of database time consumed by realtime.list_changes queries.
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface SubscriptionConfig {
  table: string
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
  callback: (payload: RealtimePostgresChangesPayload<any>) => void
  debounceMs?: number
  maxRetries?: number
}

interface OptimizedSubscription {
  id: string
  config: SubscriptionConfig
  channel: RealtimeChannel
  lastActivity: number
  retryCount: number
  isActive: boolean
}

class RealtimeOptimizer {
  private subscriptions = new Map<string, OptimizedSubscription>()
  private debounceTimers = new Map<string, NodeJS.Timeout>()
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly MAX_INACTIVE_TIME = 5 * 60 * 1000 // 5 minutes
  private readonly CLEANUP_INTERVAL = 60 * 1000 // 1 minute
  private readonly MAX_SUBSCRIPTIONS = 10 // Limit concurrent subscriptions

  constructor() {
    this.startCleanupTimer()
  }

  /**
   * Subscribe to table changes with optimization
   */
  subscribe(
    supabase: any,
    config: SubscriptionConfig
  ): string {
    const subscriptionId = this.generateSubscriptionId(config)
    
    // Check if we're at the subscription limit
    if (this.subscriptions.size >= this.MAX_SUBSCRIPTIONS) {
      this.cleanupInactiveSubscriptions()
    }

    // If still at limit, remove the oldest subscription
    if (this.subscriptions.size >= this.MAX_SUBSCRIPTIONS) {
      const oldestSubscription = this.getOldestSubscription()
      if (oldestSubscription) {
        this.unsubscribe(oldestSubscription.id)
      }
    }

    // Create optimized callback with debouncing
    const optimizedCallback = this.createOptimizedCallback(
      subscriptionId,
      config.callback,
      config.debounceMs || 1000
    )

    // Create the realtime channel
    const channel = supabase
      .channel(subscriptionId)
      .on(
        'postgres_changes',
        {
          event: config.event,
          schema: 'public',
          table: config.table,
          filter: config.filter
        },
        optimizedCallback
      )
      .subscribe()

    // Store the subscription
    const subscription: OptimizedSubscription = {
      id: subscriptionId,
      config,
      channel,
      lastActivity: Date.now(),
      retryCount: 0,
      isActive: true
    }

    this.subscriptions.set(subscriptionId, subscription)

    console.log(`🔗 Optimized subscription created: ${subscriptionId} for table: ${config.table}`)
    
    return subscriptionId
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) {
      return false
    }

    // Clean up the channel
    subscription.channel.unsubscribe()
    
    // Clear any pending debounce timer
    const timer = this.debounceTimers.get(subscriptionId)
    if (timer) {
      clearTimeout(timer)
      this.debounceTimers.delete(subscriptionId)
    }

    // Remove from subscriptions
    this.subscriptions.delete(subscriptionId)

    console.log(`🔌 Optimized subscription removed: ${subscriptionId}`)
    return true
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): void {
    for (const [id] of Array.from(this.subscriptions.entries())) {
      this.unsubscribe(id)
    }
  }

  /**
   * Get subscription statistics
   */
  getStats() {
    const activeSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.isActive)

    return {
      totalSubscriptions: this.subscriptions.size,
      activeSubscriptions: activeSubscriptions.length,
      subscriptions: activeSubscriptions.map(sub => ({
        id: sub.id,
        table: sub.config.table,
        event: sub.config.event,
        lastActivity: sub.lastActivity,
        retryCount: sub.retryCount
      }))
    }
  }

  /**
   * Create an optimized callback with debouncing and retry logic
   */
  private createOptimizedCallback(
    subscriptionId: string,
    originalCallback: (payload: RealtimePostgresChangesPayload<any>) => void,
    debounceMs: number
  ) {
    return (payload: RealtimePostgresChangesPayload<any>) => {
      const subscription = this.subscriptions.get(subscriptionId)
      if (!subscription) return

      // Update last activity
      subscription.lastActivity = Date.now()

      // Clear existing debounce timer
      const existingTimer = this.debounceTimers.get(subscriptionId)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      // Set new debounce timer
      const timer = setTimeout(() => {
        try {
          originalCallback(payload)
          subscription.retryCount = 0 // Reset retry count on success
        } catch (error) {
          console.error(`❌ Realtime callback error for ${subscriptionId}:`, error)
          this.handleCallbackError(subscription, error)
        }
        this.debounceTimers.delete(subscriptionId)
      }, debounceMs)

      this.debounceTimers.set(subscriptionId, timer)
    }
  }

  /**
   * Handle callback errors with retry logic
   */
  private handleCallbackError(
    subscription: OptimizedSubscription,
    error: any
  ): void {
    subscription.retryCount++

    if (subscription.retryCount >= (subscription.config.maxRetries || 3)) {
      console.error(`❌ Max retries exceeded for subscription ${subscription.id}, removing`)
      this.unsubscribe(subscription.id)
    } else {
      console.warn(`⚠️ Retrying subscription ${subscription.id} (attempt ${subscription.retryCount})`)
    }
  }

  /**
   * Clean up inactive subscriptions
   */
  private cleanupInactiveSubscriptions(): void {
    const now = Date.now()
    const inactiveSubscriptions: string[] = []

    for (const [id, subscription] of Array.from(this.subscriptions.entries())) {
      if (now - subscription.lastActivity > this.MAX_INACTIVE_TIME) {
        inactiveSubscriptions.push(id)
      }
    }

    inactiveSubscriptions.forEach(id => {
      console.log(`🧹 Cleaning up inactive subscription: ${id}`)
      this.unsubscribe(id)
    })

    if (inactiveSubscriptions.length > 0) {
      console.log(`🧹 Cleaned up ${inactiveSubscriptions.length} inactive subscriptions`)
    }
  }

  /**
   * Get the oldest subscription for removal
   */
  private getOldestSubscription(): OptimizedSubscription | null {
    let oldest: OptimizedSubscription | null = null
    let oldestTime = Date.now()

    for (const subscription of Array.from(this.subscriptions.values())) {
      if (subscription.lastActivity < oldestTime) {
        oldest = subscription
        oldestTime = subscription.lastActivity
      }
    }

    return oldest
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSubscriptions()
    }, this.CLEANUP_INTERVAL)
  }

  /**
   * Stop the cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Generate a unique subscription ID
   */
  private generateSubscriptionId(config: SubscriptionConfig): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${config.table}_${config.event}_${timestamp}_${random}`
  }

  /**
   * Destroy the optimizer and clean up all resources
   */
  destroy(): void {
    this.stopCleanupTimer()
    this.unsubscribeAll()
    
    // Clear all debounce timers
    for (const timer of Array.from(this.debounceTimers.values())) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()
  }
}

// Create a singleton instance
export const realtimeOptimizer = new RealtimeOptimizer()

// Export the class for testing
export { RealtimeOptimizer }

// React hooks are available in hooks/useOptimizedRealtime.ts

// Performance monitoring
export function getRealtimePerformanceStats() {
  return realtimeOptimizer.getStats()
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    realtimeOptimizer.destroy()
  })
}
