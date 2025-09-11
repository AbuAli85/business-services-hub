-- Notifications system for document requests/documents

-- 1) Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'document_request_created',
    'document_request_status_changed',
    'document_uploaded'
  )),
  title text not null,
  message text,
  data jsonb default '{}'::jsonb,
  read boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.notifications enable row level security;

-- RLS: users can read and update their own notifications
drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications" on public.notifications
for select using (auth.uid() = user_id);

drop policy if exists "Users can update read status" on public.notifications;
create policy "Users can update read status" on public.notifications
for update using (auth.uid() = user_id);

-- 2) Helper function: create notification (security definer)
create or replace function public.fn_create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_data jsonb)
returns void language plpgsql security definer as $$
begin
  insert into public.notifications (user_id, type, title, message, data)
  values (p_user_id, p_type, p_title, p_message, coalesce(p_data, '{}'::jsonb));
end;$$;

-- 3) Triggers on document_requests
create or replace function public.trg_notify_document_request_insert()
returns trigger language plpgsql security definer as $$
declare
  v_title text;
  v_message text;
begin
  v_title := 'New document request';
  v_message := coalesce(new.title, 'A new document request has been created');
  -- Notify the requested_from user (the client)
  perform public.fn_create_notification(new.requested_from, 'document_request_created', v_title, v_message, jsonb_build_object('request_id', new.id, 'booking_id', new.booking_id));
  return new;
end;$$;

drop trigger if exists trg_document_request_insert on public.document_requests;
create trigger trg_document_request_insert
after insert on public.document_requests
for each row execute function public.trg_notify_document_request_insert();

create or replace function public.trg_notify_document_request_update()
returns trigger language plpgsql security definer as $$
declare
  v_title text;
  v_message text;
begin
  if new.status is distinct from old.status then
    v_title := 'Document request ' || new.status;
    v_message := coalesce(new.title, 'Request status changed');
    -- Notify both parties on status changes
    perform public.fn_create_notification(new.requested_from, 'document_request_status_changed', v_title, v_message, jsonb_build_object('request_id', new.id, 'booking_id', new.booking_id, 'status', new.status));
    perform public.fn_create_notification(new.requested_by, 'document_request_status_changed', v_title, v_message, jsonb_build_object('request_id', new.id, 'booking_id', new.booking_id, 'status', new.status));
  end if;
  return new;
end;$$;

drop trigger if exists trg_document_request_update on public.document_requests;
create trigger trg_document_request_update
after update on public.document_requests
for each row execute function public.trg_notify_document_request_update();

-- 4) Trigger on documents insert to notify provider
create or replace function public.trg_notify_document_uploaded()
returns trigger language plpgsql security definer as $$
declare
  v_booking record;
  v_title text;
  v_message text;
begin
  select client_id, provider_id into v_booking from public.bookings where id = new.booking_id;
  v_title := 'New document uploaded';
  v_message := coalesce(new.original_name, 'A document was uploaded');
  -- Notify provider by default
  if v_booking.provider_id is not null then
    perform public.fn_create_notification(v_booking.provider_id, 'document_uploaded', v_title, v_message, jsonb_build_object('document_id', new.id, 'booking_id', new.booking_id));
  end if;
  return new;
end;$$;

drop trigger if exists trg_document_uploaded on public.documents;
create trigger trg_document_uploaded
after insert on public.documents
for each row execute function public.trg_notify_document_uploaded();

-- Done

