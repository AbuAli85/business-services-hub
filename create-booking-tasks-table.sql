-- Create booking_tasks table for task-based progress tracking
CREATE TABLE IF NOT EXISTS booking_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES profiles(id),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_booking_tasks_booking_id ON booking_tasks(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_tasks_status ON booking_tasks(status);
CREATE INDEX IF NOT EXISTS idx_booking_tasks_assigned_to ON booking_tasks(assigned_to);

-- Enable RLS
ALTER TABLE booking_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view tasks for their bookings" ON booking_tasks;
DROP POLICY IF EXISTS "Providers can manage tasks for their bookings" ON booking_tasks;
DROP POLICY IF EXISTS "Clients can view tasks for their bookings" ON booking_tasks;

-- Allow users to view tasks for their bookings
CREATE POLICY "Users can view tasks for their bookings" ON booking_tasks
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings 
      WHERE client_id = auth.uid() OR provider_id = auth.uid()
    )
  );

-- Allow providers to manage tasks for their bookings
CREATE POLICY "Providers can manage tasks for their bookings" ON booking_tasks
  FOR ALL USING (
    booking_id IN (
      SELECT id FROM bookings WHERE provider_id = auth.uid()
    )
  );

-- Allow clients to view tasks for their bookings (read-only)
CREATE POLICY "Clients can view tasks for their bookings" ON booking_tasks
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings WHERE client_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_booking_tasks_updated_at ON booking_tasks;
CREATE TRIGGER update_booking_tasks_updated_at 
    BEFORE UPDATE ON booking_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Upgrades: weights, notes, shared comments, action items, and dependencies
ALTER TABLE booking_tasks ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 1 CHECK (weight >= 0);
ALTER TABLE booking_tasks ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE booking_tasks ADD COLUMN IF NOT EXISTS shared_comments JSONB DEFAULT '[]'::jsonb; -- [{id, user_id, text, created_at, is_action, action_due, action_assignee}]
ALTER TABLE booking_tasks ADD COLUMN IF NOT EXISTS action_items JSONB DEFAULT '[]'::jsonb; -- [{id, title, source_comment_id, assignee, due_date, status, created_at}]

-- Dependencies table
CREATE TABLE IF NOT EXISTS booking_task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES booking_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES booking_tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE booking_task_dependencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "participants can read task deps" ON booking_task_dependencies;
CREATE POLICY "participants can read task deps" ON booking_task_dependencies
  FOR SELECT USING (
    booking_id IN (SELECT id FROM bookings WHERE client_id = auth.uid() OR provider_id = auth.uid())
  );
DROP POLICY IF EXISTS "provider can write task deps" ON booking_task_dependencies;
CREATE POLICY "provider can write task deps" ON booking_task_dependencies
  FOR ALL USING (
    booking_id IN (SELECT id FROM bookings WHERE provider_id = auth.uid())
  );

