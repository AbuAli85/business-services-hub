-- RLS: Progress System hardening (bookings, milestones, tasks, comments, approvals, time_entries)
-- This migration adds helper functions and safe, idempotent RLS policies.
-- It adapts to the project's actual table names:
--   bookings, milestones, tasks, milestone_comments, milestone_approvals, time_entries

-- 1) Enable RLS (idempotent)
alter table if exists public.bookings enable row level security;
alter table if exists public.milestones enable row level security;
alter table if exists public.tasks enable row level security;
alter table if exists public.milestone_comments enable row level security;
alter table if exists public.milestone_approvals enable row level security;
alter table if exists public.time_entries enable row level security;

-- 2) Helper functions
create or replace function public.is_provider_of_booking(b_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.bookings b
    where b.id = b_id
      and b.provider_id = auth.uid()
  );
$$;

create or replace function public.is_client_of_booking(b_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.bookings b
    where b.id = b_id
      and b.client_id = auth.uid()
  );
$$;

-- 3) Bookings policies
do $$ begin
  if not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'bookings' and p.policyname = 'Providers can update own bookings'
  ) then
    create policy "Providers can update own bookings"
      on public.bookings
      for update using (provider_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'bookings' and p.policyname = 'Clients can view own bookings'
  ) then
    create policy "Clients can view own bookings"
      on public.bookings
      for select using (client_id = auth.uid());
  end if;
end $$;

-- 4) Milestones policies
do $$ begin
  if not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'milestones' and p.policyname = 'Providers manage milestones'
  ) then
    create policy "Providers manage milestones"
      on public.milestones
      for all using (public.is_provider_of_booking(booking_id));
  end if;

  if not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'milestones' and p.policyname = 'Clients read milestones'
  ) then
    create policy "Clients read milestones"
      on public.milestones
      for select using (public.is_client_of_booking(booking_id));
  end if;
end $$;

-- 5) Tasks policies
do $$ begin
  if not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'tasks' and p.policyname = 'Providers manage tasks'
  ) then
    create policy "Providers manage tasks"
      on public.tasks
      for all using (
        exists (
          select 1 from public.milestones m
          where m.id = public.tasks.milestone_id
            and public.is_provider_of_booking(m.booking_id)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'tasks' and p.policyname = 'Clients read tasks'
  ) then
    create policy "Clients read tasks"
      on public.tasks
      for select using (
        exists (
          select 1 from public.milestones m
          where m.id = public.tasks.milestone_id
            and public.is_client_of_booking(m.booking_id)
        )
      );
  end if;
end $$;

-- 6) Milestone comments policies
-- Note: table is public.milestone_comments (author_id, milestone_id)
do $$ begin
  if not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'milestone_comments' and p.policyname = 'Users insert comments'
  ) then
    create policy "Users insert comments"
      on public.milestone_comments
      for insert with check (
        exists (
          select 1 from public.milestones m
          where m.id = public.milestone_comments.milestone_id
            and (
              public.is_provider_of_booking(m.booking_id) or
              public.is_client_of_booking(m.booking_id)
            )
        )
        and author_id = auth.uid()
      );
  end if;

  if not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'milestone_comments' and p.policyname = 'Users read comments'
  ) then
    create policy "Users read comments"
      on public.milestone_comments
      for select using (
        exists (
          select 1 from public.milestones m
          where m.id = public.milestone_comments.milestone_id
            and (
              public.is_provider_of_booking(m.booking_id) or
              public.is_client_of_booking(m.booking_id)
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'milestone_comments' and p.policyname = 'Users update own comments'
  ) then
    create policy "Users update own comments"
      on public.milestone_comments
      for update using (author_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'milestone_comments' and p.policyname = 'Users delete own comments'
  ) then
    create policy "Users delete own comments"
      on public.milestone_comments
      for delete using (author_id = auth.uid());
  end if;
end $$;

-- 7) Milestone approvals policies
-- Note: table is public.milestone_approvals (user_id, milestone_id)
do $$ begin
  if not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'milestone_approvals' and p.policyname = 'Clients insert approvals'
  ) then
    create policy "Clients insert approvals"
      on public.milestone_approvals
      for insert with check (
        exists (
          select 1 from public.milestones m
          join public.bookings b on b.id = m.booking_id
          where m.id = public.milestone_approvals.milestone_id
            and b.client_id = auth.uid()
        )
        and user_id = auth.uid()
      );
  end if;

  if not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'milestone_approvals' and p.policyname = 'Clients read approvals'
  ) then
    create policy "Clients read approvals"
      on public.milestone_approvals
      for select using (
        exists (
          select 1 from public.milestones m
          join public.bookings b on b.id = m.booking_id
          where m.id = public.milestone_approvals.milestone_id
            and b.client_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'milestone_approvals' and p.policyname = 'Providers read approvals'
  ) then
    create policy "Providers read approvals"
      on public.milestone_approvals
      for select using (
        exists (
          select 1 from public.milestones m
          join public.bookings b on b.id = m.booking_id
          where m.id = public.milestone_approvals.milestone_id
            and b.provider_id = auth.uid()
        )
      );
  end if;
end $$;

-- 8) Time entries policies
-- Use specific provider/client policies; pre-existing granular policies will remain if already defined
do $$ begin
  if not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'time_entries' and p.policyname = 'Providers manage time_entries'
  ) then
    create policy "Providers manage time_entries"
      on public.time_entries
      for all using (
        exists (
          select 1 from public.bookings b
          where b.id = public.time_entries.booking_id
            and public.is_provider_of_booking(b.id)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'time_entries' and p.policyname = 'Clients read time_entries'
  ) then
    create policy "Clients read time_entries"
      on public.time_entries
      for select using (
        exists (
          select 1 from public.bookings b
          where b.id = public.time_entries.booking_id
            and public.is_client_of_booking(b.id)
        )
      );
  end if;
end $$;


