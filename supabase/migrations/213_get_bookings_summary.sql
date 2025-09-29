create or replace function public.get_bookings_summary()
returns table (
  total_projects bigint,
  completed_count bigint,
  total_revenue numeric
)
language sql security definer stable as $$
  select * from public.v_bookings_summary
$$;


