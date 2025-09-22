-- Create helper function to check if current user is admin/staff without RLS recursion
create or replace function public.is_admin()
returns boolean
security definer
set search_path = public
language sql
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','staff')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- Update profiles read policy to use function and avoid recursive subselects
alter table if exists public.profiles enable row level security;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles' and policyname='profiles_read_admin_staff'
  ) then
    drop policy profiles_read_admin_staff on public.profiles;
  end if;

  create policy profiles_read_admin_staff
    on public.profiles
    for select
    to authenticated
    using ( public.is_admin() or id = auth.uid() );
end $$;

-- Update services update policy to use helper
alter table if exists public.services enable row level security;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='services' and policyname='services_update_admin_staff'
  ) then
    drop policy services_update_admin_staff on public.services;
  end if;

  create policy services_update_admin_staff
    on public.services
    for update
    to authenticated
    using ( public.is_admin() )
    with check ( public.is_admin() );
end $$;

-- Update audit logs insert policy to use helper
alter table if exists public.service_audit_logs enable row level security;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='service_audit_logs' and policyname='audit_logs_insert_admin_staff'
  ) then
    drop policy audit_logs_insert_admin_staff on public.service_audit_logs;
  end if;

  create policy audit_logs_insert_admin_staff
    on public.service_audit_logs
    for insert
    to authenticated
    with check ( public.is_admin() );
end $$;


