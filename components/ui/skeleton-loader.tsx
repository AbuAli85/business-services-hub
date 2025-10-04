/**
 * Skeleton Loader Components
 * Provides visual feedback while content is loading
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// ============================================================================
// Milestone Card Skeleton
// ============================================================================

export function MilestoneCardSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>

        {/* Tasks */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full rounded" />
          <Skeleton className="h-10 w-full rounded" />
          <Skeleton className="h-10 w-full rounded" />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Milestone List Skeleton
// ============================================================================

export function MilestoneListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <MilestoneCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ============================================================================
// Stats Card Skeleton
// ============================================================================

export function StatsCardSkeleton() {
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-14 w-14 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Stats Grid Skeleton
// ============================================================================

export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ============================================================================
// Table Skeleton
// ============================================================================

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-10 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Chart Skeleton
// ============================================================================

export function ChartSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Chart bars */}
          <div className="flex items-end justify-between h-48 gap-2">
            <Skeleton className="w-full h-3/4" />
            <Skeleton className="w-full h-full" />
            <Skeleton className="w-full h-1/2" />
            <Skeleton className="w-full h-2/3" />
            <Skeleton className="w-full h-4/5" />
            <Skeleton className="w-full h-3/5" />
          </div>
          {/* Legend */}
          <div className="flex gap-4 justify-center pt-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Form Skeleton
// ============================================================================

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded" />
        </div>
      ))}
      <div className="flex gap-2 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}

// ============================================================================
// Dashboard Header Skeleton
// ============================================================================

export function DashboardHeaderSkeleton() {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 bg-white/20" />
          <Skeleton className="h-5 w-96 bg-white/20" />
        </div>
        <div className="text-right space-y-2">
          <Skeleton className="h-10 w-20 bg-white/20 ml-auto" />
          <Skeleton className="h-4 w-24 bg-white/20 ml-auto" />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Timeline Skeleton
// ============================================================================

export function TimelineSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <Skeleton className="h-10 w-10 rounded-full" />
            {i < items - 1 && <Skeleton className="h-16 w-0.5 my-2" />}
          </div>
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Empty State (Not a skeleton, but useful for loading states)
// ============================================================================

export function EmptyState({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <div className="mb-4 rounded-full bg-muted p-4">
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      )}
    </div>
  )
}

