'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDashboardData } from '@/hooks/useDashboardData'
import { User, Calendar, DollarSign } from 'lucide-react'

export default function ProviderClientsPage() {
  const { bookings, users, services, loading, error } = useDashboardData()

  const groups = useMemo(() => {
    // Group bookings by client for the current provider (clientId -> stats)
    const map: Record<string, { clientName: string; totalBookings: number; totalRevenue: number; lastBooking?: string }> = {}

    bookings.forEach(b => {
      // If services array has item with providerName matching, we keep it (demo-level; in real, filter by auth provider id)
      const service = services.find(s => s.id === b.serviceId)
      if (!service) return
      const client = users.find(u => u.id === b.clientId)
      if (!client) return
      const key = b.clientId
      if (!map[key]) {
        map[key] = { clientName: client.fullName, totalBookings: 0, totalRevenue: 0 }
      }
      map[key].totalBookings += 1
      map[key].totalRevenue += b.totalAmount
      if (!map[key].lastBooking || new Date(b.createdAt) > new Date(map[key].lastBooking!)) {
        map[key].lastBooking = b.createdAt
      }
    })

    return Object.entries(map)
      .map(([clientId, stats]) => ({ clientId, ...stats }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
  }, [bookings, users, services])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return <div className="text-red-600 p-6">Failed to load clients. Please try again.</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">My Clients</h1>
        <p className="text-blue-100">Clients who booked my services with aggregate stats</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map(client => (
          <Card key={client.clientId}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700">
                  <User className="h-4 w-4" />
                </span>
                {client.clientName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-gray-700">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{client.totalBookings} bookings</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span>{client.totalRevenue} OMR</span>
                </div>
              </div>
              {client.lastBooking && (
                <div className="mt-2 text-xs text-gray-500">Last booking: {new Date(client.lastBooking).toLocaleDateString()}</div>
              )}
              <div className="mt-3">
                <Badge variant="secondary">Client ID: {client.clientId}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}


