-- Milestones
create index if not exists idx_milestones_booking on public.milestones(booking_id);
create index if not exists idx_milestones_booking_status on public.milestones(booking_id, status);
create index if not exists idx_milestones_booking_created_at on public.milestones(booking_id, created_at desc);

-- Tasks (tasks link to milestones via milestone_id)
create index if not exists idx_tasks_milestone on public.tasks(milestone_id);
create index if not exists idx_tasks_milestone_status on public.tasks(milestone_id, status);
create index if not exists idx_tasks_milestone_created_at on public.tasks(milestone_id, created_at desc);

-- Optional: partial index for done/completed status counts
create index if not exists idx_tasks_milestone_done on public.tasks(milestone_id) where status in ('done','completed');

-- If you use booking_tasks bridge, keep helpful indexes there too
create index if not exists idx_booking_tasks_booking_id on public.booking_tasks(booking_id);
create index if not exists idx_booking_tasks_status on public.booking_tasks(booking_id, status);
create index if not exists idx_booking_tasks_created_at on public.booking_tasks(booking_id, created_at desc);

-- Ensure FK integrity for tasks -> milestones (safe idempotent add)
alter table public.tasks
  add constraint if not exists tasks_milestone_id_fkey
  foreign key (milestone_id) references public.milestones(id) on delete cascade;

-- Aggregated totals view for faster KPI lookups
create or replace view public.booking_totals as
select
  b.id as booking_id,
  count(m.id)                                                        as milestones_total,
  count(m.id) filter (where m.status = 'completed')                  as milestones_done,
  count(t.id)                                                        as tasks_total,
  count(t.id) filter (where t.status in ('done','completed'))        as tasks_done
from public.bookings b
left join public.milestones m on m.booking_id = b.id
left join public.tasks     t on t.milestone_id = m.id
group by b.id;


