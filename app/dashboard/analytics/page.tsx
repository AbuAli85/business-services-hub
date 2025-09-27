'use client'

import { useState, useEffect } from 'react'
import { RoleBasedAnalytics } from '@/components/dashboard/analytics/RoleBasedAnalytics'
import { getUserAuth, hasRoleV2, type UserAuthResult } from '@/lib/user-auth'

export default function AnalyticsPage() {
  const [userRole, setUserRole] = useState<'admin' | 'provider' | 'client' | 'staff' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Get user role and ID
  useEffect(() => {
    (async () => {
      try {
        const authResult: UserAuthResult = await getUserAuth()
        
        if (!authResult.isAuthenticated || !authResult.user) {
          console.warn('User not authenticated')
          return
        }
        
        setUserId(authResult.user.id)
        setUserRole(authResult.role as 'admin' | 'provider' | 'client' | 'staff' | null)
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('User auth result:', {
            userId: authResult.user.id,
            role: authResult.role,
            hasProfile: !!authResult.profile,
            profileName: authResult.profile?.full_name
          })
        }
      } catch (e) {
        console.error('Error getting user auth:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Mock analytics data - in real app, this would come from API
  const getAnalyticsData = () => {
    const baseData = {
      totalRevenue: 125000,
      totalBookings: 342,
      avgRating: 4.7,
      conversionRate: 78.5,
      monthlyRevenue: 15000,
      monthlyGrowth: 12.5,
      weeklyBookings: 28,
      weeklyGrowth: 8.3
    }

    switch (userRole) {
      case 'admin':
        return {
          ...baseData,
          admin: {
            totalUsers: 1247,
            totalServices: 89,
            systemHealth: 'good' as const,
            pendingApprovals: 12
          }
        }
      case 'provider':
        return {
          ...baseData,
          provider: {
            totalServices: 8,
            activeServices: 6,
            completedBookings: 45,
            pendingBookings: 3,
            topPerformingService: 'Web Development',
            monthlyTarget: 20000,
            targetProgress: 75
          }
        }
      case 'client':
        return {
          ...baseData,
          client: {
            totalSpent: 2500,
            favoriteCategory: 'Web Development',
            savedServices: 12,
            upcomingBookings: 2,
            loyaltyLevel: 'gold' as const
          }
        }
      default:
        return baseData
    }
  }

  const handleExportData = () => {
    console.log('Exporting analytics data...')
    // In real app, this would trigger a download
  }

  const handleRefreshData = () => {
    console.log('Refreshing analytics data...')
    // In real app, this would refetch data
  }

  const handleViewDetails = (metric: string) => {
    console.log(`Viewing details for metric: ${metric}`)
    // In real app, this would navigate to detailed view
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <RoleBasedAnalytics
        role={userRole}
        data={getAnalyticsData()}
        onExportData={handleExportData}
        onRefreshData={handleRefreshData}
        onViewDetails={handleViewDetails}
      />
    </div>
  )
}