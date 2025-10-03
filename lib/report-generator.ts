/**
 * Advanced report generation system for bookings analytics
 */

import type { Booking } from '@/hooks/useBookings'

export interface ReportOptions {
  dateRange?: {
    start: Date
    end: Date
  }
  groupBy?: 'status' | 'client' | 'provider' | 'month' | 'service'
  includeCharts?: boolean
  format?: 'html' | 'pdf' | 'json'
}

export interface ReportData {
  metadata: {
    title: string
    generatedAt: Date
    dateRange?: {
      start: Date
      end: Date
    }
    totalBookings: number
  }
  summary: {
    totalRevenue: number
    averageBookingValue: number
    completionRate: number
    averageProgress: number
    statusBreakdown: Record<string, number>
  }
  analytics: {
    byStatus: Array<{ status: string; count: number; revenue: number }>
    byClient: Array<{ client: string; count: number; revenue: number }>
    byProvider: Array<{ provider: string; count: number; revenue: number }>
    byMonth: Array<{ month: string; count: number; revenue: number }>
    byService: Array<{ service: string; count: number; revenue: number }>
  }
  trends: {
    growthRate: number
    averageCompletionTime: number
    topServices: Array<{ service: string; count: number }>
    topClients: Array<{ client: string; count: number }>
  }
}

/**
 * Generate comprehensive report from bookings data
 */
export function generateReport(bookings: Booking[], options: ReportOptions = {}): ReportData {
  const { dateRange, groupBy = 'status' } = options

  // Filter by date range if provided
  let filteredBookings = bookings
  if (dateRange) {
    filteredBookings = bookings.filter(b => {
      const createdAt = new Date(b.created_at)
      return createdAt >= dateRange.start && createdAt <= dateRange.end
    })
  }

  // Calculate summary statistics
  const summary = calculateSummary(filteredBookings)
  
  // Generate analytics
  const analytics = generateAnalytics(filteredBookings)
  
  // Calculate trends
  const trends = calculateTrends(filteredBookings)

  return {
    metadata: {
      title: 'Bookings Analytics Report',
      generatedAt: new Date(),
      dateRange,
      totalBookings: filteredBookings.length
    },
    summary,
    analytics,
    trends
  }
}

/**
 * Calculate summary statistics
 */
function calculateSummary(bookings: Booking[]): ReportData['summary'] {
  const totalRevenue = bookings.reduce((sum, b) => {
    return sum + (b.amount_cents ? b.amount_cents / 100 : 0)
  }, 0)

  const averageBookingValue = bookings.length > 0 ? totalRevenue / bookings.length : 0

  const completedBookings = bookings.filter(b => b.status === 'completed').length
  const completionRate = bookings.length > 0 ? (completedBookings / bookings.length) * 100 : 0

  const averageProgress = bookings.length > 0
    ? bookings.reduce((sum, b) => sum + (b.progress_percentage || 0), 0) / bookings.length
    : 0

  // Status breakdown
  const statusBreakdown: Record<string, number> = {}
  bookings.forEach(b => {
    const status = b.status || 'unknown'
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1
  })

  return {
    totalRevenue,
    averageBookingValue,
    completionRate,
    averageProgress,
    statusBreakdown
  }
}

/**
 * Generate detailed analytics
 */
