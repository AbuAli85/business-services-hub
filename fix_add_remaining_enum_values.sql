-- Add remaining enum values to match frontend types
-- Frontend expects: admin, manager, provider, client, staff, moderator, support

-- Add 'moderator' if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'user_role'::regtype 
        AND enumlabel = 'moderator'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'moderator';
        RAISE NOTICE '✅ Added "moderator" to user_role enum';
    ELSE
        RAISE NOTICE '✓ "moderator" already exists';
    END IF;
END $$;

-- Add 'support' if it doesn't exist  
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'user_role'::regtype 
        AND enumlabel = 'support'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'support';
        RAISE NOTICE '✅ Added "support" to user_role enum';
    ELSE
        RAISE NOTICE '✓ "support" already exists';
    END IF;
END $$;

-- Show all enum values
SELECT 'Current user_role enum values:' as info;
SELECT enumlabel as role_value
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- Verify frontend compatibility
DO $$
DECLARE
    expected_values TEXT[] := ARRAY['admin', 'manager', 'provider', 'client', 'staff', 'moderator', 'support'];
    existing_values TEXT[];
    missing_values TEXT[];
    val TEXT;
BEGIN
    -- Get existing enum values
    SELECT ARRAY_AGG(enumlabel ORDER BY enumsortorder)
    INTO existing_values
    FROM pg_enum
    WHERE enumtypid = 'user_role'::regtype;
    
    -- Check for missing values
    FOREACH val IN ARRAY expected_values LOOP
        IF NOT (val = ANY(existing_values)) THEN
            missing_values := array_append(missing_values, val);
        END IF;
    END LOOP;
    
    IF missing_values IS NULL THEN
        RAISE NOTICE '✅ All frontend-expected enum values exist!';
    ELSE
        RAISE NOTICE '⚠️ Missing enum values: %', array_to_string(missing_values, ', ');
    END IF;
    
    -- Show summary
    RAISE NOTICE '';
    RAISE NOTICE 'Frontend expects: %', array_to_string(expected_values, ', ');
    RAISE NOTICE 'Database has: %', array_to_string(existing_values, ', ');
END $$;

SELECT '✅ Enum values updated to match frontend!' as status;

