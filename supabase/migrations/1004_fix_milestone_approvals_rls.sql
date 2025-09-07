-- Fix milestone_approvals RLS policies
-- This addresses the permission denied error (42501)

-- First, let's check if the table exists and has the right structure
-- Drop existing policies to recreate them properly
do $$ begin
  -- Drop all existing policies for milestone_approvals
  drop policy if exists "Clients insert approvals" on public.milestone_approvals;
  drop policy if exists "Clients read approvals" on public.milestone_approvals;
  drop policy if exists "Providers read approvals" on public.milestone_approvals;
  drop policy if exists "Providers insert approvals" on public.milestone_approvals;
  drop policy if exists "Providers update approvals" on public.milestone_approvals;
  drop policy if exists "Providers delete approvals" on public.milestone_approvals;
  drop policy if exists "Allow read by related booking members" on public.milestone_approvals;
end $$;

-- Create comprehensive RLS policies for milestone_approvals
-- These policies allow both clients and providers to interact with approvals

-- 1. Allow clients to insert approvals
create policy "Clients can insert approvals"
  on public.milestone_approvals
  for insert with check (
    user_id = auth.uid() and
    exists (
      select 1 from public.milestones m
      join public.bookings b on b.id = m.booking_id
      where m.id = milestone_approvals.milestone_id
        and b.client_id = auth.uid()
    )
  );

-- 2. Allow providers to insert approvals
create policy "Providers can insert approvals"
  on public.milestone_approvals
  for insert with check (
    user_id = auth.uid() and
    exists (
      select 1 from public.milestones m
      join public.bookings b on b.id = m.booking_id
      where m.id = milestone_approvals.milestone_id
        and b.provider_id = auth.uid()
    )
  );

-- 3. Allow clients to read approvals
create policy "Clients can read approvals"
  on public.milestone_approvals
  for select using (
    exists (
      select 1 from public.milestones m
      join public.bookings b on b.id = m.booking_id
      where m.id = milestone_approvals.milestone_id
        and b.client_id = auth.uid()
    )
  );

-- 4. Allow providers to read approvals
create policy "Providers can read approvals"
  on public.milestone_approvals
  for select using (
    exists (
      select 1 from public.milestones m
      join public.bookings b on b.id = m.booking_id
      where m.id = milestone_approvals.milestone_id
        and b.provider_id = auth.uid()
    )
  );

-- 5. Allow clients to update their own approvals
create policy "Clients can update their approvals"
  on public.milestone_approvals
  for update using (
    user_id = auth.uid() and
    exists (
      select 1 from public.milestones m
      join public.bookings b on b.id = m.booking_id
      where m.id = milestone_approvals.milestone_id
        and b.client_id = auth.uid()
    )
  );

-- 6. Allow providers to update their own approvals
create policy "Providers can update their approvals"
  on public.milestone_approvals
  for update using (
    user_id = auth.uid() and
    exists (
      select 1 from public.milestones m
      join public.bookings b on b.id = m.booking_id
      where m.id = milestone_approvals.milestone_id
        and b.provider_id = auth.uid()
    )
  );

-- 7. Allow clients to delete their own approvals
create policy "Clients can delete their approvals"
  on public.milestone_approvals
  for delete using (
    user_id = auth.uid() and
    exists (
      select 1 from public.milestones m
      join public.bookings b on b.id = m.booking_id
      where m.id = milestone_approvals.milestone_id
        and b.client_id = auth.uid()
    )
  );

-- 8. Allow providers to delete their own approvals
create policy "Providers can delete their approvals"
  on public.milestone_approvals
  for delete using (
    user_id = auth.uid() and
    exists (
      select 1 from public.milestones m
      join public.bookings b on b.id = m.booking_id
      where m.id = milestone_approvals.milestone_id
        and b.provider_id = auth.uid()
    )
  );
