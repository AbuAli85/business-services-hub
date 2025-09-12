'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts'
import { Wallet, TrendingUp, Calendar, Target } from 'lucide-react'
import { useState } from 'react'

interface EarningsData {
  month_year: string
  earnings: number
  booking_count: number
}

interface AdvancedEarningsChartProps {
  data: EarningsData[]
  className?: string
}

export function AdvancedEarningsChart({ data, className }: AdvancedEarningsChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar')

  // Use last 6 months for visualization
  const lastSix = (data || []).slice(-6)
  const totalEarnings = lastSix.reduce((sum, item) => sum + Number(item.earnings), 0)
  const avgEarnings = lastSix.length > 0 ? totalEarnings / lastSix.length : 0
  const maxEarnings = Math.max(...lastSix.map(item => Number(item.earnings)), 0)
  const totalBookings = lastSix.reduce((sum, item) => sum + Number(item.booking_count), 0)

  const formatCurrency = (amount: number) => {
    return `OMR ${amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  // Ensure we have data to display
  const hasData = lastSix && lastSix.length > 0
  const chartData = hasData ? lastSix : [
    { month_year: 'No Data', earnings: 0, booking_count: 0 }
  ]

  // Projected vs Actual for current month
  const now = new Date()
  const currentMonthLabel = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  const currentMonthEntry = (data || []).find(d => d.month_year === currentMonthLabel)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const currentActual = Number(currentMonthEntry?.earnings || 0)
  const dailyAvgSoFar = dayOfMonth > 0 ? currentActual / dayOfMonth : 0
  const projected = Math.max(0, Math.round(dailyAvgSoFar * daysInMonth))

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    }

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month_year" 
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
                          Earnings: {formatCurrency(Number(payload[0].value))}
                        </p>
                        <p className="text-gray-600 text-sm">
                          Bookings: {payload[0].payload.booking_count}
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
              dataKey="earnings" 
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
              dataKey="month_year" 
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
                          Earnings: {formatCurrency(Number(payload[0].value))}
                        </p>
                        <p className="text-gray-600 text-sm">
                          Bookings: {payload[0].payload.booking_count}
                        </p>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <defs>
              <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="earnings" 
              stroke="#3b82f6" 
              fill="url(#earningsGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        )
      default:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month_year" 
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
                          Earnings: {formatCurrency(Number(payload[0].value))}
                        </p>
                        <p className="text-gray-600 text-sm">
                          Bookings: {payload[0].payload.booking_count}
                        </p>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar 
              dataKey="earnings" 
              fill="url(#earningsGradient)"
              radius={[6, 6, 0, 0]}
              className="hover:opacity-80 transition-opacity"
            />
            <defs>
              <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
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
      <CardHeader className="pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">Earnings Analytics</CardTitle>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Comprehensive view of your financial performance</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="font-semibold">Total: {formatCurrency(totalEarnings)}</span>
            </div>
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
              <Target className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="font-semibold">Projected vs Actual (this month): {formatCurrency(projected)} vs {formatCurrency(currentActual)}</span>
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
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6">
        <div className="h-64 sm:h-80">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-8 w-8 sm:h-10 sm:w-10 text-blue-400" />
                </div>
                <p className="text-gray-500 text-base sm:text-lg font-medium">No earnings data available</p>
                <p className="text-gray-400 text-xs sm:text-sm">Complete some bookings to see your earnings trend</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Enhanced Summary Stats */}
        <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-6 sm:pt-8 border-t border-gray-100">
          <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl sm:rounded-2xl border border-green-200">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
              <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-green-700">{formatCurrency(totalEarnings)}</p>
            <p className="text-xs sm:text-sm text-green-600 font-medium">Total Earnings</p>
          </div>
          
          <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-sky-100 rounded-xl sm:rounded-2xl border border-blue-200">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-sky-600 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-blue-700">{formatCurrency(avgEarnings)}</p>
            <p className="text-xs sm:text-sm text-blue-600 font-medium">Monthly Average</p>
          </div>
          
          <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl sm:rounded-2xl border border-purple-200">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
              <Target className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-purple-700">{formatCurrency(maxEarnings)}</p>
            <p className="text-xs sm:text-sm text-purple-600 font-medium">Best Month</p>
          </div>
          
          <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl sm:rounded-2xl border border-orange-200">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-orange-700">{totalBookings}</p>
            <p className="text-xs sm:text-sm text-orange-600 font-medium">Total Bookings</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
