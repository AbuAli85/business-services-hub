create or replace view public.v_activity_feed as
select
  b.id::text as item_id,
  'booking'::text as item_type,
  b.created_at as occurred_at,
  concat('New booking for ', coalesce(s.title, 'service')) as title,
  b.status::text as meta
from public.bookings b
left join public.services s on s.id = b.service_id
union all
select
  i.id::text,
  'payment',
  i.paid_at,
  concat('Invoice paid: #', i.invoice_number),
  (i.amount::text)
from public.invoices i
where i.paid_at is not null
union all
select
  m.id::text,
  'milestone',
  m.updated_at,
  concat('Milestone updated: ', m.title),
  m.status::text
from public.milestones m
order by occurred_at desc;


