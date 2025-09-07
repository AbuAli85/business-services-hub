'use client'

export function MilestoneSkeleton() {
  return (
    <div className="p-4 border rounded-lg bg-white animate-pulse space-y-3">
      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      <div className="h-2 bg-gray-200 rounded w-full"></div>
      <div className="h-2 bg-gray-200 rounded w-5/6"></div>
    </div>
  )
}

export function TaskSkeleton() {
  return (
    <div className="p-3 border rounded-lg bg-white animate-pulse flex items-center gap-3">
      <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        <div className="h-2 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  )
}

export function CommentSkeleton() {
  return (
    <div className="p-3 border rounded-lg bg-white animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="h-3 bg-gray-200 rounded w-24"></div>
        <div className="h-3 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="h-2 bg-gray-200 rounded w-5/6"></div>
    </div>
  )
}

export function ActionRequestSkeleton() {
  return (
    <div className="p-4 border rounded-lg bg-white animate-pulse space-y-2">
      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
      <div className="h-2 bg-gray-200 rounded w-2/3"></div>
      <div className="h-2 bg-gray-200 rounded w-1/2"></div>
    </div>
  )
}


