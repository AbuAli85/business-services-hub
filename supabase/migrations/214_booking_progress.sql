-- Ensure v_booking_progress exists (created earlier), recreate safely
drop view if exists public.v_booking_progress cascade;
create view public.v_booking_progress as
select
  b.id as booking_id,
  greatest(0, least(100,
    coalesce(
      (select round(avg(coalesce(m.progress_percentage,0))) from public.milestones m where m.booking_id = b.id),
      0
    )
  ))::int as progress_pct
from public.bookings b;


