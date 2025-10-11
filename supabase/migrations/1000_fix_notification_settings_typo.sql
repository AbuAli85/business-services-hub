-- Fix typo in notification_settings table
-- Rename 'syste_notifications' to 'system_notifications'

-- Check if the typo column exists and rename it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notification_settings' 
    AND column_name = 'syste_notifications'
  ) THEN
    -- Rename the typo column to the correct name
    ALTER TABLE notification_settings 
    RENAME COLUMN syste_notifications TO system_notifications;
    
    RAISE NOTICE 'Renamed syste_notifications to system_notifications';
  ELSE
    RAISE NOTICE 'Column syste_notifications does not exist (already fixed or never existed)';
  END IF;
END $$;

