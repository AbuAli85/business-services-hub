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

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">Earnings Overview</CardTitle>
            <p className="text-sm text-gray-600">Monthly earnings trend</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <DollarSign className="h-4 w-4" />
            <span>Total: ${totalEarnings.toLocaleString()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                        <p className="font-medium text-gray-900">{label}</p>
                        <p className="text-blue-600">
                          Earnings: ${Number(payload[0].value).toLocaleString()}
                        </p>
                        <p className="text-gray-600">
                          Bookings: {payload[0].payload.booking_count}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar 
                dataKey="earnings" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                className="hover:opacity-80 transition-opacity"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">${totalEarnings.toLocaleString()}</p>
            <p className="text-xs text-gray-600">Total Earnings</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">${avgEarnings.toLocaleString()}</p>
            <p className="text-xs text-gray-600">Monthly Average</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">${maxEarnings.toLocaleString()}</p>
            <p className="text-xs text-gray-600">Best Month</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
