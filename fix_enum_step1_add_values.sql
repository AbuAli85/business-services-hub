-- STEP 1: Add missing enum values to user_role
-- Run this first, then run step 2

-- Add 'provider' if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'user_role'::regtype 
        AND enumlabel = 'provider'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'provider';
        RAISE NOTICE '✅ Added "provider" to user_role enum';
    ELSE
        RAISE NOTICE '✓ "provider" already exists';
    END IF;
END $$;

-- Add 'client' if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'user_role'::regtype 
        AND enumlabel = 'client'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'client';
        RAISE NOTICE '✅ Added "client" to user_role enum';
    ELSE
        RAISE NOTICE '✓ "client" already exists';
    END IF;
END $$;

-- Add 'staff' if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'user_role'::regtype 
        AND enumlabel = 'staff'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'staff';
        RAISE NOTICE '✅ Added "staff" to user_role enum';
    ELSE
        RAISE NOTICE '✓ "staff" already exists';
    END IF;
END $$;

-- Show all enum values
SELECT 'All enum values after additions:' as info;
SELECT enumlabel as role_value
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- IMPORTANT: After running this, wait a moment, then run step 2!
SELECT '✅ Enum values added successfully!' as status;
SELECT '⚠️ Now run: fix_enum_step2_sync_users.sql' as next_step;

