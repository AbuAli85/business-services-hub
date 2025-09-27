/**
 * Centralized Dashboard Data Management
 * Ensures consistency across all dashboard sections
 */

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
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
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
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
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
  status: 'active' | 'inactive' | 'suspended'
  approvalStatus: 'pending' | 'approved' | 'rejected'
  featured: boolean
  rating?: number
  reviewCount?: number
  bookingCount?: number
  createdAt: string
  updatedAt: string
}

// Centralized data store
class DashboardDataManager {
  private metrics: DashboardMetrics | null = null
  private bookings: Booking[] = []
  private invoices: Invoice[] = []
  private users: User[] = []
  private services: Service[] = []
  private listeners: Set<() => void> = new Set()

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
  async loadData() {
    try {
      // Simulate API calls
      await this.loadUsers()
      await this.loadServices()
      await this.loadBookings()
      await this.loadInvoices()
      
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

  // Load services
  private async loadServices() {
    try {
      // Fetch real services from the API
      const response = await fetch('/api/services?status=active&limit=100', {
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
          providerName: service.provider?.full_name || 'Service Provider',
          status: service.status || 'active',
          approvalStatus: service.approval_status || 'approved',
          featured: service.featured || false,
          rating: service.rating || 0,
          reviewCount: service.review_count || 0,
          bookingCount: service._count?.bookings || 0,
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
        id: '1',
        serviceId: '1',
        serviceTitle: 'Digital Marketing Strategy',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        status: 'completed',
        totalAmount: 500,
        currency: 'OMR',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-18T14:30:00Z',
        invoiceId: '1'
      },
      {
        id: '2',
        serviceId: '2',
        serviceTitle: 'Legal Consultation',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        status: 'in_progress',
        totalAmount: 300,
        currency: 'OMR',
        createdAt: '2024-01-16T11:00:00Z',
        updatedAt: '2024-01-19T09:15:00Z',
        invoiceId: '2'
      },
      {
        id: '3',
        serviceId: '1',
        serviceTitle: 'Digital Marketing Strategy',
        clientId: '3',
        clientName: 'Mohammed Al-Balushi',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        status: 'confirmed',
        totalAmount: 750,
        currency: 'OMR',
        createdAt: '2024-01-20T14:00:00Z',
        updatedAt: '2024-01-20T14:00:00Z',
        invoiceId: '3'
      },
      {
        id: '4',
        serviceId: '2',
        serviceTitle: 'Legal Consultation',
        clientId: '3',
        clientName: 'Mohammed Al-Balushi',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        status: 'pending',
        totalAmount: 200,
        currency: 'OMR',
        createdAt: '2024-01-21T09:30:00Z',
        updatedAt: '2024-01-21T09:30:00Z'
      }
    ]
  }

  // Load invoices
  private async loadInvoices() {
    await new Promise(resolve => setTimeout(resolve, 100))
    
    this.invoices = [
      {
        id: '1',
        bookingId: '1',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        serviceTitle: 'Digital Marketing Strategy',
        amount: 500,
        currency: 'OMR',
        status: 'paid',
        issuedAt: '2024-01-15T10:00:00Z',
        dueAt: '2024-01-22T10:00:00Z',
        paidAt: '2024-01-18T14:30:00Z'
      },
      {
        id: '2',
        bookingId: '2',
        clientId: '1',
        clientName: 'Ahmed Al-Rashid',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        serviceTitle: 'Legal Consultation',
        amount: 300,
        currency: 'OMR',
        status: 'sent',
        issuedAt: '2024-01-16T11:00:00Z',
        dueAt: '2024-01-23T11:00:00Z'
      },
      {
        id: '3',
        bookingId: '3',
        clientId: '3',
        clientName: 'Mohammed Al-Balushi',
        providerId: '2',
        providerName: 'Fatima Al-Zahra',
        serviceTitle: 'Digital Marketing Strategy',
        amount: 750,
        currency: 'OMR',
        status: 'sent',
        issuedAt: '2024-01-20T14:00:00Z',
        dueAt: '2024-01-27T14:00:00Z'
      }
    ]
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

  // Add new booking
  addBooking(booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) {
    const newBooking: Booking = {
      ...booking,
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    this.bookings.push(newBooking)
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
