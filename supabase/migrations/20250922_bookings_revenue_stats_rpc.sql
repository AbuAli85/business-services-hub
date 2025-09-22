-- bookings_revenue_stats: sums paid bookings for services under filters
-- Assumes a public.bookings table with service_id uuid, amount numeric, status text (e.g., 'paid')

create or replace function public.bookings_revenue_stats(p_search text, p_status text)
returns table(
  price_sum numeric,
  booking_sum numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare like_pattern text := case when p_search is null or p_search = '' then null else '%'||p_search||'%' end;
begin
  return query
  with svc as (
    select s.id
    from public.services s
    left join public.profiles p on p.id = s.provider_id
    where (
      like_pattern is null or (
        s.title ilike like_pattern or s.description ilike like_pattern or s.category ilike like_pattern or
        coalesce(p.full_name,'') ilike like_pattern or coalesce(p.email,'') ilike like_pattern
      )
    )
    and (p_status is null or p_status = 'all' or s.approval_status = p_status)
  )
  select
    coalesce(sum(sv.base_price),0)::numeric as price_sum,
    coalesce((select sum(b.amount) from public.bookings b where b.service_id in (select id from svc) and b.status = 'paid'),0)::numeric as booking_sum
  from public.services sv
  where sv.id in (select id from svc);
end;
$$;

revoke all on function public.bookings_revenue_stats(text,text) from public;
grant execute on function public.bookings_revenue_stats(text,text) to authenticated, anon;


