-- Migration: Create Progress Notifications System
-- This migration creates the notification system for progress tracking

-- 1. Create progress_notifications table
CREATE TABLE IF NOT EXISTS public.progress_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN (
    'milestone_completed',
    'task_completed', 
    'project_completed',
    'overdue_task',
    'time_logged',
    'progress_update'
  )),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraints after table creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'progress_notifications_booking_id_fkey'
    AND table_name = 'progress_notifications'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.progress_notifications
    ADD CONSTRAINT progress_notifications_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'progress_notifications_user_id_fkey'
      AND table_name = 'progress_notifications'
      AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.progress_notifications
      ADD CONSTRAINT progress_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  milestone_completed boolean DEFAULT true,
  task_completed boolean DEFAULT true,
  project_completed boolean DEFAULT true,
  overdue_task boolean DEFAULT true,
  time_logged boolean DEFAULT false,
  progress_update boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Add foreign key constraint after table creation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'notification_preferences_user_id_fkey'
      AND table_name = 'notification_preferences'
      AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.notification_preferences
      ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_progress_notifications_user_id ON public.progress_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_notifications_booking_id ON public.progress_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_progress_notifications_read ON public.progress_notifications(read);
CREATE INDEX IF NOT EXISTS idx_progress_notifications_created_at ON public.progress_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- 4. Enable Row Level Security
ALTER TABLE public.progress_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for progress_notifications
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own notifications" ON public.progress_notifications;
  DROP POLICY IF EXISTS "Users can update their own notifications" ON public.progress_notifications;
  DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.progress_notifications;
  DROP POLICY IF EXISTS "System can insert notifications for users" ON public.progress_notifications;
  
  -- Create new policies
  CREATE POLICY "Users can view their own notifications" ON public.progress_notifications
    FOR SELECT USING (user_id = auth.uid());

  CREATE POLICY "Users can update their own notifications" ON public.progress_notifications
    FOR UPDATE USING (user_id = auth.uid());

  CREATE POLICY "Users can delete their own notifications" ON public.progress_notifications
    FOR DELETE USING (user_id = auth.uid());

  CREATE POLICY "System can insert notifications for users" ON public.progress_notifications
    FOR INSERT WITH CHECK (
      user_id IN (
        SELECT id FROM auth.users WHERE id = user_id
      )
    );
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error, just continue
    NULL;
END $$;

-- 6. Create RLS policies for notification_preferences
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own preferences" ON public.notification_preferences;
  DROP POLICY IF EXISTS "Users can update their own preferences" ON public.notification_preferences;
  DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.notification_preferences;
  
  -- Create new policies
  CREATE POLICY "Users can view their own preferences" ON public.notification_preferences
    FOR SELECT USING (user_id = auth.uid());

  CREATE POLICY "Users can update their own preferences" ON public.notification_preferences
    FOR UPDATE USING (user_id = auth.uid());

  CREATE POLICY "Users can insert their own preferences" ON public.notification_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error, just continue
    NULL;
END $$;

-- 7. Create function to get user notification preferences
CREATE OR REPLACE FUNCTION get_notification_preferences(user_uuid uuid)
RETURNS notification_preferences AS $$
DECLARE
  prefs notification_preferences;
BEGIN
  SELECT * INTO prefs
  FROM public.notification_preferences
  WHERE user_id = user_uuid;
  
  -- If no preferences exist, create default ones
  IF NOT FOUND THEN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (user_uuid)
    RETURNING * INTO prefs;
  END IF;
  
  RETURN prefs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to create notification
CREATE OR REPLACE FUNCTION create_progress_notification(
  booking_uuid uuid,
  user_uuid uuid,
  notification_type text,
  notification_title text,
  notification_message text,
  notification_data jsonb DEFAULT '{}'
) RETURNS uuid AS $$
DECLARE
  notification_id uuid;
  user_prefs notification_preferences;
BEGIN
  -- Get user preferences
  SELECT * INTO user_prefs FROM get_notification_preferences(user_uuid);
  
  -- Check if user wants this type of notification
  CASE notification_type
    WHEN 'milestone_completed' THEN
      IF NOT user_prefs.milestone_completed THEN
        RETURN NULL;
      END IF;
    WHEN 'task_completed' THEN
      IF NOT user_prefs.task_completed THEN
        RETURN NULL;
      END IF;
    WHEN 'project_completed' THEN
      IF NOT user_prefs.project_completed THEN
        RETURN NULL;
      END IF;
    WHEN 'overdue_task' THEN
      IF NOT user_prefs.overdue_task THEN
        RETURN NULL;
      END IF;
    WHEN 'time_logged' THEN
      IF NOT user_prefs.time_logged THEN
        RETURN NULL;
      END IF;
    WHEN 'progress_update' THEN
      IF NOT user_prefs.progress_update THEN
        RETURN NULL;
      END IF;
  END CASE;
  
  -- Create notification
  INSERT INTO public.progress_notifications (
    booking_id,
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    booking_uuid,
    user_uuid,
    notification_type,
    notification_title,
    notification_message,
    notification_data
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid uuid)
RETURNS integer AS $$
DECLARE
  unread_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO unread_count
  FROM public.progress_notifications
  WHERE user_id = user_uuid AND read = false;
  
  RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.progress_notifications
  SET read = true
  WHERE user_id = user_uuid AND read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to get notifications with pagination
CREATE OR REPLACE FUNCTION get_user_notifications(
  user_uuid uuid,
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  booking_id uuid,
  type text,
  title text,
  message text,
  data jsonb,
  read boolean,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.booking_id,
    n.type,
    n.title,
    n.message,
    n.data,
    n.read,
    n.created_at
  FROM public.progress_notifications n
  WHERE n.user_id = user_uuid
  ORDER BY n.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_notification_preferences(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_progress_notification(uuid, uuid, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notifications(uuid, integer, integer) TO authenticated;

-- 13. Create trigger to auto-create notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (only if auth.users table exists and we have permission)
-- This would typically be handled by Supabase Auth, but we can create a fallback
DO $$
BEGIN
  -- Try to create the trigger, but don't fail if we can't
  BEGIN
    -- Drop existing trigger if it exists
    DROP TRIGGER IF EXISTS create_notification_preferences_trigger ON auth.users;
    
    -- Create the trigger
    CREATE TRIGGER create_notification_preferences_trigger
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION create_default_notification_preferences();
  EXCEPTION
    WHEN insufficient_privilege THEN
      -- Ignore if we don't have permission to create triggers on auth.users
      NULL;
  END;
END $$;

-- 14. Create sample notification data for testing (optional)
-- This can be removed in production
INSERT INTO public.notification_preferences (user_id, email_notifications, push_notifications)
SELECT 
  id,
  true,
  true
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.notification_preferences)
ON CONFLICT (user_id) DO NOTHING;
