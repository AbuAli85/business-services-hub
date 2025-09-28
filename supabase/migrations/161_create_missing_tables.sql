-- Create missing tables for progress tracking
-- This migration ensures all required tables exist before testing functions

-- 1. Create bookings table if it doesn't exist
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  service_id uuid,
  status text DEFAULT 'pending',
  approval_status text DEFAULT 'pending',
  scheduled_date timestamptz,
  amount_cents integer DEFAULT 0,
  currency text DEFAULT 'OMR',
  project_progress integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create milestones table if it doesn't exist
CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  progress_percentage integer DEFAULT 0,
  weight numeric DEFAULT 1.0,
  due_date timestamptz,
  completed_at timestamptz,
  completed_tasks integer DEFAULT 0,
  total_tasks integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create tasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  progress_percentage integer DEFAULT 0,
  due_date timestamptz,
  completed_at timestamptz,
  actual_hours numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Create progress_logs table if it doesn't exist (optional for logging)
CREATE TABLE IF NOT EXISTS progress_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES milestones(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  action text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now()
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_milestones_booking_id ON milestones(booking_id);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_progress_logs_booking_id ON progress_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_progress_logs_milestone_id ON progress_logs(milestone_id);
CREATE INDEX IF NOT EXISTS idx_progress_logs_task_id ON progress_logs(task_id);

-- 6. Add RLS policies if they don't exist
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_logs ENABLE ROW LEVEL SECURITY;

-- 7. Create basic RLS policies
DO $$
BEGIN
  -- Bookings policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'bookings_select_policy') THEN
    CREATE POLICY bookings_select_policy ON bookings
      FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'bookings_insert_policy') THEN
    CREATE POLICY bookings_insert_policy ON bookings
      FOR INSERT WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'bookings_update_policy') THEN
    CREATE POLICY bookings_update_policy ON bookings
      FOR UPDATE USING (true);
  END IF;
  
  -- Milestones policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'milestones' AND policyname = 'milestones_select_policy') THEN
    CREATE POLICY milestones_select_policy ON milestones
      FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'milestones' AND policyname = 'milestones_insert_policy') THEN
    CREATE POLICY milestones_insert_policy ON milestones
      FOR INSERT WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'milestones' AND policyname = 'milestones_update_policy') THEN
    CREATE POLICY milestones_update_policy ON milestones
      FOR UPDATE USING (true);
  END IF;
  
  -- Tasks policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_select_policy') THEN
    CREATE POLICY tasks_select_policy ON tasks
      FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_insert_policy') THEN
    CREATE POLICY tasks_insert_policy ON tasks
      FOR INSERT WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_update_policy') THEN
    CREATE POLICY tasks_update_policy ON tasks
      FOR UPDATE USING (true);
  END IF;
  
  -- Progress logs policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'progress_logs' AND policyname = 'progress_logs_select_policy') THEN
    CREATE POLICY progress_logs_select_policy ON progress_logs
      FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'progress_logs' AND policyname = 'progress_logs_insert_policy') THEN
    CREATE POLICY progress_logs_insert_policy ON progress_logs
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 8. Grant permissions
GRANT ALL ON bookings TO authenticated;
GRANT ALL ON milestones TO authenticated;
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON progress_logs TO authenticated;

-- 9. Verify table creation
DO $$
DECLARE
  table_count INTEGER;
  expected_tables TEXT[] := ARRAY['bookings', 'milestones', 'tasks', 'progress_logs'];
  current_table TEXT;
  table_exists BOOLEAN;
BEGIN
  RAISE NOTICE 'Checking table creation...';
  
  FOREACH current_table IN ARRAY expected_tables
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = current_table
    ) INTO table_exists;
    
    IF table_exists THEN
      RAISE NOTICE '✅ Table % exists', current_table;
    ELSE
      RAISE NOTICE '❌ Table % missing', current_table;
    END IF;
  END LOOP;
  
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = ANY(expected_tables);
  
  RAISE NOTICE 'Created % out of % required tables', table_count, array_length(expected_tables, 1);
END $$;
