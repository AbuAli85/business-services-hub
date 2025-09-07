-- Add missing RLS policy for providers to insert milestone approvals
-- This fixes the 403 Forbidden error when providers try to create approvals

-- Add provider insert policy for milestone_approvals
do $$ begin
  if not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'milestone_approvals' and p.policyname = 'Providers insert approvals'
  ) then
    create policy "Providers insert approvals"
      on public.milestone_approvals
      for insert with check (
        exists (
          select 1 from public.milestones m
          join public.bookings b on b.id = m.booking_id
          where m.id = public.milestone_approvals.milestone_id
            and b.provider_id = auth.uid()
        )
        and user_id = auth.uid()
      );
  end if;
end $$;

-- Add provider update policy for milestone_approvals (in case they need to update)
do $$ begin
  if not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'milestone_approvals' and p.policyname = 'Providers update approvals'
  ) then
    create policy "Providers update approvals"
      on public.milestone_approvals
      for update using (
        exists (
          select 1 from public.milestones m
          join public.bookings b on b.id = m.booking_id
          where m.id = public.milestone_approvals.milestone_id
            and b.provider_id = auth.uid()
        )
        and user_id = auth.uid()
      );
  end if;
end $$;

-- Add provider delete policy for milestone_approvals (in case they need to delete)
do $$ begin
  if not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'milestone_approvals' and p.policyname = 'Providers delete approvals'
  ) then
    create policy "Providers delete approvals"
      on public.milestone_approvals
      for delete using (
        exists (
          select 1 from public.milestones m
          join public.bookings b on b.id = m.booking_id
          where m.id = public.milestone_approvals.milestone_id
            and b.provider_id = auth.uid()
        )
        and user_id = auth.uid()
      );
  end if;
end $$;
