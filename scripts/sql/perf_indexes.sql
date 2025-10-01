-- Milestones
create index if not exists idx_milestones_booking on public.milestones(booking_id);
create index if not exists idx_milestones_booking_status on public.milestones(booking_id, status);
create index if not exists idx_milestones_booking_created on public.milestones(booking_id, created_at desc);

-- Tasks
create index if not exists idx_tasks_booking on public.tasks(booking_id);
create index if not exists idx_tasks_booking_status on public.tasks(booking_id, status);
create index if not exists idx_tasks_booking_created on public.tasks(booking_id, created_at desc);


