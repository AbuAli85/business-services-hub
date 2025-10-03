/**
 * Export utilities for bookings data
 * Supports CSV, PDF, and JSON formats
 */

import type { Booking } from '@/hooks/useBookings'

/**
 * Convert bookings data to CSV format
 */
export function exportToCSV(bookings: Booking[], filename: string = 'bookings-export.csv'): void {
  if (!bookings || bookings.length === 0) {
    throw new Error('No bookings data to export')
  }

  // Define CSV headers
  const headers = [
    'Booking ID',
    'Service Title',
    'Client Name',
    'Provider Name',
    'Status',
    'Approval Status',
    'Amount',
    'Currency',
    'Progress %',
    'Created Date',
    'Updated Date',
    'Scheduled Date'
  ]

  // Convert bookings to CSV rows
  const rows = bookings.map(booking => [
    booking.id || '',
    booking.service_title || 'N/A',
    booking.client_name || 'N/A',
    booking.provider_name || 'N/A',
    booking.status || '',
    booking.approval_status || '',
    booking.amount_cents ? (booking.amount_cents / 100).toFixed(2) : '0.00',
    booking.currency || 'OMR',
    booking.progress_percentage?.toFixed(0) || '0',
    formatDate(booking.created_at),
    formatDate(booking.updated_at),
    formatDate(booking.scheduled_date)
  ])

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  // Create and download file
  downloadFile(csvContent, filename, 'text/csv')
}

/**
 * Convert bookings data to PDF format
 */
export function exportToPDF(bookings: Booking[], filename: string = 'bookings-export.pdf'): void {
  if (!bookings || bookings.length === 0) {
    throw new Error('No bookings data to export')
  }

  // Create HTML content for PDF conversion
  const htmlContent = generatePDFHTML(bookings)
  
  // For PDF generation, we'll use the browser's print-to-PDF capability
  // Create a hidden iframe with the content
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  document.body.appendChild(iframe)
  
  const iframeDoc = iframe.contentWindow?.document
  if (!iframeDoc) {
    document.body.removeChild(iframe)
    throw new Error('Failed to create PDF iframe')
  }

  iframeDoc.open()
  iframeDoc.write(htmlContent)
  iframeDoc.close()

  // Trigger print dialog
  setTimeout(() => {
    iframe.contentWindow?.print()
    
    // Clean up after printing
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 1000)
  }, 500)
}

/**
 * Generate HTML content for PDF export
 */
function generatePDFHTML(bookings: Booking[]): string {
  const now = new Date().toLocaleString()
  
  const tableRows = bookings.map((booking, index) => `
    <tr style="${index % 2 === 0 ? 'background-color: #f9fafb;' : ''}">
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.id.substring(0, 8)}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.service_title || 'N/A'}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.client_name || 'N/A'}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.provider_name || 'N/A'}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">
        <span style="padding: 2px 8px; border-radius: 12px; background-color: ${getStatusColor(booking.status)}; color: white; font-size: 12px;">
          ${booking.status}
        </span>
      </td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.amount_cents ? (booking.amount_cents / 100).toFixed(2) : '0.00'} ${booking.currency || 'OMR'}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.progress_percentage?.toFixed(0) || '0'}%</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${formatDate(booking.created_at)}</td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Bookings Report</title>
      <style>
        @media print {
          body { margin: 0; padding: 20px; }
          .no-print { display: none; }
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #1f2937;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #3b82f6;
        }
        .header h1 {
          margin: 0;
          color: #1f2937;
          font-size: 24px;
        }
        .header .meta {
          color: #6b7280;
          font-size: 14px;
          margin-top: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 12px;
        }
        th {
          background-color: #3b82f6;
          color: white;
          padding: 10px 8px;
          text-align: left;
          border: 1px solid #2563eb;
          font-weight: 600;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Bookings Report</h1>
        <div class="meta">
          Generated: ${now} | Total Bookings: ${bookings.length}
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Service</th>
            <th>Client</th>
            <th>Provider</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Progress</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <div class="footer">
        <p>This report was automatically generated by the Marketing Dashboard</p>
        <p>© ${new Date().getFullYear()} Digital Morph - All rights reserved</p>
      </div>
    </body>
    </html>
  `
}

/**
 * Get color for booking status
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'pending': '#f59e0b',
    'approved': '#10b981',
    'in_progress': '#3b82f6',
    'completed': '#06b6d4',
    'cancelled': '#ef4444',
    'declined': '#dc2626',
    'on_hold': '#6b7280',
    'rescheduled': '#8b5cf6'
  }
  return colors[status.toLowerCase()] || '#6b7280'
}

/**
 * Format date for display
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return 'Invalid Date'
  }
}

/**
 * Download file with given content
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export single booking with detailed information
 */
export function exportSingleBookingPDF(booking: any, filename?: string): void {
  const htmlContent = generateSingleBookingPDF(booking)
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  document.body.appendChild(iframe)
  
  const iframeDoc = iframe.contentWindow?.document
  if (!iframeDoc) {
    document.body.removeChild(iframe)
    throw new Error('Failed to create PDF iframe')
  }

  iframeDoc.open()
  iframeDoc.write(htmlContent)
  iframeDoc.close()

  setTimeout(() => {
    iframe.contentWindow?.print()
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 1000)
  }, 500)
}

