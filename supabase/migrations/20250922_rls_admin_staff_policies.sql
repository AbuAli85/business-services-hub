-- Enforce that only admin/staff can modify services and write audit logs

-- Services table: enable RLS and restrict updates
alter table if exists public.services enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'services' and policyname = 'services_update_admin_staff'
  ) then
    create policy services_update_admin_staff
      on public.services
      for update
      to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role in ('admin','staff')
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role in ('admin','staff')
        )
      );
  end if;
end $$;

-- Audit logs: enable RLS and restrict inserts to admin/staff
alter table if exists public.service_audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'service_audit_logs' and policyname = 'audit_logs_insert_admin_staff'
  ) then
    create policy audit_logs_insert_admin_staff
      on public.service_audit_logs
      for insert
      to authenticated
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role in ('admin','staff')
        )
      );
  end if;
end $$;


