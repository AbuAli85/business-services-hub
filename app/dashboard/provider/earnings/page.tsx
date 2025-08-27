'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseClient } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  BarChart3,
  PieChart,
  Target,
  Award,
  CreditCard,
  Banknote
} from 'lucide-react'

interface Earning {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed'
  source: 'service' | 'package' | 'consultation'
  booking_id: string
  created_at: string
  service_title: string
  client_name: string
}

interface EarningStats {
  totalEarnings: number
  monthlyEarnings: number
  pendingPayments: number
  completedPayments: number
  averagePerService: number
  growthRate: number
  topEarningMonth: string
  totalServices: number
}

interface Invoice {
  id: string
  booking_id: string
  client_id: string
  provider_id: string
  amount: number
  currency: string
  status: 'draft' | 'issued' | 'paid' | 'void'
  created_at: string
  invoice_pdf_url?: string | null
  bookings?: { services?: { title?: string } | null } | null
  clients?: { full_name?: string } | null
}

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<EarningStats>({
    totalEarnings: 0,
    monthlyEarnings: 0,
    pendingPayments: 0,
    completedPayments: 0,
    averagePerService: 0,
    growthRate: 0,
    topEarningMonth: '',
    totalServices: 0
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30')
  const [selectedMonth, setSelectedMonth] = useState('')

  useEffect(() => {
    fetchEarningsData()
  }, [timeRange, selectedMonth])

  const fetchEarningsData = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch payments as earnings for this provider
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount, currency, status, booking_id, created_at, bookings(service_id, services(title)), client_profile:profiles!client_id(full_name)')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false })

      let liveEarnings: Earning[] = []
      if (!paymentsError && paymentsData) {
        liveEarnings = paymentsData.map((p: any) => ({
          id: p.id,
          amount: p.amount || 0,
          currency: (p.currency || 'OMR').toUpperCase(),
          status: (p.status === 'succeeded' || p.status === 'paid') ? 'completed' : (p.status === 'processing' ? 'pending' : 'failed'),
          source: 'service',
          booking_id: p.booking_id,
          created_at: p.created_at,
          service_title: p.bookings?.services?.title || 'Service',
          client_name: p.client_profile?.full_name || 'Client'
        }))
      }

      // If no live earnings, keep previous UI meaningful with empty state
      setEarnings(liveEarnings)

      // Fetch invoices for this provider
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('id, booking_id, client_id, provider_id, amount, currency, status, created_at, invoice_pdf_url, bookings(services(title)), client_profile:profiles!client_id(full_name)')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false })
      setInvoices((invoicesData || []) as any)

      // Calculate stats
      const totalEarnings = liveEarnings
        .filter(e => e.status === 'completed')
        .reduce((sum, e) => sum + e.amount, 0)

      const monthlyEarnings = liveEarnings
        .filter(e => e.status === 'completed' && 
          new Date(e.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .reduce((sum, e) => sum + e.amount, 0)

      const pendingPayments = liveEarnings
        .filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + e.amount, 0)

      const completedPayments = liveEarnings
        .filter(e => e.status === 'completed')
        .length

      setStats({
        totalEarnings,
        monthlyEarnings,
        pendingPayments,
        completedPayments,
        averagePerService: totalEarnings / completedPayments || 0,
        growthRate: 12.5, // Mock growth rate
        topEarningMonth: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        totalServices: liveEarnings.length
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching earnings data:', error)
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'service':
        return <BarChart3 className="h-4 w-4" />
      case 'package':
        return <PieChart className="h-4 w-4" />
      case 'consultation':
        return <Target className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'service':
        return 'Service'
      case 'package':
        return 'Package'
      case 'consultation':
        return 'Consultation'
      default:
        return source
    }
  }

  const exportEarnings = () => {
    // Mock export functionality
    const csvContent = [
      'Date,Service,Client,Amount,Status,Source',
      ...earnings.map(e => 
        `${formatDate(e.created_at)},${e.service_title},${e.client_name},${e.amount} ${e.currency},${e.status},${getSourceLabel(e.source)}`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `earnings-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Earnings & Payments</h1>
          <p className="text-gray-600 mt-2">
            Track your income, payments, and financial performance
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportEarnings}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalEarnings, 'OMR')}
            </div>
            <p className="text-xs text-muted-foreground">
              All time earnings
            </p>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-xs text-green-600">+{stats.growthRate}% this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Earnings</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.monthlyEarnings, 'OMR')}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
            <div className="flex items-center mt-2">
              <Award className="h-3 w-3 text-blue-500 mr-1" />
              <span className="text-xs text-blue-600">Best month: {stats.topEarningMonth}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(stats.pendingPayments, 'OMR')}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
            <div className="flex items-center mt-2">
              <AlertCircle className="h-3 w-3 text-yellow-500 mr-1" />
              <span className="text-xs text-yellow-600">Requires attention</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Per Service</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(stats.averagePerService, 'OMR')}
            </div>
            <p className="text-xs text-muted-foreground">
              Average earnings per service
            </p>
            <div className="flex items-center mt-2">
              <Target className="h-3 w-3 text-purple-500 mr-1" />
              <span className="text-xs text-purple-600">Based on {stats.completedPayments} services</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Bank Transfer</span>
                <span className="text-sm font-medium">60%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Credit Card</span>
                <span className="text-sm font-medium">30%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Cash</span>
                <span className="text-sm font-medium">10%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Sources</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Services</span>
                <span className="text-sm font-medium">70%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Packages</span>
                <span className="text-sm font-medium">20%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Consultations</span>
                <span className="text-sm font-medium">10%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Completed</span>
                <span className="text-sm font-medium text-green-600">{stats.completedPayments}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Pending</span>
                <span className="text-sm font-medium text-yellow-600">
                  {earnings.filter(e => e.status === 'pending').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Failed</span>
                <span className="text-sm font-medium text-red-600">
                  {earnings.filter(e => e.status === 'failed').length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Earnings History
          </CardTitle>
          <CardDescription>
            Detailed breakdown of all your earnings and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No earnings yet</p>
              <p className="text-sm mb-4">
                Start by completing services and receiving payments
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {earnings.map((earning) => (
                <div
                  key={earning.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      earning.status === 'completed' ? 'bg-green-100' : 
                      earning.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      {getSourceIcon(earning.source)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{earning.service_title}</h4>
                      <p className="text-sm text-gray-500">Client: {earning.client_name}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="secondary">{getSourceLabel(earning.source)}</Badge>
                        <Badge className={getStatusColor(earning.status)}>
                          {earning.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(earning.amount, earning.currency)}
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatDate(earning.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Invoices
          </CardTitle>
          <CardDescription>Download receipts for your completed payments</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Banknote className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No invoices yet</p>
              <p className="text-sm">Invoices will appear here after successful payments.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900">{inv.bookings?.services?.title || 'Service'}</div>
                    <div className="text-sm text-gray-500">
                      {formatDate(inv.created_at)} • {inv.clients?.full_name || 'Client'} • #{inv.id.slice(0,8)}
                    </div>
                    <div className="text-xs">
                      <Badge className={
                        inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                        inv.status === 'issued' ? 'bg-blue-100 text-blue-800' :
                        inv.status === 'void' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }>
                        {inv.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">{formatCurrency(inv.amount || 0, inv.currency || 'OMR')}</div>
                    </div>
                    {inv.invoice_pdf_url ? (
                      <a href={inv.invoice_pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
                        <Download className="h-4 w-4 mr-2" /> Download
                      </a>
                    ) : (
                      <Button variant="outline" disabled>
                        <Download className="h-4 w-4 mr-2" /> Pending PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and actions for managing your earnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <Download className="h-6 w-6" />
              <span>Download Report</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <BarChart3 className="h-6 w-6" />
              <span>View Analytics</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <CreditCard className="h-6 w-6" />
              <span>Payment Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
