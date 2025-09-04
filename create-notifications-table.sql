-- Create booking_notifications table for the notification system
CREATE TABLE IF NOT EXISTS booking_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('overdue', 'deadline', 'completed', 'comment', 'approval', 'milestone', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_booking_notifications_booking_id ON booking_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_type ON booking_notifications(type);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_read ON booking_notifications(read);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_created_at ON booking_notifications(created_at);

-- Enable RLS
ALTER TABLE booking_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view notifications for their bookings
DROP POLICY IF EXISTS "Users can view notifications for their bookings" ON booking_notifications;
CREATE POLICY "Users can view notifications for their bookings" ON booking_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = booking_notifications.booking_id 
      AND (
        bookings.client_id = auth.uid() 
        OR bookings.provider_id = auth.uid()
      )
    )
  );

-- Providers can create notifications for their bookings
DROP POLICY IF EXISTS "Providers can create notifications" ON booking_notifications;
CREATE POLICY "Providers can create notifications" ON booking_notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = booking_notifications.booking_id 
      AND bookings.provider_id = auth.uid()
    )
  );

-- Users can update read status of their notifications
DROP POLICY IF EXISTS "Users can update notification read status" ON booking_notifications;
CREATE POLICY "Users can update notification read status" ON booking_notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = booking_notifications.booking_id 
      AND (
        bookings.client_id = auth.uid() 
        OR bookings.provider_id = auth.uid()
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = booking_notifications.booking_id 
      AND (
        bookings.client_id = auth.uid() 
        OR bookings.provider_id = auth.uid()
      )
    )
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_booking_notifications_updated_at ON booking_notifications;
CREATE TRIGGER update_booking_notifications_updated_at 
    BEFORE UPDATE ON booking_notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON booking_notifications TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
