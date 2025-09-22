-- Create service_audit_logs to track service status changes and edits

create table if not exists public.service_audit_logs (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  event text,                 -- e.g., 'Approved', 'Rejected', 'Suspended', 'Updated'
  action text,                -- optional machine/action name
  actor_id uuid,              -- who performed it
  actor_name text,
  actor_email text,
  metadata jsonb,             -- optional extra context
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_service_audit_logs_service_id
  on public.service_audit_logs(service_id);

-- Optional RLS enabling with permissive read to admins/staff; adjust as needed
alter table public.service_audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'service_audit_logs' and policyname = 'allow_read_audit_logs'
  ) then
    create policy allow_read_audit_logs
      on public.service_audit_logs
      for select
      to authenticated
      using (true);
  end if;
end $$;