function generateAnalytics(bookings: Booking[]): ReportData['analytics'] {
  // Analytics by status
  const byStatusMap = new Map<string, { count: number; revenue: number }>()
  bookings.forEach(b => {
    const status = b.status || 'unknown'
    const current = byStatusMap.get(status) || { count: 0, revenue: 0 }
    byStatusMap.set(status, {
      count: current.count + 1,
      revenue: current.revenue + (b.amount_cents ? b.amount_cents / 100 : 0)
    })
  })
  const byStatus = Array.from(byStatusMap.entries()).map(([status, data]) => ({
    status,
    ...data
  }))

  // Analytics by client
  const byClientMap = new Map<string, { count: number; revenue: number }>()
  bookings.forEach(b => {
    const client = b.client_name || 'Unknown'
    const current = byClientMap.get(client) || { count: 0, revenue: 0 }
    byClientMap.set(client, {
      count: current.count + 1,
      revenue: current.revenue + (b.amount_cents ? b.amount_cents / 100 : 0)
    })
  })
  const byClient = Array.from(byClientMap.entries())
    .map(([client, data]) => ({ client, ...data }))
    .sort((a, b) => b.revenue - a.revenue)

  // Analytics by provider
  const byProviderMap = new Map<string, { count: number; revenue: number }>()
  bookings.forEach(b => {
    const provider = b.provider_name || 'Unknown'
    const current = byProviderMap.get(provider) || { count: 0, revenue: 0 }
    byProviderMap.set(provider, {
      count: current.count + 1,
      revenue: current.revenue + (b.amount_cents ? b.amount_cents / 100 : 0)
    })
  })
  const byProvider = Array.from(byProviderMap.entries())
    .map(([provider, data]) => ({ provider, ...data }))
    .sort((a, b) => b.revenue - a.revenue)

  // Analytics by month
  const byMonthMap = new Map<string, { count: number; revenue: number }>()
  bookings.forEach(b => {
    const date = new Date(b.created_at)
    const month = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    const current = byMonthMap.get(month) || { count: 0, revenue: 0 }
    byMonthMap.set(month, {
      count: current.count + 1,
      revenue: current.revenue + (b.amount_cents ? b.amount_cents / 100 : 0)
    })
  })
  const byMonth = Array.from(byMonthMap.entries()).map(([month, data]) => ({
    month,
    ...data
  }))

  // Analytics by service
  const byServiceMap = new Map<string, { count: number; revenue: number }>()
  bookings.forEach(b => {
    const service = b.service_title || 'Unknown'
    const current = byServiceMap.get(service) || { count: 0, revenue: 0 }
    byServiceMap.set(service, {
      count: current.count + 1,
      revenue: current.revenue + (b.amount_cents ? b.amount_cents / 100 : 0)
    })
  })
  const byService = Array.from(byServiceMap.entries())
    .map(([service, data]) => ({ service, ...data }))
    .sort((a, b) => b.count - a.count)

  return {
    byStatus,
    byClient,
    byProvider,
    byMonth,
    byService
  }
}

/**
 * Calculate trend data
 */
