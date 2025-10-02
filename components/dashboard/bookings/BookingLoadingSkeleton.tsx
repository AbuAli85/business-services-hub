import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3 } from 'lucide-react'

export function BookingLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Enhanced Professional Header Skeleton */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <Skeleton className="h-8 w-64 bg-white/20" />
            </div>
            <Skeleton className="h-5 w-80 bg-white/20 mb-6" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <Skeleton className="h-4 w-24 bg-white/20 mb-2" />
                  <Skeleton className="h-6 w-16 bg-white/20" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32 bg-white/20" />
            <Skeleton className="h-10 w-10 bg-white/20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Filters Skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </CardContent>
      </Card>

      {/* Table Skeleton */}
      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border-b border-gray-100">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
