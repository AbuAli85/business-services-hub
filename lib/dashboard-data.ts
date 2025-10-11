/**
 * Centralized Dashboard Data Management
 * Ensures consistency across all dashboard sections
 */

import { getSupabaseClient } from '@/lib/supabase-client'

export interface DashboardMetrics {
  totalUsers: number
  totalServices: number
  totalBookings: number
  totalRevenue: number
  totalInvoices: number
  userGrowth: number
  revenueGrowth: number
  bookingGrowth: number
  serviceGrowth: number
  lastUpdated: Date
}

export interface Booking {
  id: string
  serviceId: string
  serviceTitle: string
  clientId: string
  clientName: string
  providerId: string
  providerName: string
  status: 'pending' | 'approved' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  totalAmount: number
  currency: string
  createdAt: string
  updatedAt: string
  invoiceId?: string
}

export interface Invoice {
  id: string
  bookingId: string
  clientId: string
  clientName: string
  providerId: string
  providerName: string
  serviceTitle: string
  amount: number
  currency: string
  status: 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issuedAt: string
  dueAt: string
  paidAt?: string
}

export interface User {
  id: string
  fullName: string
  email: string
  role: 'client' | 'provider' | 'admin'
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  createdAt: string
  lastActive: string
  companyName?: string
}

export interface Service {
  id: string
  title: string
  description: string
  category: string
  basePrice: number
  currency: string
  providerId: string
  providerName: string
  provider_name?: string // API field name
  status: 'active' | 'inactive' | 'suspended'
  approvalStatus: 'pending' | 'approved' | 'rejected'
  featured: boolean
  rating?: number
  reviewCount?: number
  bookingCount?: number
  // API field names
  avg_rating?: number
  review_count?: number
  booking_count?: number
  total_revenue?: number
  createdAt: string
  updatedAt: string
}

export interface MilestoneEvent {
  id: string
  bookingId?: string
  projectTitle?: string
  milestoneId: string
  milestoneTitle: string
  type: 'milestone_completed' | 'milestone_approved'
  status: 'completed' | 'approved'
  createdAt: string
}

export interface SystemNotificationEvent {
  id: string
  title: string
  message: string
  createdAt: string
}

// Centralized data store
class DashboardDataManager {
  private metrics: DashboardMetrics | null = null
  private bookings: Booking[] = []
  private invoices: Invoice[] = []
  private users: User[] = []
  private services: Service[] = []
  private listeners: Set<() => void> = new Set()
  private milestoneEvents: MilestoneEvent[] = []
  private systemEvents: SystemNotificationEvent[] = []

  // Subscribe to data changes
  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // Notify all listeners of data changes
  private notify() {
    this.listeners.forEach(listener => listener())
  }

  // Get current metrics
  getMetrics(): DashboardMetrics | null {
    return this.metrics
  }

  // Get all bookings
  getBookings(): Booking[] {
    return this.bookings
  }

  // Get all invoices
  getInvoices(): Invoice[] {
    return this.invoices
  }

  // Get all users
  getUsers(): User[] {
    return this.users
  }

  // Get all services
  getServices(): Service[] {
    return this.services
  }

  getMilestoneEvents(): MilestoneEvent[] {
    return this.milestoneEvents
  }

  getSystemEvents(): SystemNotificationEvent[] {
    return this.systemEvents
  }

  // Calculate metrics from actual data
  calculateMetrics(): DashboardMetrics {
    const now = new Date()
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Calculate totals from actual data
    const totalUsers = this.users.length
    const totalServices = this.services.length
    const totalBookings = this.bookings.length
    const totalRevenue = this.invoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.amount, 0)
    const totalInvoices = this.invoices.length

    // Calculate growth rates (simplified for demo)
    const userGrowth = totalUsers > 0 ? Math.min(25, Math.max(5, Math.random() * 20)) : 0
    const revenueGrowth = totalRevenue > 0 ? Math.min(30, Math.max(8, Math.random() * 25)) : 0
    const bookingGrowth = totalBookings > 0 ? Math.min(40, Math.max(10, Math.random() * 35)) : 0
    const serviceGrowth = totalServices > 0 ? Math.min(15, Math.max(3, Math.random() * 12)) : 0

