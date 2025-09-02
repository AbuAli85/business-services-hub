'use client'

import { notificationService } from './notifications'

interface Booking {
  id: string
  estimated_completion_date?: string
  status: string
  progress_percentage?: number
}

class DeadlineMonitor {
  private checkInterval: NodeJS.Timeout | null = null
  private checkedBookings: Set<string> = new Set()

  start() {
    // Check deadlines every hour
    this.checkInterval = setInterval(() => {
      this.checkDeadlines()
    }, 60 * 60 * 1000) // 1 hour

    // Initial check
    this.checkDeadlines()
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  private async checkDeadlines() {
    try {
      // This would typically fetch from your API
      // For now, we'll simulate with a mock function
      const bookings = await this.fetchBookingsWithDeadlines()
      
      bookings.forEach(booking => {
        this.checkBookingDeadline(booking)
      })
    } catch (error) {
      console.error('Error checking deadlines:', error)
    }
  }

  private async fetchBookingsWithDeadlines(): Promise<Booking[]> {
    // This should be replaced with actual API call
    // For now, return empty array
    return []
  }

  private checkBookingDeadline(booking: Booking) {
    if (!booking.estimated_completion_date || booking.status === 'completed') {
      return
    }

    const deadline = new Date(booking.estimated_completion_date)
    const now = new Date()
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Don't send duplicate notifications
    const notificationKey = `${booking.id}_${daysRemaining}`
    if (this.checkedBookings.has(notificationKey)) {
      return
    }

    if (daysRemaining < 0) {
      // Overdue
      notificationService.notifyDeadline({
        bookingId: booking.id,
        deadline: booking.estimated_completion_date,
        type: 'overdue'
      })
      this.checkedBookings.add(notificationKey)
    } else if (daysRemaining <= 1) {
      // Due today or tomorrow
      notificationService.notifyDeadline({
        bookingId: booking.id,
        deadline: booking.estimated_completion_date,
        type: 'approaching',
        daysRemaining
      })
      this.checkedBookings.add(notificationKey)
    } else if (daysRemaining <= 3) {
      // Due in 3 days
      notificationService.notifyDeadline({
        bookingId: booking.id,
        deadline: booking.estimated_completion_date,
        type: 'approaching',
        daysRemaining
      })
      this.checkedBookings.add(notificationKey)
    }
  }

  // Manual deadline check for a specific booking
  checkBookingDeadlineManually(booking: Booking) {
    this.checkBookingDeadline(booking)
  }

  // Clear checked bookings (useful for testing or reset)
  clearCheckedBookings() {
    this.checkedBookings.clear()
  }
}

// Create singleton instance
export const deadlineMonitor = new DeadlineMonitor()

// Auto-start in browser environment
if (typeof window !== 'undefined') {
  deadlineMonitor.start()
}
