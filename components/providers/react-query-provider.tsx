'use client'

/**
 * React Query Provider for data fetching and caching
 * Wraps the app to enable React Query features globally
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import DevTools to avoid build issues
const ReactQueryDevtools = dynamic(
  () =>
    import('@tanstack/react-query-devtools').then((mod) => ({
      default: mod.ReactQueryDevtools,
    })),
  { ssr: false }
)

interface ReactQueryProviderProps {
  children: ReactNode
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  // Create a client with optimized defaults
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: How long data is considered fresh
            staleTime: 60 * 1000, // 1 minute
            
            // Cache time: How long inactive data stays in cache
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
            
            // Refetch on window focus for real-time feel
            refetchOnWindowFocus: true,
            
            // Retry failed requests
            retry: 1,
            
            // Don't refetch on mount if data is fresh
            refetchOnMount: 'always',
          },
          mutations: {
            // Retry failed mutations
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
        />
      )}
    </QueryClientProvider>
  )
}

