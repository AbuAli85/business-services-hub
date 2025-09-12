-- Fix message_type and priority constraints
-- This script updates the existing constraints to allow the correct values

-- First, drop the existing constraints
ALTER TABLE public.booking_messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE public.booking_messages DROP CONSTRAINT IF EXISTS messages_priority_check;

-- Add the corrected constraints
ALTER TABLE public.booking_messages 
ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('text', 'file', 'system', 'template'));

ALTER TABLE public.booking_messages 
ADD CONSTRAINT messages_priority_check 
CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Verify the constraints are working
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.booking_messages'::regclass 
AND conname LIKE '%message_type%' OR conname LIKE '%priority%';
