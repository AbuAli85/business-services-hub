-- Convert integer/bigint epoch columns to timestamptz and ensure updated_at trigger

-- Idempotent guard: adjust names if columns differ
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name='bookings' AND column_name='approved_at' AND data_type IN ('integer','bigint')
  ) THEN
    ALTER TABLE bookings
      ALTER COLUMN approved_at TYPE timestamptz
      USING to_timestamp(
        CASE
          WHEN approved_at > 2147483647 THEN approved_at / 1000.0
          ELSE approved_at::double precision
        END
      );
  END IF;

  -- Optional: similarly fix created_at/updated_at if they are ints
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='bookings' AND column_name='updated_at' AND data_type IN ('integer','bigint')
  ) THEN
    ALTER TABLE bookings
      ALTER COLUMN updated_at TYPE timestamptz
      USING to_timestamp(
        CASE
          WHEN updated_at > 2147483647 THEN updated_at / 1000.0
          ELSE updated_at::double precision
        END
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='bookings' AND column_name='created_at' AND data_type IN ('integer','bigint')
  ) THEN
    ALTER TABLE bookings
      ALTER COLUMN created_at TYPE timestamptz
      USING to_timestamp(
        CASE
          WHEN created_at > 2147483647 THEN created_at / 1000.0
          ELSE created_at::double precision
        END
      );
  END IF;
END $$;

-- Ensure updated_at auto-updates (if not already managed in app code)
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_bookings'
  ) THEN
    CREATE TRIGGER set_updated_at_bookings
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;


