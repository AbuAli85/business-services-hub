/**
 * Lazy loading configuration for heavy components
 * Improves initial page load performance
 */

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'

/**
 * Lazy load a component with loading and error states
 */
export function lazyLoad<P extends Record<string, any>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    ssr?: boolean
  }
) {
  return dynamic(importFn, {
    ssr: options?.ssr ?? true,
  })
}

// Pre-configured lazy loaded components for common heavy components
export const LazyEnhancedBookingDetails = lazyLoad(
  () => import('@/components/dashboard/enhanced-booking-details')
)

export const LazyDataTable = lazyLoad(
  () => import('@/components/dashboard/DataTable')
)

export const LazyBookingCalendar = lazyLoad(
  () => import('@/components/dashboard/bookings/BookingCalendar')
)

export const LazyInvoiceGenerator = lazyLoad(
  () => import('@/components/invoice/Invoice')
)

// Chart components - use direct dynamic imports for better type safety
export const LazyBarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.BarChart as any })),
  { ssr: false }
)

export const LazyLineChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart as any })),
  { ssr: false }
)

export const LazyPieChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PieChart as any })),
  { ssr: false }
)

export default {
  lazyLoad,
  LazyEnhancedBookingDetails,
  LazyDataTable,
  LazyBookingCalendar,
  LazyInvoiceGenerator,
  LazyBarChart,
  LazyLineChart,
  LazyPieChart,
}

