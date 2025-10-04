/**
 * Lazy-loaded tab components for better performance
 * Heavy components are only loaded when their tab is active
 */

'use client'

import { lazy, Suspense } from 'react'
import { ChartSkeleton, TableSkeleton, TimelineSkeleton, FormSkeleton } from '@/components/ui/skeleton-loader'

// ============================================================================
// Lazy-loaded Components
// ============================================================================

// Analytics Tab
export const LazyAnalyticsTab = lazy(() => 
  import('./analytics-tab').then(module => ({ default: module.AnalyticsTab }))
)

// Performance Monitor Tab
export const LazyPerformanceTab = lazy(() => 
  import('./performance-monitor').then(module => ({ default: module.PerformanceMonitor }))
)

// Audit Trail Tab
export const LazyAuditTrailTab = lazy(() => 
  import('./audit-trail').then(module => ({ default: module.AuditTrail }))
)

// Documents Tab
export const LazyDocumentsTab = lazy(() => 
  import('./documents-tab').then(module => ({ default: module.DocumentsTab }))
)

// Notifications Tab
export const LazyNotificationsTab = lazy(() => 
  import('./notification-settings').then(module => ({ default: module.NotificationSettings }))
)

// ============================================================================
// Wrapper Components with Suspense
// ============================================================================

export function AnalyticsTabWrapper(props: any) {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <LazyAnalyticsTab {...props} />
    </Suspense>
  )
}

export function PerformanceTabWrapper(props: any) {
  return (
    <Suspense fallback={<PerformanceSkeleton />}>
      <LazyPerformanceTab {...props} />
    </Suspense>
  )
}

export function AuditTrailTabWrapper(props: any) {
  return (
    <Suspense fallback={<AuditTrailSkeleton />}>
      <LazyAuditTrailTab {...props} />
    </Suspense>
  )
}

export function DocumentsTabWrapper(props: any) {
  return (
    <Suspense fallback={<DocumentsSkeleton />}>
      <LazyDocumentsTab {...props} />
    </Suspense>
  )
}

export function NotificationsTabWrapper(props: any) {
  return (
    <Suspense fallback={<NotificationsSkeleton />}>
      <LazyNotificationsTab {...props} />
    </Suspense>
  )
}

// ============================================================================
// Custom Skeletons for Each Tab
// ============================================================================

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  )
}

function PerformanceSkeleton() {
  return (
    <div className="space-y-6">
      <ChartSkeleton />
      <TableSkeleton rows={8} columns={5} />
    </div>
  )
}

function AuditTrailSkeleton() {
  return (
    <div className="space-y-4">
      <TimelineSkeleton items={10} />
    </div>
  )
}

function DocumentsSkeleton() {
  return (
    <div className="space-y-4">
      <TableSkeleton rows={6} columns={4} />
    </div>
  )
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-6">
      <FormSkeleton fields={6} />
    </div>
  )
}

