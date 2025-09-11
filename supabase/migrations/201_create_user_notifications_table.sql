-- Create user_notifications table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_notifications'
  ) THEN
    CREATE TABLE public.user_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      email_notifications BOOLEAN DEFAULT true,
      push_notifications BOOLEAN DEFAULT true,
      sms_notifications BOOLEAN DEFAULT false,
      booking_updates BOOLEAN DEFAULT true,
      payment_notifications BOOLEAN DEFAULT true,
      marketing_emails BOOLEAN DEFAULT false,
      weekly_reports BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      CONSTRAINT user_notifications_user_unique UNIQUE (user_id)
    );
  END IF;
END $$;

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: a user can read their own notification settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_notifications' AND policyname = 'Allow read own notification settings'
  ) THEN
    CREATE POLICY "Allow read own notification settings" ON public.user_notifications
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Policy: a user can upsert their own notification settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_notifications' AND policyname = 'Allow upsert own notification settings'
  ) THEN
    CREATE POLICY "Allow upsert own notification settings" ON public.user_notifications
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_notifications' AND policyname = 'Allow update own notification settings'
  ) THEN
    CREATE POLICY "Allow update own notification settings" ON public.user_notifications
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Updated-at trigger
DO $$
BEGIN
  -- Ensure helper function exists
  BEGIN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Drop and recreate trigger idempotently
  EXECUTE 'DROP TRIGGER IF EXISTS update_user_notifications_updated_at ON public.user_notifications';
  EXECUTE 'CREATE TRIGGER update_user_notifications_updated_at BEFORE UPDATE ON public.user_notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
END $$;
