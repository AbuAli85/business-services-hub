'use client'

import { UserRole } from '@/types/progress'

interface MilestoneManagementProps {
  bookingId: string
  userRole: UserRole
}

export function MilestoneManagement({ bookingId, userRole }: MilestoneManagementProps) {
    return (
    <div className="p-4 border rounded bg-yellow-50 text-yellow-800 text-sm">
      Milestone management has been consolidated into the main progress system.
      </div>
    )
  }

export default MilestoneManagement


