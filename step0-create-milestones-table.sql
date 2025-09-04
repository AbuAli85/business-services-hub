-- Step 0: Create milestones table (if it doesn't exist)
-- Run this FIRST in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    weight DECIMAL(5,2) DEFAULT 1.0 CHECK (weight > 0),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    is_overdue BOOLEAN DEFAULT FALSE,
    overdue_since TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_milestones_booking_id ON public.milestones(booking_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON public.milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON public.milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_milestones_overdue ON public.milestones(is_overdue) WHERE is_overdue = TRUE;

-- Enable RLS
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop existing ones first)
DROP POLICY IF EXISTS "Users can view milestones for their bookings" ON public.milestones;
DROP POLICY IF EXISTS "Users can create milestones for their bookings" ON public.milestones;
DROP POLICY IF EXISTS "Users can update milestones for their bookings" ON public.milestones;
DROP POLICY IF EXISTS "Users can delete milestones for their bookings" ON public.milestones;

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

SELECT 'Milestones table created successfully!' as status;
