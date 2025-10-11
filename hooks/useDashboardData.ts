/**
 * React Hook for Dashboard Data Management
 * Provides real-time access to centralized dashboard data
 */

import { useState, useEffect, useCallback } from 'react'
import { dashboardData, DashboardMetrics, Booking, Invoice, User, Service, MilestoneEvent, SystemNotificationEvent } from '@/lib/dashboard-data'

export function useDashboardData(userRole?: string, userId?: string) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [milestoneEvents, setMilestoneEvents] = useState<MilestoneEvent[]>([])
  const [systemEvents, setSystemEvents] = useState<SystemNotificationEvent[]>([])

  // Update state when data changes
  const updateData = useCallback(() => {
    setMetrics(dashboardData.getMetrics())
    setBookings(dashboardData.getBookings())
    setInvoices(dashboardData.getInvoices())
    setUsers(dashboardData.getUsers())
    setServices(dashboardData.getServices())
    setMilestoneEvents(dashboardData.getMilestoneEvents())
    setSystemEvents(dashboardData.getSystemEvents())
  }, [])

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('🔄 useDashboardData: Loading data for user:', userId, 'role:', userRole)
        await dashboardData.loadData(userRole, userId)
        updateData()
        console.log('✅ useDashboardData: Data loaded successfully')
      } catch (err) {
        console.error('❌ useDashboardData: Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [updateData, userRole, userId])

  // Subscribe to data changes
  useEffect(() => {
    const unsubscribe = dashboardData.subscribe(updateData)
    return () => {
      unsubscribe()
    }
  }, [updateData])

  // Refresh data (silent refresh - don't show loading state)
  const refresh = useCallback(async () => {
    try {
      // Don't set loading to true during refresh - keep it silent
      setError(null)
      await dashboardData.loadData(userRole, userId)
      updateData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data')
    }
    // Don't set loading to false either - keep current state
  }, [updateData, userRole, userId])

  // Get specific items
  const getBookingById = useCallback((id: string) => {
    return dashboardData.getBookingById(id)
  }, [])

  const getInvoiceById = useCallback((id: string) => {
    return dashboardData.getInvoiceById(id)
  }, [])

  const getInvoicesForBooking = useCallback((bookingId: string) => {
    return dashboardData.getInvoicesForBooking(bookingId)
  }, [])

  const getBookingsForService = useCallback((serviceId: string) => {
    return dashboardData.getBookingsForService(serviceId)
  }, [])

  const getUserById = useCallback((id: string) => {
    return dashboardData.getUserById(id)
  }, [])

  const getServiceById = useCallback((id: string) => {
    return dashboardData.getServiceById(id)
  }, [])

  // Add new items
  const addBooking = useCallback((booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) => {
    return dashboardData.addBooking(booking)
  }, [])

  const addInvoice = useCallback((invoice: Omit<Invoice, 'id' | 'issuedAt' | 'dueAt'>) => {
    return dashboardData.addInvoice(invoice)
  }, [])

  // Update items
  const updateBookingStatus = useCallback((bookingId: string, status: Booking['status']) => {
    dashboardData.updateBookingStatus(bookingId, status)
  }, [])

  const updateInvoiceStatus = useCallback((invoiceId: string, status: Invoice['status']) => {
    dashboardData.updateInvoiceStatus(invoiceId, status)
  }, [])

  return {
    // Data
    metrics,
    bookings,
    invoices,
    users,
    services,
    milestoneEvents,
    systemEvents,
    
    // State
    loading,
    error,
    
    // Actions
    refresh,
    getBookingById,
    getInvoiceById,
    getInvoicesForBooking,
    getBookingsForService,
    getUserById,
    getServiceById,
    addBooking,
    addInvoice,
    updateBookingStatus,
    updateInvoiceStatus
  }
}

// Hook for specific data types
export function useMetrics() {
  const { metrics, loading, error, refresh } = useDashboardData()
  return { metrics, loading, error, refresh }
}

export function useBookings() {
  const { bookings, loading, error, refresh, getBookingById, addBooking, updateBookingStatus } = useDashboardData()
  return { bookings, loading, error, refresh, getBookingById, addBooking, updateBookingStatus }
}

export function useInvoices() {
  const { invoices, loading, error, refresh, getInvoiceById, getInvoicesForBooking, addInvoice, updateInvoiceStatus } = useDashboardData()
  return { invoices, loading, error, refresh, getInvoiceById, getInvoicesForBooking, addInvoice, updateInvoiceStatus }
}

export function useUsers() {
  const { users, loading, error, refresh, getUserById } = useDashboardData()
  return { users, loading, error, refresh, getUserById }
}

export function useServices() {
  const { services, loading, error, refresh, getServiceById, getBookingsForService } = useDashboardData()
  return { services, loading, error, refresh, getServiceById, getBookingsForService }
}
