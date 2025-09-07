-- Create Project Timeline Table
-- This script creates the project_timeline table for managing project milestones

-- 1. Create the project_timeline table
CREATE TABLE IF NOT EXISTS public.project_timeline (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'on_hold')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  assigned_to text,
  progress_percentage integer NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_timeline_booking_id ON public.project_timeline(booking_id);
CREATE INDEX IF NOT EXISTS idx_project_timeline_order ON public.project_timeline(booking_id, order_index);
CREATE INDEX IF NOT EXISTS idx_project_timeline_status ON public.project_timeline(status);
CREATE INDEX IF NOT EXISTS idx_project_timeline_priority ON public.project_timeline(priority);

-- 3. Enable RLS
ALTER TABLE public.project_timeline ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Users can view timeline for their bookings" ON public.project_timeline
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM public.bookings 
      WHERE client_id = auth.uid() OR provider_id = auth.uid()
    )
  );

CREATE POLICY "Providers can manage timeline for their bookings" ON public.project_timeline
  FOR ALL USING (
    booking_id IN (
      SELECT id FROM public.bookings 
      WHERE provider_id = auth.uid()
    )
  );

-- 5. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_timeline TO authenticated;

-- 6. Grant sequence permissions dynamically
DO $$ 
DECLARE
    seq_name text;
BEGIN
    -- Find the sequence name for project_timeline
    SELECT sequence_name INTO seq_name
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public' 
      AND sequence_name LIKE '%project_timeline%';
    
    IF seq_name IS NOT NULL THEN
        EXECUTE 'GRANT USAGE ON SEQUENCE public.' || seq_name || ' TO authenticated';
        RAISE NOTICE 'Granted usage on sequence: %', seq_name;
    ELSE
        RAISE NOTICE 'No sequence found for project_timeline table';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not grant sequence permissions: %', SQLERRM;
END $$;

-- 7. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_project_timeline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_timeline_updated_at
  BEFORE UPDATE ON public.project_timeline
  FOR EACH ROW
  EXECUTE FUNCTION update_project_timeline_updated_at();

-- 8. Test the table creation
SELECT 
  'Timeline Table Created Successfully:' as info,
  COUNT(*) as table_exists
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'project_timeline';

-- 9. Show table structure
SELECT 
  'Table Structure:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'project_timeline'
ORDER BY ordinal_position;
