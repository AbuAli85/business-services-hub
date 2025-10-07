import { useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

interface ReportFilters {
  dateFrom?: Date
  dateTo?: Date
  status?: string
  bookingId?: string
}

interface BookingReportData {
  booking: {
    id: string
    title: string
    status: string
    raw_status: string
    progress: number
    created_at: string
    updated_at: string
    due_at?: string
    scheduled_date?: string
    estimated_duration?: string
    location?: string
    requirements?: string
    notes?: string
  }
  client: {
    id: string
    name: string
    email: string
    company: string
    avatar: string
  }
  provider: {
    id: string
    name: string
    email: string
    company: string
    avatar: string
  }
  service: {
    id: string
    title: string
    description: string
    category: string
  }
  payment: {
    amount: number
    amount_cents: number
    currency: string
    status: string
    invoice_status: string
  }
  milestones: {
    total: number
    completed: number
    completion_rate: number
    details: Array<{
      id: string
      title: string
      description: string
      status: string
      created_at: string
      completed_at?: string
    }>
  }
  tasks: {
    total: number
    completed: number
    completion_rate: number
    details: Array<{
      id: string
      title: string
      description: string
      status: string
      priority: string
      created_at: string
      completed_at?: string
    }>
  }
  communications: {
    total_messages: number
    details: Array<{
      id: string
      content: string
      sender_id: string
      receiver_id: string
      created_at: string
    }>
  }
  files: {
    total_files: number
    details: Array<{
      id: string
      filename: string
      file_type: string
      file_size: number
      uploaded_at: string
    }>
  }
  invoice?: {
    id: string
    invoice_number: string
    status: string
    amount: number
    due_date: string
    created_at: string
  }
  analytics: {
    duration_days?: number
    days_since_created: number
    days_until_due?: number
    overall_progress: number
  }
}

interface SummaryReportData {
  summary: {
    total_bookings: number
    total_revenue: number
    average_progress: number
    period: {
      from: string | null
      to: string | null
    }
  }
  breakdown: {
    by_status: Record<string, number>
    by_category: Record<string, number>
    by_month: Record<string, { count: number; revenue: number }>
  }
  bookings: Array<{
    id: string
    title: string
    status: string
    client_name: string
    provider_name: string
    service_title: string
    progress: number
    amount: number
    currency: string
    created_at: string
    due_at?: string
  }>
}

export function useBookingReports() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [summaryData, setSummaryData] = useState<SummaryReportData | null>(null)
  const [detailedReport, setDetailedReport] = useState<BookingReportData | null>(null)

  const loadSummaryReport = useCallback(async (filters: ReportFilters = {}) => {
    if (!user) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.dateFrom) params.append('date_from', filters.dateFrom.toISOString())
      if (filters.dateTo) params.append('date_to', filters.dateTo.toISOString())
      if (filters.status) params.append('status', filters.status)

      const response = await fetch(`/api/reports/bookings?${params}`)
      const data = await response.json()

      if (data.success) {
        setSummaryData(data.report)
        return data.report
      } else {
        toast.error('Failed to load summary report')
        return null
      }
    } catch (error) {
      console.error('Error loading summary report:', error)
      toast.error('Failed to load summary report')
      return null
    } finally {
      setLoading(false)
    }
  }, [user])

  const loadDetailedReport = useCallback(async (bookingId: string) => {
    if (!user) return

    setLoading(true)
    try {
      const response = await fetch(`/api/reports/bookings?booking_id=${bookingId}&type=detailed`)
      const data = await response.json()

      if (data.success) {
        setDetailedReport(data.report)
        return data.report
      } else {
        toast.error('Failed to load detailed report')
        return null
      }
    } catch (error) {
      console.error('Error loading detailed report:', error)
      toast.error('Failed to load detailed report')
      return null
    } finally {
      setLoading(false)
    }
  }, [user])

  const exportReport = useCallback(async (format: 'pdf' | 'excel', filters: ReportFilters = {}, bookingId?: string) => {
    if (!user) return

    try {
      const params = new URLSearchParams()
      if (bookingId) {
        params.append('booking_id', bookingId)
        params.append('type', 'detailed')
      }
      if (filters.dateFrom) params.append('date_from', filters.dateFrom.toISOString())
      if (filters.dateTo) params.append('date_to', filters.dateTo.toISOString())
      if (filters.status) params.append('status', filters.status)
      params.append('format', format)

      const response = await fetch(`/api/reports/bookings?${params}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${bookingId ? 'booking' : 'bookings'}-report-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast.success(`Report exported as ${format.toUpperCase()}`)
        return true
      } else {
        toast.error('Failed to export report')
        return false
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export report')
      return false
    }
  }, [user])

  const generateReport = useCallback(async (type: 'summary' | 'detailed', filters: ReportFilters = {}, bookingId?: string) => {
    if (!user) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (bookingId) {
        params.append('booking_id', bookingId)
        params.append('type', 'detailed')
      } else {
        params.append('type', 'summary')
      }
      if (filters.dateFrom) params.append('date_from', filters.dateFrom.toISOString())
      if (filters.dateTo) params.append('date_to', filters.dateTo.toISOString())
      if (filters.status) params.append('status', filters.status)

      const response = await fetch(`/api/reports/bookings?${params}`)
      const data = await response.json()

      if (data.success) {
        if (type === 'summary') {
          setSummaryData(data.report)
        } else {
          setDetailedReport(data.report)
        }
        return data.report
      } else {
        toast.error(`Failed to generate ${type} report`)
        return null
      }
    } catch (error) {
      console.error(`Error generating ${type} report:`, error)
      toast.error(`Failed to generate ${type} report`)
      return null
    } finally {
      setLoading(false)
    }
  }, [user])

  const clearReports = useCallback(() => {
    setSummaryData(null)
    setDetailedReport(null)
  }, [])

  return {
    loading,
    summaryData,
    detailedReport,
    loadSummaryReport,
    loadDetailedReport,
    exportReport,
    generateReport,
    clearReports
  }
}
