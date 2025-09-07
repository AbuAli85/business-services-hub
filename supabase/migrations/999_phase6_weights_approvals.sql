-- Phase 6: Smart Milestones & Approvals
-- 1) Add weights and tags

alter table if exists public.milestones
  add column if not exists weight numeric not null default 1;

alter table if exists public.tasks
  add column if not exists weight numeric not null default 1,
  add column if not exists tags text[] not null default '{}';

-- 2) Milestone approvals table

create table if not exists public.milestone_approvals (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('approved','rejected')),
  comment text,
  created_at timestamp with time zone not null default now()
);

-- Helpful index
create index if not exists idx_milestone_approvals_milestone_id on public.milestone_approvals(milestone_id);

-- RLS policies (example; adjust to your model)
alter table public.milestone_approvals enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'milestone_approvals' and policyname = 'Allow read by related booking members'
  ) then
    create policy "Allow read by related booking members" on public.milestone_approvals
      for select using (
        exists (
          select 1 from public.milestones m
          join public.bookings b on b.id = m.booking_id
          where m.id = milestone_id
        )
      );
  end if;
end $$;


