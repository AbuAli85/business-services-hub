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

CREATE TRIGGER update_booking_tasks_updated_at 
    BEFORE UPDATE ON booking_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
