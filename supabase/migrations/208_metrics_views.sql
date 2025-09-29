-- Adjust table/column names to match your schema

-- Use bookings as the proxy for project completion
create or replace view public.v_project_completion as
select
  count(*) filter (where status in ('completed'))::decimal /
  nullif(count(*),0) * 100 as completion_pct
from public.bookings;

-- Average rating from bookings if reviews table is not present
create or replace view public.v_client_satisfaction as
select coalesce(round(avg(b.rating)::numeric, 1), 0) as avg_rating
from public.bookings b;

create or replace view public.v_revenue_monthly as
with revenue as (
  select date_trunc('month', paid_at) as month, sum(amount) as total
  from public.invoices
  where paid_at is not null
  group by 1
)
select
  month,
  total,
  lag(total) over(order by month) as prev_total,
  case when lag(total) over(order by month) is null or lag(total) over(order by month)=0
    then null
    else round(((total - lag(total) over(order by month)) / nullif(lag(total) over(order by month),0)) * 100, 1)
  end as mom_growth_pct
from revenue
order by month desc;

create or replace view public.v_active_projects as
select count(*) as active_count
from public.bookings
where status in ('in_progress','confirmed');


