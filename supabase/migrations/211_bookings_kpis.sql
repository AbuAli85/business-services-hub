-- Cleanly recreate views to avoid column-change errors
drop view if exists public.v_booking_progress cascade;
drop view if exists public.v_booking_kpis cascade;

-- View: v_booking_progress (0..100)
create view public.v_booking_progress as
select
  b.id as booking_id,
  greatest(0, least(100,
    coalesce(
      (select round(avg(coalesce(m.progress_percentage,0))) from public.milestones m where m.booking_id = b.id),
      0
    )
  ))::int as progress_pct
from public.bookings b;

-- View: v_booking_kpis
create view public.v_booking_kpis as
with base as (
  select
    count(*) as total,
    count(*) filter (where status in ('completed','delivered')) as completed,
    count(*) filter (where status in ('in_progress','in_production')) as in_progress,
    count(*) filter (where status in ('approved','confirmed')) as approved,
    count(*) filter (where status = 'pending') as pending
  from public.bookings
), revenue as (
  select coalesce(sum(amount),0) as total_revenue from public.invoices where status = 'paid'
)
select base.*, revenue.total_revenue from base, revenue;

-- RPC: get_booking_kpis
create or replace function public.get_booking_kpis()
returns table (
  total bigint,
  completed bigint,
  in_progress bigint,
  approved bigint,
  pending bigint,
  total_revenue numeric
)
language sql security definer stable as $$
  select * from v_booking_kpis
$$;


