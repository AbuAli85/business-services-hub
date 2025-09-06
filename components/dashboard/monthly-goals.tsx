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
    earnings: 10000, // $10,000 monthly earnings goal
    bookings: 20, // 20 bookings per month goal
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
      unit: '$',
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">Monthly Goals & Achievements</CardTitle>
            <Badge variant="outline" className="text-sm">
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
                <div key={goal.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-lg ${goal.bgColor}`}>
                        <Icon className={`h-4 w-4 ${goal.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{goal.title}</p>
                        <p className="text-xs text-gray-500">
                          {goal.current.toLocaleString()}{goal.unit} / {goal.target.toLocaleString()}{goal.unit}
                        </p>
                      </div>
                    </div>
                    {isCompleted && (
                      <Trophy className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Progress</span>
                      <span className={`font-medium ${isCompleted ? 'text-green-600' : goal.color}`}>
                        {goal.progress.toFixed(0)}%
                      </span>
                    </div>
                    <Progress 
                      value={goal.progress} 
                      className="h-2"
                    />
                  </div>
                  
                  {isCompleted && (
                    <div className="flex items-center space-x-1 text-xs text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span>Goal achieved!</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Overall Progress */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">Overall Progress</span>
              <span className="text-sm font-bold text-gray-900">
                {Math.round((completedGoals / totalGoals) * 100)}%
              </span>
            </div>
            <Progress 
              value={(completedGoals / totalGoals) * 100} 
              className="h-3"
            />
            <p className="text-xs text-gray-600 mt-2">
              {completedGoals} out of {totalGoals} goals completed this month
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
