import { Card, CardContent } from '@/components/ui/card'
import { Play, CheckCircle, TrendingUp, Clock, Rocket } from 'lucide-react'
import { formatCurrency } from '@/lib/dashboard-data'

interface BookingStatsProps {
  stats: {
    total: number
    completed: number
    inProgress: number
    pending: number
    approved: number
    totalRevenue: number
    projectedBillings: number
    avgCompletionTime: number
    pendingApproval: number
    readyToLaunch: number
  }
}

export function BookingStats({ stats }: BookingStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* Next Actions Required */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-900 mb-1">
                {stats.total > 0 ? `${((stats.pendingApproval / stats.total) * 100).toFixed(1)}% of portfolio` : '0.0% of portfolio'}
              </div>
              <div className="text-sm text-green-700 font-medium">Next actions required • High priority</div>
            </div>
            <Play className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      {/* Success Rate */}
      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-emerald-900 mb-1">
                {stats.total > 0 ? `${((stats.completed / stats.total) * 100).toFixed(1)}% success rate` : '0.0% success rate'}
              </div>
              <div className="text-sm text-emerald-700 font-medium">Completed projects</div>
            </div>
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
        </CardContent>
      </Card>

      {/* Revenue */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-orange-900 mb-1">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <div className="text-sm text-orange-700 font-medium">
                OMR {(stats.totalRevenue / Math.max(stats.total, 1)).toFixed(2)} avg
              </div>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>

      {/* Awaiting Decision */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-900 mb-1">
                {stats.pendingApproval} Awaiting your decision
              </div>
              <div className="text-sm text-purple-700 font-medium">
                Action needed • {stats.pendingApproval} waiting
              </div>
            </div>
            <Clock className="h-8 w-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>

      {/* Ready to Launch */}
      <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-cyan-900 mb-1">
                {stats.readyToLaunch} Ready to launch projects
              </div>
              <div className="text-sm text-cyan-700 font-medium">
                All prerequisites met • Ready to launch projects • Active
              </div>
            </div>
            <Rocket className="h-8 w-8 text-cyan-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
