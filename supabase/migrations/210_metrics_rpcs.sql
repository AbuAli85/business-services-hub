create or replace function public.get_dashboard_metrics()
returns table (
  completion_pct numeric,
  avg_rating numeric,
  revenue_this_month numeric,
  revenue_growth_pct numeric,
  active_projects bigint
)
language sql security definer stable as $$
  with m as (select completion_pct from v_project_completion),
  r as (
    select total as revenue_this_month, mom_growth_pct
    from v_revenue_monthly
    order by month desc
    limit 1
  ),
  a as (select active_count from v_active_projects),
  s as (select avg_rating from v_client_satisfaction)
  select
    coalesce((select completion_pct from m), 0),
    coalesce((select avg_rating from s), 0),
    coalesce((select revenue_this_month from r), 0),
    (select mom_growth_pct from r),
    coalesce((select active_count from a), 0)
$$;

create or replace function public.get_activity_feed(limit_count integer default 20, offset_count integer default 0)
returns setof v_activity_feed
language sql security definer stable as $$
  select * from v_activity_feed
  order by occurred_at desc
  limit limit_count offset offset_count;
$$;


