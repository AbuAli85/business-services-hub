-- Ensure milestones has a service_id column and a safe FK to services

-- 1) Add column if missing and make it nullable (required for SET NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'milestones' AND column_name = 'service_id'
  ) THEN
    ALTER TABLE public.milestones ADD COLUMN service_id uuid;
    RAISE NOTICE 'Added service_id column to milestones';
  END IF;

  -- Ensure nullable
  ALTER TABLE public.milestones ALTER COLUMN service_id DROP NOT NULL;
END $$;

-- 2) Index for performance (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_milestones_service_id ON public.milestones(service_id);

-- 3) Recreate FK with ON DELETE SET NULL (drop old if exists)
ALTER TABLE public.milestones DROP CONSTRAINT IF EXISTS milestones_service_milestone_id_fkey;
ALTER TABLE public.milestones
  ADD CONSTRAINT milestones_service_milestone_id_fkey
  FOREIGN KEY (service_id)
  REFERENCES public.services(id)
  ON DELETE SET NULL;

-- Done

