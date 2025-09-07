'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DollarSign, TrendingUp } from 'lucide-react'

interface EarningsData {
  month_year: string
  earnings: number
  booking_count: number
}

interface EarningsChartProps {
  data: EarningsData[]
  className?: string
}

export function EarningsChart({ data, className }: EarningsChartProps) {
  const totalEarnings = data.reduce((sum, item) => sum + Number(item.earnings), 0)
  const avgEarnings = data.length > 0 ? totalEarnings / data.length : 0
  const maxEarnings = Math.max(...data.map(item => Number(item.earnings)), 0)

  const formatCurrency = (amount: number) => {
    return `OMR ${amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  // Ensure we have data to display
  const hasData = data && data.length > 0
  const chartData = hasData ? data : [
    { month_year: 'No Data', earnings: 0, booking_count: 0 }
  ]

  return (
    <Card className={`border-0 shadow-sm ${className}`}>
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">Earnings Overview</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Monthly earnings trend and performance</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <DollarSign className="h-5 w-5" />
            <span className="font-semibold">Total: {formatCurrency(totalEarnings)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No earnings data available</p>
                <p className="text-gray-400 text-sm">Complete some bookings to see your earnings trend</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-gray-100">
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalEarnings)}</p>
            <p className="text-sm text-green-600 font-medium">Total Earnings</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(avgEarnings)}</p>
            <p className="text-sm text-blue-600 font-medium">Monthly Average</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
            <p className="text-2xl font-bold text-purple-700">{formatCurrency(maxEarnings)}</p>
            <p className="text-sm text-purple-600 font-medium">Best Month</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