/**
 * Generate detailed single booking PDF
 */
function generateSingleBookingPDF(booking: any): string {
  const now = new Date().toLocaleString()
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Booking Details - ${booking.id}</title>
      <style>
        @media print {
          body { margin: 0; padding: 20px; }
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #1f2937;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 8px;
        }
        .section {
          margin: 20px 0;
          padding: 15px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }
        .section h3 {
          margin-top: 0;
          color: #3b82f6;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 8px;
        }
        .field {
          display: flex;
          margin: 8px 0;
        }
        .field-label {
          font-weight: 600;
          min-width: 150px;
          color: #6b7280;
        }
        .field-value {
          color: #1f2937;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 Booking Details</h1>
        <p>ID: ${booking.id}</p>
        <p style="font-size: 14px; opacity: 0.9;">Generated: ${now}</p>
      </div>
      
      <div class="section">
        <h3>📝 Basic Information</h3>
        <div class="field">
          <div class="field-label">Service:</div>
          <div class="field-value">${booking.service?.title || booking.title || 'N/A'}</div>
        </div>
        <div class="field">
          <div class="field-label">Status:</div>
          <div class="field-value">
            <span class="status-badge" style="background-color: ${getStatusColor(booking.status)}; color: white;">
              ${booking.status}
            </span>
          </div>
        </div>
        <div class="field">
          <div class="field-label">Created:</div>
          <div class="field-value">${formatDate(booking.created_at)}</div>
        </div>
        <div class="field">
          <div class="field-label">Scheduled:</div>
          <div class="field-value">${formatDate(booking.scheduled_date)}</div>
        </div>
      </div>
      
      <div class="section">
        <h3>👥 Participants</h3>
        <div class="field">
          <div class="field-label">Client:</div>
          <div class="field-value">${booking.client?.full_name || 'N/A'}</div>
        </div>
        <div class="field">
          <div class="field-label">Provider:</div>
          <div class="field-value">${booking.provider?.full_name || 'N/A'}</div>
        </div>
      </div>
      
      <div class="section">
        <h3>💰 Financial Details</h3>
        <div class="field">
          <div class="field-label">Amount:</div>
          <div class="field-value">${booking.amount || 0} ${booking.currency || 'OMR'}</div>
        </div>
        <div class="field">
          <div class="field-label">Payment Status:</div>
          <div class="field-value">${booking.payment_status || 'pending'}</div>
        </div>
      </div>
      
      <div class="section">
        <h3>📊 Progress</h3>
        <div class="field">
          <div class="field-label">Completion:</div>
          <div class="field-value">${booking.progress_percentage || 0}%</div>
        </div>
      </div>
      
      ${booking.notes ? `
      <div class="section">
        <h3>📝 Notes</h3>
        <p>${booking.notes}</p>
      </div>
      ` : ''}
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
        <p>This document was automatically generated by the Marketing Dashboard</p>
        <p>© ${new Date().getFullYear()} Digital Morph - All rights reserved</p>
      </div>
    </body>
    </html>
  `
}
