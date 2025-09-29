'use client'

import React from 'react'

interface SkeletonProps {
  className?: string
}

export function AppSkeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded" />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="border rounded-lg p-4">
      <div className="h-32 bg-gray-200 rounded mb-3" />
      <SkeletonText lines={2} />
      <div className="h-8 bg-gray-200 rounded mt-3" />
    </div>
  )
}

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-100", className)}
      {...props}
    />
  )
}

export { Skeleton }