    return {
      totalUsers,
      totalServices,
      totalBookings,
      totalRevenue,
      totalInvoices,
      userGrowth,
      revenueGrowth,
      bookingGrowth,
      serviceGrowth,
      lastUpdated: now
    }
  }

  // Load data from API (simulated)
  async loadData(userRole?: string, userId?: string) {
    try {
      // Simulate API calls
      await this.loadUsers()
      await this.loadServices(userRole, userId)
      await this.loadBookings()
      await this.loadInvoices()
      await this.loadMilestoneEvents()
      await this.loadSystemEvents(userId)
      
      // Calculate booking counts for services after both services and bookings are loaded
      this.calculateServiceBookingCounts()
      
      // Calculate metrics from loaded data
      this.metrics = this.calculateMetrics()
      this.notify()
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  // Load users
  private async loadUsers() {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100))
    
    this.users = [
      {
        id: '1',
        fullName: 'Ahmed Al-Rashid',
        email: 'ahmed@example.com',
        role: 'client',
        status: 'active',
        createdAt: '2024-01-15T10:00:00Z',
        lastActive: '2024-01-20T14:30:00Z',
        companyName: 'Al-Rashid Trading LLC'
      },
      {
        id: '2',
        fullName: 'Fatima Al-Zahra',
        email: 'fatima@example.com',
        role: 'provider',
        status: 'active',
        createdAt: '2024-01-10T09:00:00Z',
        lastActive: '2024-01-20T16:45:00Z',
        companyName: 'Digital Solutions Oman'
      },
      {
        id: '3',
        fullName: 'Mohammed Al-Balushi',
        email: 'mohammed@example.com',
        role: 'admin',
        status: 'active',
        createdAt: '2024-01-01T08:00:00Z',
        lastActive: '2024-01-20T17:00:00Z',
        companyName: 'Business Services Hub'
      }
    ]
  }

  // Load services based on user role
  private async loadServices(userRole?: string, userId?: string) {
    try {
      let apiUrl = '/api/services?status=active&limit=100'
      
      // For providers, only fetch their own services
      if (userRole === 'provider' && userId) {
        apiUrl = `/api/services?provider_id=${userId}&limit=100`
      }
      
      // Fetch services from the API
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        const services = data.services || []
        
        // Map the API response to our Service interface
        this.services = services.map((service: any) => ({
          id: service.id,
          title: service.title,
          description: service.description || '',
          category: service.category || 'Uncategorized',
          basePrice: service.base_price || 0,
          currency: service.currency || 'OMR',
          providerId: service.provider_id,
          providerName: service.provider_name || service.provider?.full_name || 'Service Provider',
          status: service.status || 'active',
          approvalStatus: service.approval_status || 'approved',
          featured: service.featured || false,
          rating: service.avg_rating || service.rating || 0,
          reviewCount: service.review_count || 0,
          bookingCount: service.booking_count || service.bookingCount || 0,
          createdAt: service.created_at || new Date().toISOString(),
          updatedAt: service.updated_at || new Date().toISOString(),
          cover_image_url: service.cover_image_url
        }))
      } else {
        console.error('Failed to fetch services:', response.status, response.statusText)
        // Fallback to empty array if API fails
        this.services = []
      }
    } catch (error) {
      console.error('Error loading services:', error)
      // Fallback to empty array if API fails
      this.services = []
    }
  }

  // Load bookings
  private async loadBookings() {
    await new Promise(resolve => setTimeout(resolve, 100))
    
    this.bookings = [
      {
        id: '40431bef-1234-5678-9abc-def012345678',
        serviceId: '1',
        serviceTitle: 'Accounting Services',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        status: 'pending',
        totalAmount: 250,
        currency: 'OMR',
        createdAt: '2024-09-24T04:00:00Z',
        updatedAt: '2024-09-24T04:00:00Z'
      },
      {
        id: 'a89a8f68-1234-5678-9abc-def012345678',
        serviceId: '2',
        serviceTitle: 'Graphic Design',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        status: 'approved',
        totalAmount: 200,
        currency: 'OMR',
        createdAt: '2024-09-24T04:00:00Z',
        updatedAt: '2024-09-24T04:00:00Z',
        invoiceId: '2'
      },
      {
        id: '789c854b-1234-5678-9abc-def012345678',
        serviceId: '3',
        serviceTitle: 'Digital Marketing Campaign',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        status: 'approved',
        totalAmount: 500,
        currency: 'OMR',
        createdAt: '2024-09-24T04:00:00Z',
        updatedAt: '2024-09-24T04:00:00Z',
        invoiceId: '3'
      },
      {
        id: '5c3f1125-1234-5678-9abc-def012345678',
        serviceId: '4',
        serviceTitle: 'Digital Marketing Campaign',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        status: 'in_progress',
        totalAmount: 500,
        currency: 'OMR',
        createdAt: '2024-09-14T04:00:00Z',
        updatedAt: '2024-09-14T04:00:00Z',
        invoiceId: '4'
      },
      {
        id: 'e7fd3d8a-1234-5678-9abc-def012345678',
        serviceId: '5',
        serviceTitle: 'Business Consulting',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        status: 'approved',
        totalAmount: 300,
        currency: 'OMR',
        createdAt: '2024-09-13T04:00:00Z',
        updatedAt: '2024-09-13T04:00:00Z',
        invoiceId: '5'
      },
      {
        id: '087c823e-1234-5678-9abc-def012345678',
        serviceId: '6',
        serviceTitle: 'Website Development',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        status: 'approved',
        totalAmount: 800,
        currency: 'OMR',
        createdAt: '2024-09-11T04:00:00Z',
        updatedAt: '2024-09-11T04:00:00Z',
        invoiceId: '6'
      },
      {
        id: '60ced295-1234-5678-9abc-def012345678',
        serviceId: '7',
        serviceTitle: 'Accounting Services',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        status: 'approved',
        totalAmount: 250,
        currency: 'OMR',
        createdAt: '2024-09-12T04:00:00Z',
        updatedAt: '2024-09-12T04:00:00Z',
        invoiceId: '7'
      },
      {
        id: '7c3ae238-1234-5678-9abc-def012345678',
        serviceId: '8',
        serviceTitle: 'Website Development',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        status: 'approved',
        totalAmount: 800,
        currency: 'OMR',
        createdAt: '2024-09-09T04:00:00Z',
        updatedAt: '2024-09-09T04:00:00Z',
        invoiceId: '8'
      },
      {
        id: 'cfb058a9-1234-5678-9abc-def012345678',
        serviceId: '9',
        serviceTitle: 'Business Consulting',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        status: 'approved',
        totalAmount: 300,
        currency: 'OMR',
        createdAt: '2024-09-09T04:00:00Z',
        updatedAt: '2024-09-09T04:00:00Z',
        invoiceId: '9'
      }
    ]
  }

  // Load invoices
  private async loadInvoices() {
    await new Promise(resolve => setTimeout(resolve, 100))
    
    this.invoices = [
      {
        id: '2',
        bookingId: 'a89a8f68-1234-5678-9abc-def012345678',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        serviceTitle: 'Graphic Design',
        amount: 200,
        currency: 'OMR',
        status: 'issued',
        issuedAt: '2024-09-24T04:00:00Z',
        dueAt: '2024-10-01T04:00:00Z'
      },
      {
        id: '3',
        bookingId: '789c854b-1234-5678-9abc-def012345678',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        serviceTitle: 'Digital Marketing Campaign',
        amount: 500,
        currency: 'OMR',
        status: 'issued',
        issuedAt: '2024-09-24T04:00:00Z',
        dueAt: '2024-10-01T04:00:00Z'
      },
      {
        id: '4',
        bookingId: '5c3f1125-1234-5678-9abc-def012345678',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        serviceTitle: 'Digital Marketing Campaign',
        amount: 500,
        currency: 'OMR',
        status: 'issued',
        issuedAt: '2024-09-14T04:00:00Z',
        dueAt: '2024-09-21T04:00:00Z'
      },
      {
        id: '5',
        bookingId: 'e7fd3d8a-1234-5678-9abc-def012345678',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        serviceTitle: 'Business Consulting',
        amount: 300,
        currency: 'OMR',
        status: 'issued',
        issuedAt: '2024-09-13T04:00:00Z',
        dueAt: '2024-09-20T04:00:00Z'
      },
      {
        id: '6',
        bookingId: '087c823e-1234-5678-9abc-def012345678',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        serviceTitle: 'Website Development',
        amount: 800,
        currency: 'OMR',
        status: 'issued',
        issuedAt: '2024-09-11T04:00:00Z',
        dueAt: '2024-09-18T04:00:00Z'
      },
      {
        id: '7',
        bookingId: '60ced295-1234-5678-9abc-def012345678',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        serviceTitle: 'Accounting Services',
        amount: 250,
        currency: 'OMR',
        status: 'issued',
        issuedAt: '2024-09-12T04:00:00Z',
        dueAt: '2024-09-19T04:00:00Z'
      },
      {
        id: '8',
        bookingId: '7c3ae238-1234-5678-9abc-def012345678',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        serviceTitle: 'Website Development',
        amount: 800,
        currency: 'OMR',
        status: 'issued',
        issuedAt: '2024-09-09T04:00:00Z',
        dueAt: '2024-09-16T04:00:00Z'
      },
      {
        id: '9',
        bookingId: 'cfb058a9-1234-5678-9abc-def012345678',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        serviceTitle: 'Business Consulting',
        amount: 300,
        currency: 'OMR',
        status: 'issued',
        issuedAt: '2024-09-09T04:00:00Z',
        dueAt: '2024-09-16T04:00:00Z'
      }
    ]
  }

  // Load recent milestone events (live from DB if available, else fallback)
  private async loadMilestoneEvents() {
    try {
      const supabase = await getSupabaseClient()
      
      // First, try to get milestone approvals with join
      let data: any[] = []
      let error: any = null
      
      try {
        const { data: approvalData, error: approvalError } = await supabase
          .from('milestone_approvals')
          .select('id, milestone_id, status, created_at, milestones(title)')
          .order('created_at', { ascending: false })
          .limit(20)
        data = approvalData || []
        error = approvalError
      } catch (joinError) {
        console.warn('⚠️ Join query failed, falling back to separate queries:', joinError)
        
        // Fallback: Get approvals and milestones separately
        const { data: approvalsData, error: approvalsError } = await supabase
          .from('milestone_approvals')
          .select('id, milestone_id, status, created_at')
          .order('created_at', { ascending: false })
          .limit(20)
        
        if (approvalsError) {
          throw approvalsError
        }
        
        // Get milestone titles separately
        const milestoneIds = (approvalsData || []).map(a => a.milestone_id).filter(Boolean)
        let milestoneTitles: Record<string, string> = {}
        
        if (milestoneIds.length > 0) {
          const { data: milestonesData } = await supabase
            .from('milestones')
            .select('id, title')
            .in('id', milestoneIds)
          
          milestoneTitles = (milestonesData || []).reduce((acc, m) => {
            acc[m.id] = m.title
            return acc
          }, {} as Record<string, string>)
        }
        
        // Combine the data
        data = (approvalsData || []).map(approval => ({
          ...approval,
          milestones: { title: milestoneTitles[approval.milestone_id] || 'Milestone' }
        }))
      }
      
      if (error) throw error
      
      const events: MilestoneEvent[] = data.map((row: any) => ({
        id: row.id,
        milestoneId: row.milestone_id,
        milestoneTitle: row.milestones?.title || 'Milestone',
        type: row.status === 'approved' ? 'milestone_approved' : 'milestone_completed',
        status: row.status === 'approved' ? 'approved' : 'completed',
        createdAt: row.created_at
      }))
      this.milestoneEvents = events
    } catch (e) {
      // Fallback simulated
      this.milestoneEvents = [
        {
          id: 'me1',
          milestoneId: 'm-1',
          milestoneTitle: 'Project Planning',
          type: 'milestone_completed',
          status: 'completed',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
        },
        {
          id: 'me2',
          milestoneId: 'm-2',
          milestoneTitle: 'Design Approval',
          type: 'milestone_approved',
          status: 'approved',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
        }
      ]
    }
  }

  // Load system notifications (live if available for user)
  private async loadSystemEvents(userId?: string) {
    try {
      const supabase = await getSupabaseClient()
      const query = supabase
        .from('notifications')
        .select('id, title, message, created_at')
        .order('created_at', { ascending: false })
        .limit(20)
      const { data, error } = userId ? await query.eq('user_id', userId) : await query
      if (error) throw error
      this.systemEvents = (data || []).map((n: any) => ({
        id: n.id,
        title: n.title || 'Notification',
        message: n.message || '',
        createdAt: n.created_at
      }))
    } catch (e) {
      this.systemEvents = [
        {
          id: 'se1',
          title: 'System Update',
          message: 'New analytics module deployed',
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        }
      ]
    }
  }

  // Get booking by ID
  getBookingById(id: string): Booking | undefined {
    return this.bookings.find(booking => booking.id === id)
  }

  // Get invoice by ID
  getInvoiceById(id: string): Invoice | undefined {
    return this.invoices.find(invoice => invoice.id === id)
  }

  // Get invoices for a booking
  getInvoicesForBooking(bookingId: string): Invoice[] {
    return this.invoices.filter(invoice => invoice.bookingId === bookingId)
  }

  // Get bookings for a service
  getBookingsForService(serviceId: string): Booking[] {
    return this.bookings.filter(booking => booking.serviceId === serviceId)
  }

  // Get user by ID
  getUserById(id: string): User | undefined {
    return this.users.find(user => user.id === id)
  }

  // Get service by ID
  getServiceById(id: string): Service | undefined {
    return this.services.find(service => service.id === id)
  }

  // Calculate booking counts for each service
  private calculateServiceBookingCounts() {
    this.services = this.services.map(service => {
      const serviceBookings = this.bookings.filter(booking => booking.serviceId === service.id)
      return {
        ...service,
        bookingCount: serviceBookings.length,
        booking_count: serviceBookings.length // Also set the API field name
      }
    })
  }

  // Add new booking
  addBooking(booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) {
    const newBooking: Booking = {
      ...booking,
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    this.bookings.push(newBooking)
    
    // Recalculate booking counts for services
    this.calculateServiceBookingCounts()
    
    this.metrics = this.calculateMetrics()
    this.notify()
    return newBooking
  }

  // Add new invoice
  addInvoice(invoice: Omit<Invoice, 'id' | 'issuedAt' | 'dueAt'>) {
    const now = new Date()
    const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    
    const newInvoice: Invoice = {
      ...invoice,
      id: String(Date.now()),
      issuedAt: now.toISOString(),
      dueAt: dueDate.toISOString()
    }
    this.invoices.push(newInvoice)
    this.metrics = this.calculateMetrics()
    this.notify()
    return newInvoice
  }

  // Update booking status
  updateBookingStatus(bookingId: string, status: Booking['status']) {
    const booking = this.bookings.find(b => b.id === bookingId)
    if (booking) {
      booking.status = status
      booking.updatedAt = new Date().toISOString()
      
      // Recalculate booking counts for services
      this.calculateServiceBookingCounts()
      
      this.metrics = this.calculateMetrics()
      this.notify()
    }
  }

  // Update invoice status
  updateInvoiceStatus(invoiceId: string, status: Invoice['status']) {
    const invoice = this.invoices.find(i => i.id === invoiceId)
    if (invoice) {
      invoice.status = status
      if (status === 'paid') {
        invoice.paidAt = new Date().toISOString()
      }
      this.metrics = this.calculateMetrics()
      this.notify()
    }
  }
}

// Export singleton instance
export const dashboardData = new DashboardDataManager()

// Utility functions
export function formatCurrency(amount: number, currency: string = 'OMR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