-- RPC Functions for client-safe interactions
CREATE OR REPLACE FUNCTION booking_tasks_append_shared_comment(p_task_id uuid, p_comment jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id uuid;
  v_user_role text;
BEGIN
  -- Get booking_id and verify user has access
  SELECT bt.booking_id INTO v_booking_id
  FROM booking_tasks bt
  JOIN bookings b ON bt.booking_id = b.id
  WHERE bt.id = p_task_id
    AND (b.client_id = auth.uid() OR b.provider_id = auth.uid());
  
  IF v_booking_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: Task not found or insufficient permissions';
  END IF;
  
  -- Append comment to shared_comments array
  UPDATE booking_tasks 
  SET shared_comments = COALESCE(shared_comments, '[]'::jsonb) || jsonb_build_array(p_comment)
  WHERE id = p_task_id;
END;
$$;

CREATE OR REPLACE FUNCTION booking_tasks_append_action_item(p_task_id uuid, p_action jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id uuid;
BEGIN
  -- Get booking_id and verify user has access
  SELECT bt.booking_id INTO v_booking_id
  FROM booking_tasks bt
  JOIN bookings b ON bt.booking_id = b.id
  WHERE bt.id = p_task_id
    AND (b.client_id = auth.uid() OR b.provider_id = auth.uid());
  
  IF v_booking_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: Task not found or insufficient permissions';
  END IF;
  
  -- Append action item to action_items array
  UPDATE booking_tasks 
  SET action_items = COALESCE(action_items, '[]'::jsonb) || jsonb_build_array(p_action)
  WHERE id = p_task_id;
END;
$$;

CREATE OR REPLACE FUNCTION booking_tasks_update_action_item_status(p_task_id uuid, p_action_id text, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id uuid;
  v_updated_items jsonb;
BEGIN
  -- Get booking_id and verify user has access
  SELECT bt.booking_id INTO v_booking_id
  FROM booking_tasks bt
  JOIN bookings b ON bt.booking_id = b.id
  WHERE bt.id = p_task_id
    AND (b.client_id = auth.uid() OR b.provider_id = auth.uid());
  
  IF v_booking_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: Task not found or insufficient permissions';
  END IF;
  
  -- Update the specific action item status
  UPDATE booking_tasks 
  SET action_items = (
    SELECT jsonb_agg(
      CASE 
        WHEN (item->>'id')::text = p_action_id 
        THEN jsonb_set(item, '{status}', to_jsonb(p_status))
        ELSE item
      END
    )
    FROM jsonb_array_elements(COALESCE(action_items, '[]'::jsonb)) AS item
  )
  WHERE id = p_task_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION booking_tasks_append_shared_comment(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION booking_tasks_append_action_item(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION booking_tasks_update_action_item_status(uuid, text, text) TO authenticated;

-- Additional RLS policies for new columns
-- Allow providers to update internal_notes
DROP POLICY IF EXISTS "providers can update internal notes" ON booking_tasks;
CREATE POLICY "providers can update internal notes" ON booking_tasks
  FOR UPDATE USING (
    booking_id IN (SELECT id FROM bookings WHERE provider_id = auth.uid())
  ) WITH CHECK (
    booking_id IN (SELECT id FROM bookings WHERE provider_id = auth.uid())
  );

-- Allow participants to update shared_comments and action_items via RPC functions
-- (These are handled by the RPC functions above, no additional policies needed)

-- Add indexes for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_booking_tasks_weight ON booking_tasks(weight);
CREATE INDEX IF NOT EXISTS idx_booking_tasks_due ON booking_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_booking_tasks_completed_at ON booking_tasks(completed_at);

-- Create booking_milestones table
CREATE TABLE IF NOT EXISTS booking_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add milestone_id to booking_tasks
ALTER TABLE booking_tasks ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES booking_milestones(id) ON DELETE SET NULL;

-- Enable RLS for milestones
ALTER TABLE booking_milestones ENABLE ROW LEVEL SECURITY;

-- RLS policies for milestones
DROP POLICY IF EXISTS "participants can read milestones" ON booking_milestones;
CREATE POLICY "participants can read milestones" ON booking_milestones
  FOR SELECT USING (
    booking_id IN (SELECT id FROM bookings WHERE client_id = auth.uid() OR provider_id = auth.uid())
  );

DROP POLICY IF EXISTS "providers can manage milestones" ON booking_milestones;
CREATE POLICY "providers can manage milestones" ON booking_milestones
  FOR ALL USING (
    booking_id IN (SELECT id FROM bookings WHERE provider_id = auth.uid())
  );

-- Add indexes for milestones
CREATE INDEX IF NOT EXISTS idx_booking_milestones_booking_id ON booking_milestones(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_milestones_status ON booking_milestones(status);
CREATE INDEX IF NOT EXISTS idx_booking_tasks_milestone_id ON booking_tasks(milestone_id);
