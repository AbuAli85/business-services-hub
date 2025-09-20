import { Card, CardContent } from '@/components/ui/card'
import { UserStats as UserStatsType } from '@/types/users'
import { Users, Activity, Clock, Shield } from 'lucide-react'

interface UserStatsProps {
  stats: UserStatsType
}

export function UserStats({ stats }: UserStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <Users className="h-8 w-8 text-blue-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Active Users</p>
              <p className="text-3xl font-bold">{stats.active}</p>
            </div>
            <Activity className="h-8 w-8 text-green-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Pending Review</p>
              <p className="text-3xl font-bold">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Verified Users</p>
              <p className="text-3xl font-bold">{stats.verified}</p>
            </div>
            <Shield className="h-8 w-8 text-purple-200" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