function calculateTrends(bookings: Booking[]): ReportData['trends'] {
  // Sort bookings by date
  const sortedBookings = [...bookings].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  // Calculate growth rate (simple month-over-month)
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

  const lastMonthBookings = bookings.filter(b => {
    const date = new Date(b.created_at)
    return date >= lastMonth && date < now
  }).length

  const prevMonthBookings = bookings.filter(b => {
    const date = new Date(b.created_at)
    return date >= twoMonthsAgo && date < lastMonth
  }).length

  const growthRate = prevMonthBookings > 0
    ? ((lastMonthBookings - prevMonthBookings) / prevMonthBookings) * 100
    : 0

  // Average completion time (mock for now)
  const averageCompletionTime = 7.5 // days

  // Top services
  const serviceCount = new Map<string, number>()
  bookings.forEach(b => {
    const service = b.service_title || 'Unknown'
    serviceCount.set(service, (serviceCount.get(service) || 0) + 1)
  })
  const topServices = Array.from(serviceCount.entries())
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Top clients
  const clientCount = new Map<string, number>()
  bookings.forEach(b => {
    const client = b.client_name || 'Unknown'
    clientCount.set(client, (clientCount.get(client) || 0) + 1)
  })
  const topClients = Array.from(clientCount.entries())
    .map(([client, count]) => ({ client, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    growthRate,
    averageCompletionTime,
    topServices,
    topClients
  }
}

/**
 * Export report as HTML
 */
export function exportReportAsHTML(report: ReportData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${report.metadata.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 40px;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
    }
    .header .meta {
      margin-top: 15px;
      opacity: 0.9;
      font-size: 16px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .metric-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .metric-card h3 {
      margin: 0 0 10px 0;
      color: #6b7280;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .metric-card .value {
      font-size: 32px;
      font-weight: 700;
      color: #1f2937;
    }
    .section {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 30px;
      margin-bottom: 30px;
    }
    .section h2 {
      margin-top: 0;
      color: #3b82f6;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th {
      background: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:hover {
      background: #f9fafb;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .chart-placeholder {
      background: #f3f4f6;
      border: 2px dashed #d1d5db;
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      color: #6b7280;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 ${report.metadata.title}</h1>
    <div class="meta">
      Generated: ${report.metadata.generatedAt.toLocaleString()} | 
      Total Bookings: ${report.metadata.totalBookings}
      ${report.metadata.dateRange ? `<br>Date Range: ${report.metadata.dateRange.start.toLocaleDateString()} - ${report.metadata.dateRange.end.toLocaleDateString()}` : ''}
    </div>
  </div>

  <div class="summary">
    <div class="metric-card">
      <h3>Total Revenue</h3>
      <div class="value">${report.summary.totalRevenue.toFixed(2)} OMR</div>
    </div>
    <div class="metric-card">
      <h3>Avg Booking Value</h3>
      <div class="value">${report.summary.averageBookingValue.toFixed(2)} OMR</div>
    </div>
    <div class="metric-card">
      <h3>Completion Rate</h3>
      <div class="value">${report.summary.completionRate.toFixed(1)}%</div>
    </div>
    <div class="metric-card">
      <h3>Avg Progress</h3>
      <div class="value">${report.summary.averageProgress.toFixed(0)}%</div>
    </div>
  </div>

  <div class="section">
    <h2>📈 Status Breakdown</h2>
    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>Count</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(report.summary.statusBreakdown).map(([status, count]) => `
          <tr>
            <td style="text-transform: capitalize;">${status}</td>
            <td>${count}</td>
            <td>${((count / report.metadata.totalBookings) * 100).toFixed(1)}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>💰 Revenue by Client</h2>
    <table>
      <thead>
        <tr>
          <th>Client</th>
          <th>Bookings</th>
          <th>Revenue</th>
        </tr>
      </thead>
      <tbody>
        ${report.analytics.byClient.slice(0, 10).map(item => `
          <tr>
            <td>${item.client}</td>
            <td>${item.count}</td>
            <td>${item.revenue.toFixed(2)} OMR</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>🎯 Top Services</h2>
    <table>
      <thead>
        <tr>
          <th>Service</th>
          <th>Bookings</th>
        </tr>
      </thead>
      <tbody>
        ${report.trends.topServices.map(item => `
          <tr>
            <td>${item.service}</td>
            <td>${item.count}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>📊 Trends & Insights</h2>
    <div class="metric-card" style="margin-bottom: 20px;">
      <h3>Growth Rate (Month-over-Month)</h3>
      <div class="value" style="color: ${report.trends.growthRate >= 0 ? '#10b981' : '#ef4444'}">
        ${report.trends.growthRate >= 0 ? '+' : ''}${report.trends.growthRate.toFixed(1)}%
      </div>
    </div>
    <div class="metric-card">
      <h3>Average Completion Time</h3>
      <div class="value">${report.trends.averageCompletionTime} days</div>
    </div>
  </div>

  <div class="footer">
    <p>This report was automatically generated by the Marketing Dashboard</p>
    <p>© ${new Date().getFullYear()} Digital Morph - All rights reserved</p>
  </div>
</body>
</html>
  `
}

/**
 * Download report
 */
export function downloadReport(report: ReportData, format: 'html' | 'json' = 'html'): void {
  if (format === 'html') {
    const html = exportReportAsHTML(report)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bookings-report-${new Date().toISOString().split('T')[0]}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } else {
    const json = JSON.stringify(report, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bookings-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

