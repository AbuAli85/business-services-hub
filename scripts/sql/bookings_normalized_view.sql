create or replace view public.bookings_normalized as
select
  b.*,
  case
    when lower(b.status) in ('pending','provider_review') then 'pending_provider_approval'
    when lower(b.status) in ('active','started')          then 'in_progress'
    when lower(b.status) in ('approved')                  then 'approved'
    when lower(b.status) in ('on_hold')                   then 'on_hold'
    when lower(b.status) in ('completed')                 then 'completed'
    when lower(b.status) in ('cancelled','canceled')      then 'cancelled'
    else 'draft'
  end::text as normalized_status
from public.bookings b;

create index if not exists idx_bookings_normalized_status
  on public.bookings (
    (case
      when lower(status) in ('pending','provider_review') then 'pending_provider_approval'
      when lower(status) in ('active','started')          then 'in_progress'
      when lower(status) in ('approved')                  then 'approved'
      when lower(status) in ('on_hold')                   then 'on_hold'
      when lower(status) in ('completed')                 then 'completed'
      when lower(status) in ('cancelled','canceled')      then 'cancelled'
      else 'draft'
    end)
  );


