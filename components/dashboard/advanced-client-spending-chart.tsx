'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart, PieChart, Pie, Cell } from 'recharts'
import { Wallet, TrendingUp, Calendar, Target } from 'lucide-react'
import { useState } from 'react'

interface ClientStats {
  totalBookings: number
  activeBookings: number
  completedBookings: number
  totalSpent: number
  monthlySpent: number
  averageRating: number
  totalReviews: number
  favoriteProviders: number
}

interface AdvancedClientSpendingChartProps {
  data: ClientStats
  className?: string
}

export function AdvancedClientSpendingChart({ data, className }: AdvancedClientSpendingChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'pie'>('bar')
  
  const formatCurrency = (amount: number) => {
    return `OMR ${amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  // Generate sample monthly data for demonstration
  const generateMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    const currentMonth = new Date().getMonth()
    
    return months.map((month, index) => {
      const isCurrentMonth = index === currentMonth
      const baseAmount = data.monthlySpent || 0
      const variation = (Math.random() - 0.5) * baseAmount * 0.3
      const amount = isCurrentMonth ? baseAmount : Math.max(0, baseAmount + variation)
      
      return {
        month,
        spending: amount,
        bookings: Math.floor(Math.random() * 5) + 1,
        savings: Math.max(0, amount * 0.1)
      }
    })
  }

  const monthlyData = generateMonthlyData()
  const totalSpending = monthlyData.reduce((sum, item) => sum + item.spending, 0)
  const avgSpending = monthlyData.length > 0 ? totalSpending / monthlyData.length : 0
  const maxSpending = Math.max(...monthlyData.map(item => item.spending), 0)

  // Pie chart data
  const pieData = [
    { name: 'Completed Bookings', value: data.completedBookings, color: '#10b981' },
    { name: 'Active Bookings', value: data.activeBookings, color: '#3b82f6' },
    { name: 'Pending Bookings', value: Math.max(0, data.totalBookings - data.completedBookings - data.activeBookings), color: '#f59e0b' }
  ]

  const renderChart = () => {
    const commonProps = {
      data: monthlyData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    }

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              stroke="#666"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `OMR ${value.toLocaleString()}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-lg">
                      <p className="font-semibold text-gray-900 mb-2">{label}</p>
                      <div className="space-y-1">
                        <p className="text-blue-600 font-medium">
                          Spending: {formatCurrency(Number(payload[0].value))}
                        </p>
                        <p className="text-gray-600 text-sm">
                          Bookings: {payload[0].payload.bookings}
                        </p>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Line 
              type="monotone" 
              dataKey="spending" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
            />
          </LineChart>
        )
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              stroke="#666"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `OMR ${value.toLocaleString()}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-lg">
                      <p className="font-semibold text-gray-900 mb-2">{label}</p>
                      <div className="space-y-1">
                        <p className="text-blue-600 font-medium">
                          Spending: {formatCurrency(Number(payload[0].value))}
                        </p>
                        <p className="text-gray-600 text-sm">
                          Bookings: {payload[0].payload.bookings}
                        </p>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <defs>
              <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="spending" 
              stroke="#3b82f6" 
              fill="url(#spendingGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        )
      case 'pie':
        return (
          <PieChart {...commonProps}>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={5}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-lg">
                      <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
                      <p className="text-blue-600 font-medium">
                        Count: {data.value}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
          </PieChart>
        )
      default:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              stroke="#666"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `OMR ${value.toLocaleString()}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-lg">
                      <p className="font-semibold text-gray-900 mb-2">{label}</p>
                      <div className="space-y-1">
                        <p className="text-blue-600 font-medium">
                          Spending: {formatCurrency(Number(payload[0].value))}
                        </p>
                        <p className="text-gray-600 text-sm">
                          Bookings: {payload[0].payload.bookings}
                        </p>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar 
              dataKey="spending" 
              fill="url(#spendingGradient)"
              radius={[6, 6, 0, 0]}
              className="hover:opacity-80 transition-opacity"
            />
            <defs>
              <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
          </BarChart>
        )
    }
  }

  return (
    <Card className={`border-0 shadow-xl bg-white/80 backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">Spending Analytics</CardTitle>
            <p className="text-gray-600 mt-1">Track your service spending and booking patterns</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Wallet className="h-5 w-5" />
              <span className="font-semibold">Total: {formatCurrency(data.totalSpent)}</span>
            </div>
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartType === 'bar' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Bar
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartType === 'line' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Line
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartType === 'area' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Area
              </button>
              <button
                onClick={() => setChartType('pie')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartType === 'pie' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pie
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
        
        {/* Enhanced Summary Stats */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-4 gap-6 pt-8 border-t border-gray-100">
          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl border border-green-200">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(data.totalSpent)}</p>
            <p className="text-sm text-green-600 font-medium">Total Spent</p>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-sky-100 rounded-2xl border border-blue-200">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-sky-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(avgSpending)}</p>
            <p className="text-sm text-blue-600 font-medium">Monthly Average</p>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl border border-purple-200">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Target className="h-6 w-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-purple-700">{formatCurrency(maxSpending)}</p>
            <p className="text-sm text-purple-600 font-medium">Peak Month</p>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-amber-100 rounded-2xl border border-orange-200">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <p className="text-2xl font-bold text-orange-700">{data.totalBookings}</p>
            <p className="text-sm text-orange-600 font-medium">Total Bookings</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
