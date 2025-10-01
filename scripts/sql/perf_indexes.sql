-- Milestones
create index if not exists idx_milestones_booking on public.milestones(booking_id);
create index if not exists idx_milestones_booking_status on public.milestones(booking_id, status);
create index if not exists idx_milestones_booking_created on public.milestones(booking_id, created_at desc);

-- Tasks (tasks link to milestones via milestone_id)
create index if not exists idx_tasks_milestone on public.tasks(milestone_id);
create index if not exists idx_tasks_milestone_status on public.tasks(milestone_id, status);
create index if not exists idx_tasks_milestone_created on public.tasks(milestone_id, created_at desc);

-- If you use booking_tasks bridge, keep helpful indexes there too
create index if not exists idx_booking_tasks_booking_id on public.booking_tasks(booking_id);
create index if not exists idx_booking_tasks_status on public.booking_tasks(booking_id, status);
create index if not exists idx_booking_tasks_created on public.booking_tasks(booking_id, created_at desc);


