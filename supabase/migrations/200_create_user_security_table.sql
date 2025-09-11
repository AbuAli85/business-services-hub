-- Create user_security table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_security'
  ) THEN
    CREATE TABLE public.user_security (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      two_factor_enabled BOOLEAN DEFAULT false,
      session_timeout INTEGER DEFAULT 30,
      login_notifications BOOLEAN DEFAULT true,
      password_change_required BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      CONSTRAINT user_security_user_unique UNIQUE (user_id)
    );
  END IF;
END $$;

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_user_security_user_id ON public.user_security(user_id);

-- Enable RLS
ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;

-- Policy: a user can read their own security settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_security' AND policyname = 'Allow read own security settings'
  ) THEN
    CREATE POLICY "Allow read own security settings" ON public.user_security
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Policy: a user can upsert their own security settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_security' AND policyname = 'Allow upsert own security settings'
  ) THEN
    CREATE POLICY "Allow upsert own security settings" ON public.user_security
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_security' AND policyname = 'Allow update own security settings'
  ) THEN
    CREATE POLICY "Allow update own security settings" ON public.user_security
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Updated-at trigger (reuses public.update_updated_at_column if present)
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
  EXECUTE 'DROP TRIGGER IF EXISTS update_user_security_updated_at ON public.user_security';
  EXECUTE 'CREATE TRIGGER update_user_security_updated_at BEFORE UPDATE ON public.user_security FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
END $$;


