-- Enable real-time for booking_messages table
-- This script should be run in the Supabase SQL Editor

-- 1. Enable real-time for the booking_messages table
alter publication supabase_realtime add table booking_messages;

-- 2. Enable real-time for message_reactions table (if it exists)
alter publication supabase_realtime add table message_reactions;

-- 3. Verify real-time is enabled
select 
  schemaname,
  tablename,
  rowsecurity
from pg_tables 
where tablename in ('booking_messages', 'message_reactions');

-- 4. Check current real-time publications
select * from pg_publication_tables where pubname = 'supabase_realtime';

-- 5. Test real-time permissions by checking if RLS is properly configured
select 
  t.table_name,
  p.policyname,
  p.permissive,
  p.roles,
  p.cmd,
  p.qual
from information_schema.tables t
left join pg_policies p on p.tablename = t.table_name
where t.table_name in ('booking_messages', 'message_reactions')
and t.table_schema = 'public';
