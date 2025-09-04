-- Add Phase 2 fields to booking_tasks table
ALTER TABLE booking_tasks 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'requested', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS time_logs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC DEFAULT 0 CHECK (actual_hours >= 0);

-- Create time_logs table for detailed time tracking
CREATE TABLE IF NOT EXISTS booking_task_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES booking_tasks(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for time_logs
CREATE INDEX IF NOT EXISTS idx_time_logs_task_id ON booking_task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_start_time ON booking_task_time_logs(start_time);

-- Enable RLS for time_logs
ALTER TABLE booking_task_time_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time_logs
DROP POLICY IF EXISTS "Users can view time logs for their tasks" ON booking_task_time_logs;
CREATE POLICY "Users can view time logs for their tasks" ON booking_task_time_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM booking_tasks bt
      JOIN bookings b ON bt.booking_id = b.id
      WHERE bt.id = booking_task_time_logs.task_id
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Providers can manage time logs" ON booking_task_time_logs;
CREATE POLICY "Providers can manage time logs" ON booking_task_time_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM booking_tasks bt
      JOIN bookings b ON bt.booking_id = b.id
      WHERE bt.id = booking_task_time_logs.task_id
      AND b.provider_id = auth.uid()
    )
  );

-- Create RPC functions for time tracking
CREATE OR REPLACE FUNCTION start_time_tracking(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
  v_current_log jsonb;
BEGIN
  -- Check if there's already an active time log
  SELECT time_logs INTO v_current_log
  FROM booking_tasks 
  WHERE id = p_task_id;
  
  -- Check if there's an active (unfinished) time log
  IF v_current_log IS NOT NULL AND jsonb_array_length(v_current_log) > 0 THEN
    SELECT jsonb_array_elements(v_current_log) INTO v_current_log
    WHERE (jsonb_array_elements(v_current_log)->>'end_time') IS NULL
    LIMIT 1;
    
    IF v_current_log IS NOT NULL THEN
      RETURN jsonb_build_object('error', 'Time tracking already active for this task');
    END IF;
  END IF;
  
  -- Create new time log entry
  v_log_id := gen_random_uuid();
  
  -- Insert into time_logs table
  INSERT INTO booking_task_time_logs (id, task_id, start_time)
  VALUES (v_log_id, p_task_id, NOW());
  
  -- Add to time_logs JSONB array
  UPDATE booking_tasks 
  SET time_logs = COALESCE(time_logs, '[]'::jsonb) || jsonb_build_object(
    'id', v_log_id,
    'start_time', NOW(),
    'end_time', null,
    'duration_minutes', null
  )
  WHERE id = p_task_id;
  
  RETURN jsonb_build_object('success', true, 'log_id', v_log_id);
END;
$$;

CREATE OR REPLACE FUNCTION stop_time_tracking(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
  v_start_time timestamp with time zone;
  v_duration_minutes integer;
  v_updated_logs jsonb;
  v_log_entry jsonb;
BEGIN
  -- Find the active time log
  SELECT jsonb_array_elements(time_logs)->>'id' INTO v_log_id
  FROM booking_tasks 
  WHERE id = p_task_id
  AND jsonb_array_length(time_logs) > 0
  AND (jsonb_array_elements(time_logs)->>'end_time') IS NULL
  LIMIT 1;
  
  IF v_log_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No active time tracking found for this task');
  END IF;
  
  -- Get start time and calculate duration
  SELECT 
    (jsonb_array_elements(time_logs)->>'start_time')::timestamp with time zone,
    EXTRACT(EPOCH FROM (NOW() - (jsonb_array_elements(time_logs)->>'start_time')::timestamp with time zone)) / 60
  INTO v_start_time, v_duration_minutes
  FROM booking_tasks 
  WHERE id = p_task_id
  AND (jsonb_array_elements(time_logs)->>'id') = v_log_id::text;
  
  -- Update time_logs table
  UPDATE booking_task_time_logs 
  SET end_time = NOW(), duration_minutes = v_duration_minutes
  WHERE id = v_log_id;
  
  -- Update the JSONB array
  SELECT jsonb_agg(
    CASE 
      WHEN (elem->>'id') = v_log_id::text THEN
        elem || jsonb_build_object(
          'end_time', NOW(),
          'duration_minutes', v_duration_minutes
        )
      ELSE elem
    END
  ) INTO v_updated_logs
  FROM jsonb_array_elements(
    (SELECT time_logs FROM booking_tasks WHERE id = p_task_id)
  ) AS elem;
  
  -- Update actual_hours
  UPDATE booking_tasks 
  SET 
    time_logs = v_updated_logs,
    actual_hours = COALESCE(actual_hours, 0) + (v_duration_minutes / 60.0)
  WHERE id = p_task_id;
  
  RETURN jsonb_build_object('success', true, 'duration_minutes', v_duration_minutes);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION start_time_tracking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION stop_time_tracking(uuid) TO authenticated;
