'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getSupabaseClient } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Bell,
  Activity,
  Zap,
  Target,
  Award,
  BarChart3,
  RefreshCw,
  Plus,
  MessageSquare,
  Building2,
  Edit,
  Sparkles,
  User,
  Settings
} from 'lucide-react'
import EnvChecker from '@/components/env-checker'

interface DashboardStats {
  totalBookings: number
  activeBookings: number
  completedBookings: number
  totalEarnings: number
  pendingPayments: number
  totalServices: number
  totalClients: number
  monthlyGrowth: number
}

interface RecentBooking {
  id: string
  status: string
  subtotal: number
  currency: string
  created_at: string
  service: {
    title: string
  }
  client?: {
    full_name: string
  }
  provider?: {
    full_name: string
  }
}

interface Notification {
  id: string
  type: 'booking' | 'payment' | 'message' | 'system'
  title: string
  message: string
  is_read: boolean
  created_at: string
  priority: 'low' | 'medium' | 'high'
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    totalEarnings: 0,
    pendingPayments: 0,
    totalServices: 0,
    totalClients: 0,
    monthlyGrowth: 0
  })
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('')
  const [companyInfo, setCompanyInfo] = useState<any>(null) // New state for company info
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const router = useRouter()

  useEffect(() => {
    fetchDashboardData()
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData()
      setLastRefresh(new Date())
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user found in dashboard')
        return
      }

      console.log('User found in dashboard:', user)

      // Get user role from metadata instead of database
      const userRole = user.user_metadata?.role || 'client'
      setUserRole(userRole)
      console.log('User role from metadata:', userRole)

      // Fetch real data for providers
      if (userRole === 'provider') {
        await Promise.all([
          fetchProviderStats(user.id),
          fetchRecentBookings(user.id),
          fetchNotifications(user.id),
          fetchServicesCount(user.id),
          fetchCompanyInfo(user.id)
        ])
      }

      console.log('Dashboard data loaded successfully')
      setLoading(false)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setLoading(false)
    }
  }

  const fetchProviderStats = async (userId: string) => {
    try {
      // Try to get basic stats without complex queries first
      let totalBookings = 0
      let activeBookings = 0
      let completedBookings = 0
      let pendingPayments = 0
      let totalEarnings = 0

      // Simple count query
      try {
        const supabase = getSupabaseClient()
        const { count } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })

        totalBookings = count || 0
        console.log('Total bookings fetched:', totalBookings)
      } catch (error) {
        console.log('Bookings table query failed, using default values')
      }

      // Set default stats for now
      setStats({
        totalBookings,
        activeBookings: Math.floor(totalBookings * 0.3), // 30% active
        completedBookings: Math.floor(totalBookings * 0.5), // 50% completed
        totalEarnings: totalBookings * 150, // Mock earnings
        pendingPayments: Math.floor(totalBookings * 0.2), // 20% pending
        totalServices: 0,
        totalClients: Math.floor(totalBookings * 0.8), // Mock clients
        monthlyGrowth: 12.5 // Mock growth percentage
      })
    } catch (error) {
      console.error('Error fetching provider stats:', error)
      // Keep default stats if there's an error
    }
  }

  const fetchServicesCount = async (userId: string) => {
    try {
      const supabase = getSupabaseClient()
      const { count } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', userId)

      setStats(prev => ({ ...prev, totalServices: count || 0 }))
    } catch (error) {
      console.error('Error fetching services count:', error)
    }
  }

  const fetchCompanyInfo = async (userId: string) => {
    try {
      // Get user's company_id from profile
      const supabase = getSupabaseClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', userId)
        .single()

      if (profile?.company_id) {
        // Fetch company information with more details
        const { data: company } = await supabase
          .from('companies')
          .select('name, description, type, business_type, founded_year, logo_url')
          .eq('id', profile.company_id)
          .single()

        if (company?.name) {
          setCompanyName(company.name)
          // Store additional company info for display
          setCompanyInfo(company)
        }
      }
    } catch (error) {
      console.error('Error fetching company info:', error)
    }
  }

  const fetchRecentBookings = async (userId: string) => {
    try {
      // Try to fetch recent bookings with error handling
      const supabase = getSupabaseClient()
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          subtotal,
          currency,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.log('Bookings query failed, using mock data')
        // Use mock data for demonstration
        const mockBookings: RecentBooking[] = [
          {
            id: '1',
            status: 'completed',
            subtotal: 250,
            currency: 'OMR',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            service: { title: 'Digital Marketing Campaign' },
            client: { full_name: 'Ahmed Al-Rashid' }
          },
          {
            id: '2',
            status: 'in_progress',
            subtotal: 180,
            currency: 'OMR',
            created_at: new Date(Date.now() - 172800000).toISOString(),
            service: { title: 'Website Development' },
            client: { full_name: 'Fatima Al-Zahra' }
          }
        ]
        setRecentBookings(mockBookings)
      } else if (bookings && bookings.length > 0) {
        // Transform the data to match the expected structure
        const transformedBookings: RecentBooking[] = bookings.map((booking: any) => ({
          id: booking.id,
          status: booking.status || 'pending',
          subtotal: booking.subtotal || 0,
          currency: booking.currency || 'OMR',
          created_at: booking.created_at,
          service: { title: 'Service' }, // Default value
          client: { full_name: 'Client' } // Default value
        }))
        setRecentBookings(transformedBookings)
      }
    } catch (error) {
      console.error('Error fetching recent bookings:', error)
    }
  }

  const fetchNotifications = async (userId: string) => {
    try {
      // Mock notifications for now
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'booking',
          title: 'New Booking Request',
          message: 'Ahmed Al-Rashid requested your Digital Marketing service',
          is_read: false,
          created_at: new Date(Date.now() - 1800000).toISOString(),
          priority: 'high'
        },
        {
          id: '2',
          type: 'payment',
          title: 'Payment Received',
          message: 'OMR 250 received for Digital Marketing Campaign',
          is_read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          priority: 'medium'
        },
        {
          id: '3',
          type: 'message',
          title: 'New Message',
          message: 'Fatima Al-Zahra sent you a message',
          is_read: true,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          priority: 'low'
        }
      ]
      setNotifications(mockNotifications)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const handleCreateService = () => {
    router.push('/dashboard/provider/services/create')
  }

  const handleBrowseServices = () => {
    if (userRole === 'provider') {
      router.push('/dashboard/provider/services')
    } else {
      router.push('/dashboard/services')
    }
  }

  const handleCompleteProfile = () => {
    router.push('/dashboard/profile')
  }

  const handleCompanySettings = () => {
    router.push('/dashboard/company')
  }

  const handleViewCalendar = () => {
    router.push('/dashboard/calendar')
  }

  const handleViewReports = () => {
    router.push('/dashboard/reports')
  }

  const handleRefresh = () => {
    fetchDashboardData()
    setLastRefresh(new Date())
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800'
      case 'delivered':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'in_progress':
        return <Clock className="h-4 w-4" />
      case 'pending_payment':
        return <AlertCircle className="h-4 w-4" />
      case 'delivered':
        return <Eye className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <Calendar className="h-4 w-4" />
      case 'payment':
        return <DollarSign className="h-4 w-4" />
      case 'message':
        return <MessageSquare className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/services/create">
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/profile">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Environment Checker - Only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-6">
          <EnvChecker />
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">+1 from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+4 from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2,450</div>
            <p className="text-xs text-muted-foreground">+20% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/dashboard/services">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Manage Services
              </CardTitle>
              <CardDescription>
                View, edit, and manage your business services
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/dashboard/calendar">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendar
              </CardTitle>
              <CardDescription>
                View and manage your appointments and bookings
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/dashboard/reports">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Reports
              </CardTitle>
              <CardDescription>
                View analytics and performance reports
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/dashboard/company">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Profile
              </CardTitle>
              <CardDescription>
                Manage your company information and settings
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/dashboard/profile">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Profile
              </CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/dashboard/services/create">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Service
              </CardTitle>
              <CardDescription>
                Create a new service offering for your business
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest updates and activities in your business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">New booking received</p>
                <p className="text-xs text-muted-foreground">Client booked "Web Development" service</p>
              </div>
              <Badge variant="secondary">2 min ago</Badge>
            </div>
            
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Service updated</p>
                <p className="text-xs text-muted-foreground">Updated pricing for "Consulting" service</p>
              </div>
              <Badge variant="secondary">1 hour ago</Badge>
            </div>
            
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Payment received</p>
                <p className="text-xs text-muted-foreground">Payment of $150 received for "Design" service</p>
              </div>
              <Badge variant="secondary">3 hours ago</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
