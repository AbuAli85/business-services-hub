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

// Simple circular progress component (replacement for deleted AnimatedProgressRing)
function CircularProgress({ progress, size = 120 }: { progress: number; size?: number }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-blue-500 transition-all duration-500"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

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
          {/* Overall progress top */}
          <div className="flex items-center gap-6 mb-6">
            <CircularProgress progress={(completedGoals / totalGoals) * 100} />
            <div>
              <div className="text-lg font-bold text-gray-900">Overall Progress</div>
              <p className="text-sm text-gray-600">{completedGoals} of {totalGoals} goals achieved</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((goal) => {
              const isCompleted = goal.progress >= 100
              const Icon = goal.icon
              
              return (
                <div key={goal.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <CircularProgress progress={Math.min(goal.progress, 100)} size={88} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <div className={`p-2 rounded-lg ${goal.bgColor}`}>
                            <Icon className={`h-4 w-4 ${goal.color}`} />
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{goal.title}</p>
                        </div>
                        {isCompleted && <Trophy className="h-5 w-5 text-yellow-500" />}
                      </div>
                      <p className="text-xs text-gray-500">
                        {goal.current.toLocaleString()}{goal.unit} / {goal.target.toLocaleString()}{goal.unit}
                      </p>
                      {isCompleted && (
                        <div className="flex items-center space-x-2 text-sm text-green-600 mt-2">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-medium">Goal achieved!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
