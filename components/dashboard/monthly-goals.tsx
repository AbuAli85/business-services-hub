'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Target, 
  Trophy, 
  TrendingUp, 
  DollarSign,
  Calendar,
  Star,
  CheckCircle,
  Clock
} from 'lucide-react'

interface MonthlyGoalsProps {
  data: {
    total_earnings: number
    monthly_earnings: number
    active_bookings: number
    avg_rating: number
    response_rate: number
    completion_rate: number
  }
  className?: string
}

export function MonthlyGoals({ data, className }: MonthlyGoalsProps) {
  // Define goals (these could be configurable in the future)
  const goals = {
    earnings: 5000, // OMR 5,000 monthly earnings goal
    bookings: 15, // 15 bookings per month goal
    rating: 4.5, // 4.5+ average rating goal
    response: 0.95, // 95% response rate goal
    completion: 0.90, // 90% completion rate goal
  }

  const achievements = [
    {
      id: 'earnings',
      title: 'Monthly Earnings',
      current: data.monthly_earnings,
      target: goals.earnings,
      unit: 'OMR',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      progress: Math.min((data.monthly_earnings / goals.earnings) * 100, 100)
    },
    {
      id: 'bookings',
      title: 'Active Bookings',
      current: data.active_bookings,
      target: goals.bookings,
      unit: '',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      progress: Math.min((data.active_bookings / goals.bookings) * 100, 100)
    },
    {
      id: 'rating',
      title: 'Average Rating',
      current: data.avg_rating || 0,
      target: goals.rating,
      unit: '',
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      progress: data.avg_rating ? Math.min((data.avg_rating / goals.rating) * 100, 100) : 0
    },
    {
      id: 'response',
      title: 'Response Rate',
      current: data.response_rate * 100,
      target: goals.response * 100,
      unit: '%',
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      progress: Math.min((data.response_rate / goals.response) * 100, 100)
    },
    {
      id: 'completion',
      title: 'Completion Rate',
      current: data.completion_rate * 100,
      target: goals.completion * 100,
      unit: '%',
      icon: CheckCircle,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      progress: Math.min((data.completion_rate / goals.completion) * 100, 100)
    }
  ]

  const completedGoals = achievements.filter(goal => goal.progress >= 100).length
  const totalGoals = achievements.length

  return (
    <div className={className}>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">Monthly Goals & Achievements</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Track your progress towards monthly targets</p>
            </div>
            <Badge variant="outline" className="text-sm px-3 py-1 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              {completedGoals}/{totalGoals} Completed
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((goal) => {
              const isCompleted = goal.progress >= 100
              const Icon = goal.icon
              
              return (
                <div key={goal.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 rounded-xl ${goal.bgColor}`}>
                        <Icon className={`h-5 w-5 ${goal.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{goal.title}</p>
                        <p className="text-xs text-gray-500">
                          {goal.current.toLocaleString()}{goal.unit} / {goal.target.toLocaleString()}{goal.unit}
                        </p>
                      </div>
                    </div>
                    {isCompleted && (
                      <Trophy className="h-6 w-6 text-yellow-500" />
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 font-medium">Progress</span>
                      <span className={`font-bold ${isCompleted ? 'text-green-600' : goal.color}`}>
                        {goal.progress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          isCompleted 
                            ? 'bg-gradient-to-r from-green-500 to-green-600' 
                            : `bg-gradient-to-r ${goal.color.replace('text-', 'from-').replace('-600', '-500')} to-${goal.color.replace('text-', '').replace('-600', '-600')}`
                        }`}
                        style={{ width: `${Math.min(goal.progress, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  {isCompleted && (
                    <div className="flex items-center space-x-2 text-sm text-green-600 mt-3">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Goal achieved!</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Overall Progress */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-lg font-bold text-gray-900">Overall Progress</span>
                <p className="text-sm text-gray-600">Monthly goal completion rate</p>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {Math.round((completedGoals / totalGoals) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${(completedGoals / totalGoals) * 100}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-3">
              {completedGoals} out of {totalGoals} goals completed this month
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
