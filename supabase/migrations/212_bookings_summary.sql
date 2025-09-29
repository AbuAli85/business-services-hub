drop view if exists public.v_bookings_summary cascade;
create view public.v_bookings_summary as
select
  count(*)::bigint as total_projects,
  count(*) filter (where status in ('completed','delivered'))::bigint as completed_count,
  coalesce(sum((select amount from invoices i where i.booking_id = b.id and i.status='paid' limit 1)), 0)::numeric as total_revenue
from public.bookings b;


