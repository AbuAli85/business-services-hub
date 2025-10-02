import { Calendar } from 'lucide-react'

interface BookingEmptyStateProps {
  searchQuery: string
  statusFilter: string
  userRole: 'client' | 'provider' | 'admin' | null
}

export function BookingEmptyState({ searchQuery, statusFilter, userRole }: BookingEmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="flex flex-col items-center space-y-4">
        <div className="p-4 bg-gray-100 rounded-full">
          <Calendar className="h-8 w-8 text-gray-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || statusFilter !== 'all' 
              ? 'No bookings match your current filters. Try adjusting your search criteria.'
              : userRole === 'provider' 
                ? 'You don\'t have any bookings yet. Create a service to start receiving bookings.'
                : userRole === 'client'
                  ? 'You don\'t have any bookings yet. Browse services to make your first booking.'
                  : 'No bookings have been created yet.'
            }
          </p>
        </div>
      </div>
    </div>
  )
}
