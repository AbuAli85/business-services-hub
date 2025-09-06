-- Fix milestones table permissions
-- This script ensures proper access to milestones table

-- First, let's check if the milestones table exists and has the right structure
-- If not, we'll create it

-- Create milestones table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    order_index INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view milestones for their bookings" ON public.milestones;
DROP POLICY IF EXISTS "Users can create milestones for their bookings" ON public.milestones;
DROP POLICY IF EXISTS "Users can update milestones for their bookings" ON public.milestones;
DROP POLICY IF EXISTS "Users can delete milestones for their bookings" ON public.milestones;

-- Create comprehensive policies for milestones
CREATE POLICY "Users can view milestones for their bookings" ON public.milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = milestones.booking_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can create milestones for their bookings" ON public.milestones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = milestones.booking_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can update milestones for their bookings" ON public.milestones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = milestones.booking_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete milestones for their bookings" ON public.milestones
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = milestones.booking_id 
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- Grant necessary permissions
GRANT ALL ON public.milestones TO authenticated;
GRANT SELECT ON public.milestones TO anon;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_milestones_booking_id ON public.milestones(booking_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON public.milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON public.milestones(due_date);

-- Add some sample milestones for testing if none exist
INSERT INTO public.milestones (booking_id, title, description, status, order_index)
SELECT 
    b.id as booking_id,
    'Initial Consultation' as title,
    'First meeting to understand requirements' as description,
    'completed' as status,
    1 as order_index
FROM public.bookings b
WHERE b.id = '8ccbb969-3639-4ff4-ae4d-722d9580db57'
AND NOT EXISTS (
    SELECT 1 FROM public.milestones m 
    WHERE m.booking_id = b.id
)
LIMIT 1;

INSERT INTO public.milestones (booking_id, title, description, status, order_index)
SELECT 
    b.id as booking_id,
    'Project Planning' as title,
    'Create detailed project plan and timeline' as description,
    'in_progress' as status,
    2 as order_index
FROM public.bookings b
WHERE b.id = '8ccbb969-3639-4ff4-ae4d-722d9580db57'
AND NOT EXISTS (
    SELECT 1 FROM public.milestones m 
    WHERE m.booking_id = b.id AND m.order_index = 2
)
LIMIT 1;

INSERT INTO public.milestones (booking_id, title, description, status, order_index)
SELECT 
    b.id as booking_id,
    'Development Phase' as title,
    'Core development work' as description,
    'pending' as status,
    3 as order_index
FROM public.bookings b
WHERE b.id = '8ccbb969-3639-4ff4-ae4d-722d9580db57'
AND NOT EXISTS (
    SELECT 1 FROM public.milestones m 
    WHERE m.booking_id = b.id AND m.order_index = 3
)
LIMIT 1;

INSERT INTO public.milestones (booking_id, title, description, status, order_index)
SELECT 
    b.id as booking_id,
    'Testing & Review' as title,
    'Quality assurance and client review' as description,
    'pending' as status,
    4 as order_index
FROM public.bookings b
WHERE b.id = '8ccbb969-3639-4ff4-ae4d-722d9580db57'
AND NOT EXISTS (
    SELECT 1 FROM public.milestones m 
    WHERE m.booking_id = b.id AND m.order_index = 4
)
LIMIT 1;
