'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { TrendingDown, TrendingUp } from 'lucide-react'
import React from 'react'

export interface MetricCardProps {
  title: string
  value: string | number
  trendPercent?: number
  trendLabel?: string
  icon?: React.ReactNode
  accent?: 'blue' | 'green' | 'purple' | 'orange' | 'slate'
  progressValue?: number
  footer?: React.ReactNode
}

const accentMap: Record<NonNullable<MetricCardProps['accent']>, string> = {
  blue: 'from-blue-500 to-blue-600 text-white',
  green: 'from-green-500 to-green-600 text-white',
  purple: 'from-purple-500 to-purple-600 text-white',
  orange: 'from-orange-500 to-orange-600 text-white',
  slate: 'from-slate-100 to-white text-slate-900'
}

export function MetricCard(props: MetricCardProps) {
  const { title, value, trendPercent, trendLabel, icon, accent = 'slate', progressValue, footer } = props

  const isPositive = typeof trendPercent === 'number' ? trendPercent >= 0 : undefined
  const trendColor = isPositive === undefined ? '' : isPositive ? 'text-emerald-300' : 'text-red-300'

  return (
    <Card className={`bg-gradient-to-br ${accentMap[accent]} hover:shadow-xl transition-all`}>
      <CardHeader>
        <CardTitle className={`${accent === 'slate' ? 'text-slate-600' : 'text-white/90'} text-sm font-medium flex items-center justify-between`}>
          <span>{title}</span>
          {icon ? <span className={`${accent === 'slate' ? 'text-slate-400' : 'text-white/80'}`}>{icon}</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`text-3xl font-bold ${accent === 'slate' ? 'text-slate-900' : 'text-white'}`}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
        {typeof trendPercent === 'number' && (
          <div className={`mt-1 text-xs flex items-center gap-1 ${trendColor}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>
              {trendPercent.toFixed(1)}%{trendLabel ? ` ${trendLabel}` : ''}
            </span>
          </div>
        )}
        {typeof progressValue === 'number' && (
          <div className="mt-3">
            <Progress value={progressValue} className={`h-2 ${accent === 'slate' ? '' : 'bg-white/30'}`} />
          </div>
        )}
        {footer && (
          <div className={`mt-3 text-xs ${accent === 'slate' ? 'text-slate-500' : 'text-white/80'}`}>{footer}</div>
        )}
      </CardContent>
    </Card>
  )
}

export default MetricCard


