-- Update FK behavior for milestones → services to allow deleting services safely
-- Choose ON DELETE SET NULL (recommended) so milestone records remain, but without a service

-- 1) Make sure the referencing column is nullable (required for SET NULL)
do $$ begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'milestones' and column_name = 'service_id'
  ) then
    alter table public.milestones alter column service_id drop not null;
  end if;
end $$;

-- 2) Drop the old constraint if present (name from the error message)
alter table public.milestones drop constraint if exists milestones_service_milestone_id_fkey;

-- 3) Recreate the FK with ON DELETE SET NULL
alter table public.milestones
  add constraint milestones_service_milestone_id_fkey
  foreign key (service_id)
  references public.services(id)
  on delete set null;

-- If you prefer to delete milestones when a service is deleted, comment the block above and use:
-- alter table public.milestones drop constraint if exists milestones_service_milestone_id_fkey;
-- alter table public.milestones
--   add constraint milestones_service_milestone_id_fkey
--   foreign key (service_id)
--   references public.services(id)
--   on delete cascade;

-- Done

