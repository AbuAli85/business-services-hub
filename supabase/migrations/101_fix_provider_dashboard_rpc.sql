-- Fix Provider Dashboard RPC functions to match actual database schema

-- Drop existing functions
drop function if exists get_provider_dashboard(uuid);
drop function if exists get_provider_recent_bookings(uuid, int);
drop function if exists get_provider_top_services(uuid, int);
drop function if exists get_provider_monthly_earnings(uuid, int);

-- Create fixed get_provider_dashboard function
create or replace function get_provider_dashboard(pid uuid)
returns table (
  total_earnings numeric,
  monthly_earnings numeric,
  active_bookings int,
  active_services int,
  avg_rating numeric,
  response_rate numeric,
  completion_rate numeric,
  monthly_growth numeric
) as $$
begin
  return query
  select
    coalesce(sum(amount),0) as total_earnings,
    coalesce(sum(amount) filter (where date_trunc('month', created_at) = date_trunc('month', now())),0) as monthly_earnings,
    (select count(*) from bookings b where b.provider_id = pid and b.status != 'cancelled') as active_bookings,
    (select count(*) from services s where s.provider_id = pid and s.status = 'active') as active_services,
    (select avg(rating) from reviews r where r.provider_id = pid) as avg_rating,
    (select (count(*) filter (where status != 'pending')::decimal / greatest(count(*),1)) from bookings b where b.provider_id = pid) as response_rate,
    (select (count(*) filter (where status = 'completed')::decimal / greatest(count(*),1)) from bookings b where b.provider_id = pid) as completion_rate,
    0 as monthly_growth; -- placeholder for now
end;
$$ language plpgsql;

-- Create fixed get_provider_recent_bookings function
create or replace function get_provider_recent_bookings(pid uuid, limit_count int)
returns table (
  id uuid,
  title text,
  description text,
  status text,
  start_date text,
  end_date text,
  total_amount numeric,
  currency text,
  created_at text,
  client_name text,
  client_email text,
  service_title text,
  milestone_count bigint,
  completed_milestones bigint
) as $$
begin
  return query
  select
    b.id,
    b.title,
    b.description,
    b.status,
    to_char(b.start_time, 'DD Mon YYYY') as start_date,
    to_char(b.end_time, 'DD Mon YYYY') as end_date,
    b.total_amount,
    b.currency,
    to_char(b.created_at, 'DD Mon YYYY') as created_at,
    c.full_name as client_name,
    c.email as client_email,
    s.title as service_title,
    coalesce(milestone_stats.milestone_count, 0) as milestone_count,
    coalesce(milestone_stats.completed_milestones, 0) as completed_milestones
  from bookings b
  left join clients c on b.client_id = c.id
  left join services s on b.service_id = s.id
  left join (
    select 
      booking_id,
      count(*) as milestone_count,
      count(*) filter (where status = 'completed') as completed_milestones
    from milestones
    group by booking_id
  ) milestone_stats on b.id = milestone_stats.booking_id
  where b.provider_id = pid
  order by b.created_at desc
  limit limit_count;
end;
$$ language plpgsql;

-- Create fixed get_provider_top_services function
create or replace function get_provider_top_services(pid uuid, limit_count int)
returns table (
  id uuid,
  title text,
  description text,
  price numeric,
  currency text,
  status text,
  booking_count bigint,
  total_earnings numeric,
  avg_rating numeric,
  completion_rate numeric
) as $$
begin
  return query
  select
    s.id,
    s.title,
    s.description,
    s.price,
    s.currency,
    s.status,
    coalesce(booking_stats.booking_count, 0) as booking_count,
    coalesce(booking_stats.total_earnings, 0) as total_earnings,
    coalesce(rating_stats.avg_rating, 0) as avg_rating,
    coalesce(completion_stats.completion_rate, 0) as completion_rate
  from services s
  left join (
    select 
      service_id,
      count(*) as booking_count,
      sum(total_amount) as total_earnings
    from bookings
    where provider_id = pid
    group by service_id
  ) booking_stats on s.id = booking_stats.service_id
  left join (
    select 
      service_id,
      avg(rating) as avg_rating
    from reviews r
    join bookings b on r.booking_id = b.id
    where b.provider_id = pid
    group by service_id
  ) rating_stats on s.id = rating_stats.service_id
  left join (
    select 
      service_id,
      (count(*) filter (where status = 'completed')::decimal / greatest(count(*),1)) as completion_rate
    from bookings
    where provider_id = pid
    group by service_id
  ) completion_stats on s.id = completion_stats.service_id
  where s.provider_id = pid
  order by coalesce(booking_stats.booking_count, 0) desc
  limit limit_count;
end;
$$ language plpgsql;

-- Create fixed get_provider_monthly_earnings function
create or replace function get_provider_monthly_earnings(pid uuid, months_back int)
returns table (
  month_year text,
  earnings numeric,
  booking_count bigint
) as $$
begin
  return query
  select
    to_char(date_trunc('month', b.created_at), 'Mon YYYY') as month_year,
    coalesce(sum(b.total_amount), 0) as earnings,
    count(*) as booking_count
  from bookings b
  where b.provider_id = pid
    and b.created_at >= date_trunc('month', now() - interval '1 month' * months_back)
  group by date_trunc('month', b.created_at)
  order by date_trunc('month', b.created_at) desc;
end;
$$ language plpgsql;
