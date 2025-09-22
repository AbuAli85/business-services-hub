-- services_stats RPC returns filtered counts in one round trip
create or replace function public.services_stats(p_search text, p_status text)
returns table(
  total integer,
  pending integer,
  approved integer,
  rejected integer,
  featured integer,
  price_sum numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare like_pattern text := case when p_search is null or p_search = '' then null else '%'||p_search||'%' end;
begin
  return query
  with base as (
    select s.*
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
    count(*)::int as total,
    count(*) filter (where base.approval_status = 'pending')::int as pending,
    count(*) filter (where base.approval_status = 'approved')::int as approved,
    count(*) filter (where base.approval_status = 'rejected')::int as rejected,
    count(*) filter (where coalesce(base.featured,false) = true)::int as featured,
    coalesce(sum(base.base_price),0)::numeric as price_sum
  from base;
end;
$$;

revoke all on function public.services_stats(text,text) from public;
grant execute on function public.services_stats(text,text) to authenticated, anon;


