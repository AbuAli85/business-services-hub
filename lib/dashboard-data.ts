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
  cover_image_url?: string | null
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
      
      // For providers, fetch all their services regardless of status (including drafts and pending)
      if (userRole === 'provider' && userId) {
        apiUrl = `/api/services?provider_id=${userId}&status=all&limit=100`
      }
      
      console.log('📊 Dashboard Data: Fetching services from:', apiUrl)
      
      // Fetch services from the API
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (response.status === 401) {
        console.warn('⚠️ Dashboard Data: Unauthorized - user needs to login')
        // Set empty services array for unauthenticated users
        this.services = []
        return
      }

      if (response.ok) {
        const data = await response.json()
        const services = data.services || []
        console.log('📊 Dashboard Data: Loaded services from API:', services.length, 'services')
        
        // Map the API response to our Service interface
        this.services = services.map((service: any) => ({
          id: service?.id || '',
          title: service?.title || 'Untitled Service',
          description: service?.description || '',
          category: service?.category || 'Uncategorized',
          basePrice: service?.base_price || 0,
          currency: service?.currency || 'OMR',
          providerId: service?.provider_id,
          providerName: service?.provider?.full_name || service?.provider_name || 'Service Provider',
          provider_name: service?.provider?.full_name || service?.provider_name || 'Service Provider', // Keep both for compatibility
          status: service?.status || 'active',
          approvalStatus: service?.approval_status || 'approved',
          featured: service?.featured || false,
          rating: service?.avg_rating || service?.rating || 0,
          avg_rating: service?.avg_rating || service?.rating || 0, // Keep both for compatibility
          reviewCount: service?.review_count || 0,
          review_count: service?.review_count || 0, // Keep both for compatibility
          bookingCount: service?.booking_count || service?.bookingCount || 0,
          booking_count: service?.booking_count || service?.bookingCount || 0, // Keep both for compatibility
          total_revenue: service?.total_revenue || 0, // Revenue from API
          createdAt: service?.created_at || new Date().toISOString(),
          updatedAt: service?.updated_at || new Date().toISOString(),
          cover_image_url: service?.cover_image_url
        }))
        console.log('📊 Dashboard Data: Mapped services:', this.services.length, 'services with provider names')
      } else {
        console.error('Failed to fetch services:', response.status, response.statusText)
        console.log('🔄 Dashboard Data: Using fallback data for services')
        // Fallback to sample data if API fails
        this.services = [
          {
            id: 'sample-1',
            title: 'Sample Service 1',
            description: 'This is a sample service for testing purposes',
            category: 'Web Development',
            basePrice: 100,
            currency: 'OMR',
            providerId: userId || 'sample-provider',
            providerName: 'Sample Provider',
            provider_name: 'Sample Provider',
            status: 'active',
            approvalStatus: 'approved',
            featured: true,
            rating: 4.5,
            avg_rating: 4.5,
            reviewCount: 10,
            review_count: 10,
            bookingCount: 5,
            booking_count: 5,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            cover_image_url: null
          }
        ]
      }
    } catch (error) {
      console.error('Error loading services:', error)
      console.log('🔄 Dashboard Data: Using fallback data due to error')
      // Fallback to sample data if API fails
      this.services = [
        {
          id: 'sample-1',
          title: 'Sample Service 1',
          description: 'This is a sample service for testing purposes',
          category: 'Web Development',
          basePrice: 100,
          currency: 'OMR',
          providerId: userId || 'sample-provider',
          providerName: 'Sample Provider',
          provider_name: 'Sample Provider',
          status: 'active',
          approvalStatus: 'approved',
          featured: true,
          rating: 4.5,
          avg_rating: 4.5,
          reviewCount: 10,
          review_count: 10,
          bookingCount: 5,
          booking_count: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          cover_image_url: null
        }
      ]
    }
  }

  // Load bookings
  private async loadBookings() {
    try {
      console.log('📊 Dashboard Data: Loading bookings...')
      // Fetch bookings from the API
      const response = await fetch('/api/bookings?limit=100', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      console.log('📊 Dashboard Data: Bookings API response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        const bookings = data.bookings || []
        console.log('📊 Dashboard Data: Raw bookings from API:', bookings.length, 'bookings')
        
        // Map the API response to our Booking interface
        this.bookings = bookings.map((booking: any) => ({
          id: booking.id || booking.booking_id || '',
          serviceId: booking.service_id || '',
          serviceTitle: booking.service_title || booking.booking_title || booking.title || 'Untitled Service',
          clientId: booking.client_id || '',
          clientName: booking.client_name || 'Unknown Client',
          providerId: booking.provider_id || '',
          providerName: booking.provider_name || 'Unknown Provider',
          status: booking.display_status || booking.booking_status || booking.status || 'pending',
          totalAmount: booking.amount || booking.total_amount || 0,
          currency: booking.currency || 'OMR',
          createdAt: booking.booking_created_at || booking.created_at || new Date().toISOString(),
          updatedAt: booking.booking_updated_at || booking.updated_at || new Date().toISOString(),
          invoiceId: booking.invoice_id || undefined
        }))
        console.log('📊 Dashboard Data: Mapped bookings:', this.bookings.length, 'bookings')
      } else {
        console.error('❌ Dashboard Data: Failed to fetch bookings:', response.status, response.statusText)
        // Try to get error details
        try {
          const errorData = await response.json()
          console.error('❌ Dashboard Data: Error details:', errorData)
        } catch (e) {
          console.error('❌ Dashboard Data: Could not parse error response')
        }
        
        // Fallback to sample data if API fails
        console.log('🔄 Dashboard Data: Using fallback booking data')
        this.bookings = [
          {
            id: 'sample-booking-1',
            serviceId: 'sample-service-1',
            serviceTitle: 'Sample Service Booking',
            clientId: 'sample-client',
            clientName: 'Sample Client',
            providerId: 'sample-provider',
            providerName: 'Sample Provider',
            status: 'completed',
            totalAmount: 500,
            currency: 'OMR',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            invoiceId: undefined
          }
        ]
      }
    } catch (error) {
      console.error('❌ Dashboard Data: Error loading bookings:', error)
      // Fallback to sample data if API fails
      console.log('🔄 Dashboard Data: Using fallback booking data due to error')
      this.bookings = [
        {
          id: 'sample-booking-1',
          serviceId: 'sample-service-1',
          serviceTitle: 'Sample Service Booking',
          clientId: 'sample-client',
          clientName: 'Sample Client',
          providerId: 'sample-provider',
          providerName: 'Sample Provider',
          status: 'completed',
          totalAmount: 500,
          currency: 'OMR',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          invoiceId: undefined
        }
      ]
    }
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
  // Only calculate if not already provided by API
  private calculateServiceBookingCounts() {
    console.log('📊 Dashboard Data: Calculating/preserving service booking counts')
    
    this.services = this.services.map(service => {
      // If service already has booking_count from API, preserve it
      // Only calculate from local bookings if missing
      const apiBookingCount = service.booking_count || service.bookingCount
      const apiRevenue = service.total_revenue
      
      if (apiBookingCount !== undefined && apiRevenue !== undefined) {
        console.log('📊 Service', service.title, '- Using API data: bookings =', apiBookingCount, ', revenue =', apiRevenue)
        return service // Already has data from API
      }
      
      // Calculate from local bookings if not provided by API
      const serviceBookings = this.bookings.filter(booking => booking.serviceId === service.id)
      const calculatedRevenue = serviceBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
      
      console.log('📊 Service', service.title, '- Calculating locally: bookings =', serviceBookings.length, ', revenue =', calculatedRevenue)
      
      return {
        ...service,
        bookingCount: serviceBookings.length,
        booking_count: serviceBookings.length,
        total_revenue: calculatedRevenue
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
  // Always display with exactly 2 decimal places for consistency
  const normalizedCurrency = (currency || 'OMR').toUpperCase()
  const fixed = Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
  return `${normalizedCurrency} ${fixed}`
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
