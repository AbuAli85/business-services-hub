-- Services table for multi-service templates
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_milestones jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default now()
);

-- Booking link to service
alter table public.bookings
  add column if not exists service_id uuid references public.services(id);

-- Milestones monthly support
alter table public.milestones
  add column if not exists month_number int,
  add column if not exists due_date date,
  add column if not exists progress int;

-- Ensure status includes needs_approval (if using text status)
-- This is a no-op if you already migrated to enum elsewhere.

-- Tasks attachments support
alter table public.tasks
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- RLS note: keep existing RLS; providers can manage their bookings' milestones/tasks, clients can read and comment.


