import { createClient } from '@/utils/supabase/server'
import Greeting from '@/components/dashboard/Greeting'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, Star, TrendingUp, ClipboardList, PlusCircle, FileBarChart } from 'lucide-react'

async function getMetrics() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_dashboard_metrics')
  if (error) throw error
  const row: any = Array.isArray(data) ? data[0] : data
  return {
    completionPct: Number(row?.completion_pct ?? 0),
    avgRating: Number(row?.avg_rating ?? 0),
    revenueThisMonth: Number(row?.revenue_this_month ?? 0),
    revenueGrowthPct: row?.revenue_growth_pct === null ? null : Number(row?.revenue_growth_pct),
    activeProjects: Number(row?.active_projects ?? 0)
  }
}

async function getActivity() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_activity_feed', { limit_count: 15, offset_count: 0 })
  if (error) throw error
  return data as any[]
}

async function getProfile() {
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()
  const firstName = user?.user?.user_metadata?.first_name ?? user?.user?.email?.split('@')[0] ?? null
  return { firstName }
}

export default async function OverviewPage() {
  const [metrics, activity, profile] = await Promise.all([getMetrics(), getActivity(), getProfile()])

  return (
    <div className="space-y-8">
      <Greeting firstName={profile.firstName} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Project Completion"
          value={`${Math.round(metrics.completionPct)}%`}
          icon={<ClipboardList className="h-5 w-5 text-muted-foreground" />}
          footer="Completed vs total"
        />
        <MetricCard
          title="Client Satisfaction"
          value={`${metrics.avgRating.toFixed(1)}/5`}
          icon={<Star className="h-5 w-5 text-muted-foreground" />}
          footer="Average rating"
        />
        <MetricCard
          title="Revenue (This Month)"
          value={`OMR ${metrics.revenueThisMonth.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`}
          trendPercent={metrics.revenueGrowthPct ?? undefined}
          icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />}
          footer="vs last month"
        />
        <MetricCard
          title="Active Projects"
          value={metrics.activeProjects}
          icon={<BarChart3 className="h-5 w-5 text-muted-foreground" />}
          footer="Currently in progress"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button className="gap-2"><PlusCircle className="h-4 w-4" /> New Booking</Button>
        <Button variant="secondary" className="gap-2"><FileBarChart className="h-4 w-4" /> View Reports</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
          </div>
          {/* Map RPC activity feed to ActivityFeed expected shape */}
          <ActivityFeed items={(activity as any[]).map((a: any) => ({
            id: a.item_id,
            type: (a.item_type === 'milestone' ? 'milestones' : a.item_type),
            description: a.title,
            timestamp: a.occurred_at,
            status: a.item_type === 'payment' ? 'completed' : (a.meta ?? 'info')
          }))} />
        </CardContent>
      </Card>
    </div>
  )
}


